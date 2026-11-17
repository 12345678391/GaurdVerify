const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const axios = require('axios');
const connectDB = require('../config/db');
const Shift = require('../models/Shift');
const Guard = require('../models/Guard');
const Company = require('../models/Company');
const Admin = require('../models/Admin');
const AuditLog = require('../models/AuditLog');

const BASE_URL = 'http://127.0.0.1:5000/api';

async function runShiftTest() {
  console.log('--- STARTING SHIFT MANAGEMENT VERIFICATION ---');
  await connectDB();
  console.log('MongoDB connected.');

  // Find active company owners that have completed initial password setup
  let owners = await Admin.find({
    role: 'company_owner',
    isActive: true,
    mustChangePassword: false,
  }).populate('companyId');

  if (owners.length < 2) {
    const allOwners = await Admin.find({ role: 'company_owner', isActive: true }).populate('companyId');
    for (const o of allOwners) {
      if (o.mustChangePassword) {
        o.mustChangePassword = false;
        await o.save();
      }
    }
    owners = await Admin.find({ role: 'company_owner', isActive: true }).populate('companyId');
  }

  const ownerA = owners[0];
  const ownerB = owners[1];
  const compA = ownerA.companyId;
  const compB = ownerB.companyId;
  console.log(`Company A: ${compA.name} (${compA._id}) - Owner: ${ownerA.email}`);
  console.log(`Company B: ${compB.name} (${compB._id}) - Owner: ${ownerB.email}`);

  const jwt = require('jsonwebtoken');
  const tokenA = jwt.sign(
    {
      id: ownerA._id,
      email: ownerA.email,
      role: ownerA.role,
      companyId: compA._id,
      companyStatus: 'Active',
      accountStatus: 'Active',
    },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '1h' }
  );

  const tokenB = jwt.sign(
    {
      id: ownerB._id,
      email: ownerB.email,
      role: ownerB.role,
      companyId: compB._id,
      companyStatus: 'Active',
      accountStatus: 'Active',
    },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '1h' }
  );

  const headersA = { Authorization: `Bearer ${tokenA}` };
  const headersB = { Authorization: `Bearer ${tokenB}` };

  // 1. GET /api/shifts for Company A
  console.log('\n[TEST 1] List Company A Shifts...');
  const resA = await axios.get(`${BASE_URL}/shifts`, { headers: headersA });
  console.log(`Company A shifts found: ${resA.data.data.length}`);
  resA.data.data.forEach((s) => {
    if (s.companyId.toString() !== compA._id.toString()) {
      throw new Error(`Data leakage! Found shift ${s.shiftName} belonging to company ${s.companyId}`);
    }
  });
  console.log('PASS: Company A only received its own shifts.');

  // 2. CREATE Shift for Company A
  console.log('\n[TEST 2] Create Shift for Company A...');
  const createPayload = {
    shiftName: 'Night Patrol Delta ' + Date.now().toString().slice(-4),
    startTime: '22:00',
    endTime: '06:00', // Overnight
    verificationIntervalMinutes: 45,
    description: 'High-security perimeter monitoring with hourly gate checks.',
  };

  const createRes = await axios.post(`${BASE_URL}/shifts`, createPayload, { headers: headersA });
  if (!createRes.data.success || !createRes.data.data.shiftId) {
    throw new Error('Shift creation failed or shiftId missing');
  }
  const createdShift = createRes.data.data;
  console.log(`Created shift: ${createdShift.shiftName} (ID: ${createdShift.shiftId}, _id: ${createdShift._id})`);
  console.log(`Overnight auto-detected: ${createdShift.isOvernight}`);
  if (!createdShift.isOvernight) {
    throw new Error('Overnight shift was not auto-detected for 22:00 -> 06:00');
  }
  console.log('PASS: Shift created with auto-generated shiftId and overnight detection.');

  // Verify in MongoDB
  const dbShift = await Shift.findById(createdShift._id);
  if (!dbShift || dbShift.companyId.toString() !== compA._id.toString()) {
    throw new Error('Shift was not correctly persisted in MongoDB with companyId.');
  }
  console.log('PASS: Verified persistence in MongoDB with correct companyId.');

  // Assign a test guard to this shift to test safe deactivation later
  const testGuard = await Guard.create({
    companyId: compA._id,
    guardId: `GC-GRD-TEST-${Date.now().toString().slice(-4)}`,
    fullName: 'Test Guard Shift Assignment',
    mobileNumber: '+91 99000 11223',
    employmentStatus: 'Active',
    assignedShift: createdShift._id,
  });
  console.log(`Assigned guard ${testGuard.fullName} to shift ${createdShift.shiftName}`);

  // 3. UPDATE Shift for Company A
  console.log('\n[TEST 3] Update Shift for Company A...');
  const updatePayload = {
    name: createdShift.shiftName + ' (Updated)',
    startTime: '21:30',
    endTime: '05:30',
    verificationIntervalMinutes: 30,
    description: 'Updated instructions: Report all deliveries to dispatch.',
  };
  const updateRes = await axios.put(`${BASE_URL}/shifts/${createdShift._id}`, updatePayload, { headers: headersA });
  if (
    !updateRes.data.success ||
    updateRes.data.data.shiftName !== updatePayload.name ||
    updateRes.data.data.startTime !== '21:30' ||
    updateRes.data.data.verificationIntervalMinutes !== 30
  ) {
    throw new Error('Shift update failed to reflect changes');
  }
  console.log(`Updated shift name: ${updateRes.data.data.shiftName}, timing: ${updateRes.data.data.startTime} - ${updateRes.data.data.endTime}`);

  // Test updating by shiftId string as well
  const updateByCodeRes = await axios.put(
    `${BASE_URL}/shifts/${createdShift.shiftId}`,
    { description: 'Secondary update via shiftId code.' },
    { headers: headersA }
  );
  if (!updateByCodeRes.data.success || updateByCodeRes.data.data.description !== 'Secondary update via shiftId code.') {
    throw new Error('Update by shiftId string failed.');
  }
  console.log('PASS: Shift updated successfully via both _id and shiftId string.');

  // 4. CROSS-TENANT ISOLATION: Company B attempts
  console.log('\n[TEST 4] Company B Tenant Isolation Checks...');
  const resB = await axios.get(`${BASE_URL}/shifts`, { headers: headersB });
  const leakedShift = resB.data.data.find((s) => s._id.toString() === createdShift._id.toString());
  if (leakedShift) {
    throw new Error('FAIL: Company B was able to see Company A shift in GET /api/shifts!');
  }
  console.log('PASS: Company B shift list does NOT contain Company A shift.');

  // Company B tries to update Company A shift
  try {
    await axios.put(`${BASE_URL}/shifts/${createdShift._id}`, { shiftName: 'Hacked Shift' }, { headers: headersB });
    throw new Error('FAIL: Company B was able to update Company A shift!');
  } catch (err) {
    if (err.response && (err.response.status === 404 || err.response.status === 403)) {
      console.log(`PASS: Company B cross-tenant update rejected with HTTP ${err.response.status}.`);
    } else {
      throw err;
    }
  }

  // Company B tries to delete Company A shift
  try {
    await axios.delete(`${BASE_URL}/shifts/${createdShift._id}`, { headers: headersB });
    throw new Error('FAIL: Company B was able to delete Company A shift!');
  } catch (err) {
    if (err.response && (err.response.status === 404 || err.response.status === 403)) {
      console.log(`PASS: Company B cross-tenant delete rejected with HTTP ${err.response.status}.`);
    } else {
      throw err;
    }
  }

  // 5. DEACTIVATE (Soft Delete) Shift for Company A
  console.log('\n[TEST 5] Deactivate Shift for Company A...');
  const deleteRes = await axios.delete(`${BASE_URL}/shifts/${createdShift.shiftId}`, { headers: headersA });
  if (!deleteRes.data.success) {
    throw new Error('Deactivation failed');
  }
  console.log('Delete response:', deleteRes.data.message);
  console.log(`Affected guards safely unassigned: ${deleteRes.data.affectedGuards}`);

  // Check MongoDB: isDeleted should be true and isActive false
  const softDeletedShift = await Shift.findById(createdShift._id);
  if (!softDeletedShift || !softDeletedShift.isDeleted || softDeletedShift.isActive !== false) {
    throw new Error('FAIL: Shift isDeleted is not true or isActive is not false.');
  }
  console.log('PASS: Verified in MongoDB isDeleted=true, isActive=false.');

  // Check that assigned guard was safely unassigned
  const checkGuard = await Guard.findById(testGuard._id);
  if (checkGuard.assignedShift) {
    throw new Error('FAIL: Guard assignedShift was not cleared upon shift deactivation.');
  }
  console.log('PASS: Assigned guard was safely unassigned from deactivated shift without losing record.');

  // Verify it no longer appears in GET /api/shifts
  const resAAfter = await axios.get(`${BASE_URL}/shifts`, { headers: headersA });
  const stillPresent = resAAfter.data.data.find((s) => s._id.toString() === createdShift._id.toString());
  if (stillPresent) {
    throw new Error('FAIL: Soft-deleted shift still returned in active shift list.');
  }
  console.log('PASS: Deactivated shift correctly omitted from GET /api/shifts.');

  // Clean up test guard
  await Guard.findByIdAndDelete(testGuard._id);

  // 6. Check Audit Logs
  console.log('\n[TEST 6] Audit Logs Verification...');
  const auditEntries = await AuditLog.find({
    entityId: createdShift._id,
  });
  console.log(`Found ${auditEntries.length} audit entries for this shift:`);
  auditEntries.forEach((a) => console.log(`  - [${a.action}] ${a.details}`));
  if (auditEntries.length < 3) {
    throw new Error('Expected at least 3 audit logs (CREATE, UPDATE, DEACTIVATE).');
  }
  console.log('PASS: Full shift audit trail recorded.');

  console.log('\n--- ALL SHIFT MANAGEMENT TESTS PASSED SUCCESSFULLY! ---');
  await mongoose.disconnect();
}

runShiftTest().catch((err) => {
  console.error('\nTEST FAILED:', err.response?.data || err.message);
  process.exit(1);
});
