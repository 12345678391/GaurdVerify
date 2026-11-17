const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const axios = require('axios');
const connectDB = require('../config/db');
const Supervisor = require('../models/Supervisor');
const Site = require('../models/Site');
const Company = require('../models/Company');
const Admin = require('../models/Admin');
const AuditLog = require('../models/AuditLog');

const BASE_URL = 'http://127.0.0.1:5000/api';

async function runSupervisorTest() {
  console.log('--- STARTING SUPERVISOR MANAGEMENT VERIFICATION ---');
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

  // 1. GET /api/supervisors for Company A
  console.log('\n[TEST 1] List Company A Supervisors...');
  const resA = await axios.get(`${BASE_URL}/supervisors`, { headers: headersA });
  console.log(`Company A supervisors found: ${resA.data.data.length}`);
  resA.data.data.forEach((s) => {
    if (s.companyId.toString() !== compA._id.toString()) {
      throw new Error(`Data leakage! Found supervisor ${s.fullName} belonging to company ${s.companyId}`);
    }
  });
  console.log('PASS: Company A only received its own supervisors.');

  // Find or create an operational site for Company A to test site assignment
  let siteA = await Site.findOne({ companyId: compA._id, isDeleted: false });
  if (!siteA) {
    siteA = await Site.create({
      companyId: compA._id,
      siteId: 'GC-SIT-T99',
      siteName: 'Test Facility Alpha',
      address: 'Sector 44',
      city: 'Gurugram',
      state: 'Haryana',
    });
  }

  // 2. CREATE Supervisor for Company A
  console.log('\n[TEST 2] Create Supervisor for Company A...');
  const createPayload = {
    fullName: 'Rajendra Pratap Singh ' + Date.now().toString().slice(-4),
    mobileNumber: '+91 98111 22334',
    email: `supervisor_${Date.now().toString().slice(-4)}@agency.test`,
    assignedSites: [siteA._id],
    alertPreferences: { sms: true, call: true, email: true },
  };

  const createRes = await axios.post(`${BASE_URL}/supervisors`, createPayload, { headers: headersA });
  if (!createRes.data.success || !createRes.data.data.supervisorId) {
    throw new Error('Supervisor creation failed or supervisorId missing');
  }
  const createdSup = createRes.data.data;
  console.log(`Created supervisor: ${createdSup.fullName} (ID: ${createdSup.supervisorId}, _id: ${createdSup._id})`);
  console.log('PASS: Supervisor created with auto-generated supervisorId.');

  // Verify in MongoDB
  const dbSup = await Supervisor.findById(createdSup._id);
  if (!dbSup || dbSup.companyId.toString() !== compA._id.toString()) {
    throw new Error('Supervisor was not correctly persisted in MongoDB with companyId.');
  }
  console.log('PASS: Verified persistence in MongoDB with correct companyId.');

  // 3. UPDATE Supervisor for Company A
  console.log('\n[TEST 3] Update Supervisor for Company A...');
  const updatePayload = {
    name: createdSup.fullName + ' (Updated)',
    phone: '+91 98111 99999',
    alertPreferences: { sms: true, call: false, email: true },
  };
  const updateRes = await axios.put(`${BASE_URL}/supervisors/${createdSup._id}`, updatePayload, { headers: headersA });
  if (!updateRes.data.success || updateRes.data.data.fullName !== updatePayload.name || updateRes.data.data.mobileNumber !== updatePayload.phone) {
    throw new Error('Supervisor update failed to reflect changes');
  }
  console.log(`Updated supervisor name: ${updateRes.data.data.fullName}, phone: ${updateRes.data.data.mobileNumber}`);

  // Test updating by supervisorId string as well
  const updateByCodeRes = await axios.put(`${BASE_URL}/supervisors/${createdSup.supervisorId}`, { email: 'updated.code@agency.test' }, { headers: headersA });
  if (!updateByCodeRes.data.success || updateByCodeRes.data.data.email !== 'updated.code@agency.test') {
    throw new Error('Update by supervisorId string failed.');
  }
  console.log('PASS: Supervisor updated successfully via _id and supervisorId string.');

  // 4. CROSS-TENANT ISOLATION: Company B attempts
  console.log('\n[TEST 4] Company B Tenant Isolation Checks...');
  const resB = await axios.get(`${BASE_URL}/supervisors`, { headers: headersB });
  const leakedSup = resB.data.data.find((s) => s._id.toString() === createdSup._id.toString());
  if (leakedSup) {
    throw new Error('FAIL: Company B was able to see Company A supervisor in GET /api/supervisors!');
  }
  console.log('PASS: Company B supervisor list does NOT contain Company A supervisor.');

  // Company B tries to update Company A supervisor
  try {
    await axios.put(`${BASE_URL}/supervisors/${createdSup._id}`, { fullName: 'Hacked Supervisor' }, { headers: headersB });
    throw new Error('FAIL: Company B was able to update Company A supervisor!');
  } catch (err) {
    if (err.response && (err.response.status === 404 || err.response.status === 403)) {
      console.log(`PASS: Company B cross-tenant update rejected with HTTP ${err.response.status}.`);
    } else {
      throw err;
    }
  }

  // Company B tries to assign Company A's site to its own supervisor
  try {
    await axios.post(
      `${BASE_URL}/supervisors`,
      {
        fullName: 'Company B Rogue Supervisor',
        mobileNumber: '+91 99999 88888',
        assignedSites: [siteA._id], // Company A site!
      },
      { headers: headersB }
    );
    throw new Error('FAIL: Company B was able to assign Company A site to its supervisor!');
  } catch (err) {
    if (err.response && (err.response.status === 400 || err.response.status === 403)) {
      console.log(`PASS: Cross-company site assignment rejected with HTTP ${err.response.status}: ${err.response.data.message}`);
    } else {
      throw err;
    }
  }

  // Company B tries to delete Company A supervisor
  try {
    await axios.delete(`${BASE_URL}/supervisors/${createdSup._id}`, { headers: headersB });
    throw new Error('FAIL: Company B was able to delete Company A supervisor!');
  } catch (err) {
    if (err.response && (err.response.status === 404 || err.response.status === 403)) {
      console.log(`PASS: Company B cross-tenant delete rejected with HTTP ${err.response.status}.`);
    } else {
      throw err;
    }
  }

  // 5. DEACTIVATE (Soft Delete) Supervisor for Company A
  console.log('\n[TEST 5] Deactivate Supervisor for Company A...');
  const deleteRes = await axios.delete(`${BASE_URL}/supervisors/${createdSup.supervisorId}`, { headers: headersA });
  if (!deleteRes.data.success) {
    throw new Error('Deactivation failed');
  }
  console.log('Delete response:', deleteRes.data.message);

  // Check MongoDB: isDeleted should be true
  const softDeletedSup = await Supervisor.findById(createdSup._id);
  if (!softDeletedSup || !softDeletedSup.isDeleted || softDeletedSup.employmentStatus !== 'Inactive') {
    throw new Error('FAIL: Supervisor isDeleted is not true or employmentStatus is not Inactive.');
  }
  console.log('PASS: Verified in MongoDB isDeleted=true, employmentStatus="Inactive".');

  // Verify it no longer appears in GET /api/supervisors
  const resAAfter = await axios.get(`${BASE_URL}/supervisors`, { headers: headersA });
  const stillPresent = resAAfter.data.data.find((s) => s._id.toString() === createdSup._id.toString());
  if (stillPresent) {
    throw new Error('FAIL: Soft-deleted supervisor still returned in active supervisor list.');
  }
  console.log('PASS: Deactivated supervisor correctly omitted from GET /api/supervisors.');

  // 6. Check Audit Logs
  console.log('\n[TEST 6] Audit Logs Verification...');
  const auditEntries = await AuditLog.find({
    entityId: createdSup._id,
  });
  console.log(`Found ${auditEntries.length} audit entries for this supervisor:`);
  auditEntries.forEach((a) => console.log(`  - [${a.action}] ${a.details}`));
  if (auditEntries.length < 3) {
    throw new Error('Expected at least 3 audit logs (CREATE, UPDATE, DEACTIVATE).');
  }
  console.log('PASS: Full supervisor audit trail recorded.');

  console.log('\n--- ALL SUPERVISOR MANAGEMENT TESTS PASSED SUCCESSFULLY! ---');
  await mongoose.disconnect();
}

runSupervisorTest().catch((err) => {
  console.error('\nTEST FAILED:', err.response?.data || err.message);
  process.exit(1);
});
