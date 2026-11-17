/**
 * AutoGuard Enterprise — Guard Management Fixes Verification Suite
 * Verifies:
 * 1. Guard creation & MongoDB persistence
 * 2. Guard editing (PUT /api/guards/:id) with MongoDB persistence
 * 3. Soft deactivation (archiveGuard -> DELETE /api/guards/:id) with historical record preservation
 * 4. Company data isolation (cross-tenant update/deactivation rejection)
 * 5. Multi-tenant query isolation (GET /api/guards?includeArchived=true)
 */

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const Company = require('../models/Company');
const Admin = require('../models/Admin');
const Guard = require('../models/Guard');
const Site = require('../models/Site');
const Shift = require('../models/Shift');
const AttendanceRecord = require('../models/AttendanceRecord');
const CallLog = require('../models/CallLog');

const authRoutes = require('../routes/authRoutes');
const guardRoutes = require('../routes/guardRoutes');
const siteRoutes = require('../routes/siteRoutes');
const shiftRoutes = require('../routes/shiftRoutes');
const supervisorRoutes = require('../routes/supervisorRoutes');
const callRoutes = require('../routes/callRoutes');
const attendanceRoutes = require('../routes/attendanceRoutes');
const dashboardRoutes = require('../routes/dashboardRoutes');
const notificationRoutes = require('../routes/notificationRoutes');
const settingsRoutes = require('../routes/settingsRoutes');
const companyRoutes = require('../routes/companyRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/guards', guardRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/supervisors', supervisorRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/company', companyRoutes);

const PORT = 5057;
let server;
let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: '127.0.0.1',
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {
          json = data;
        }
        resolve({ status: res.statusCode, body: json });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('\n===============================================================');
  console.log('🛡️  AUTOGUARD GUARD MANAGEMENT FIXES & PERSISTENCE TEST SUITE');
  console.log('===============================================================\n');

  try {
    // 1. Connect MongoDB
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/guardconnect');
    }
    console.log('1. Connected to MongoDB successfully.');

    // 2. Start server
    server = app.listen(PORT);
    await new Promise((r) => setTimeout(r, 800));
    console.log(`2. Test server listening on http://127.0.0.1:${PORT}`);

    // Setup Test Companies and Owners
    const compA = await Company.create({
      name: `Test Guard Agency A ${Date.now()}`,
      code: `GA-${Math.floor(1000 + Math.random() * 9000)}`,
      email: `ownerA_${Date.now()}@agencya.com`,
      phone: '+91 98111 00001',
      status: 'active',
      isActive: true,
    });

    const adminA = await Admin.create({
      companyId: compA._id,
      fullName: 'Owner Agency A',
      email: compA.email,
      password: 'HashedPassword@2026',
      role: 'company_owner',
      isActive: true,
      mustChangePassword: false,
    });

    const tokenA = jwt.sign({ id: adminA._id }, process.env.JWT_SECRET || 'guardconnect_super_secret_jwt_key_2026', { expiresIn: '1h' });

    const compB = await Company.create({
      name: `Test Guard Agency B ${Date.now()}`,
      code: `GB-${Math.floor(1000 + Math.random() * 9000)}`,
      email: `ownerB_${Date.now()}@agencyb.com`,
      phone: '+91 98111 00002',
      status: 'active',
      isActive: true,
    });

    const adminB = await Admin.create({
      companyId: compB._id,
      fullName: 'Owner Agency B',
      email: compB.email,
      password: 'HashedPassword@2026',
      role: 'company_owner',
      isActive: true,
      mustChangePassword: false,
    });

    const tokenB = jwt.sign({ id: adminB._id }, process.env.JWT_SECRET || 'guardconnect_super_secret_jwt_key_2026', { expiresIn: '1h' });

    console.log('\n--- Test 1: Guard Registration & MongoDB Persistence ---');
    const createRes = await request('POST', '/api/guards', {
      fullName: 'Vikramaditya Chauhan',
      mobileNumber: '+91 98765 43210',
      email: 'vikram.guard@agencya.com',
      residentialAddress: 'Tower 4, Staff Quarters',
      emergencyContactNumber: '+91 98765 00000',
      designation: 'Senior Security Officer',
      employmentStatus: 'Active',
    }, tokenA);

    if (createRes.status !== 201) {
      console.log('Create failed response:', createRes.status, createRes.body);
    }

    assert(createRes.status === 201, 'Guard registered with 201 Created');
    const createdGuard = createRes.body.data;
    assert(createdGuard && createdGuard._id, 'Guard returned with MongoDB _id');
    assert(createdGuard.fullName === 'Vikramaditya Chauhan', 'Full name matches creation input');
    assert(createdGuard.companyId.toString() === compA._id.toString(), 'Guard companyId matches Agency A');

    // Verify in MongoDB
    const dbGuard1 = await Guard.findById(createdGuard._id);
    assert(dbGuard1 !== null, 'Guard record verified in MongoDB database');
    assert(dbGuard1.email === 'vikram.guard@agencya.com', 'Guard email saved in MongoDB');

    console.log('\n--- Test 2: Edit Guard (PUT /api/guards/:id) MongoDB Persistence ---');
    // Test update using guard._id
    const updateRes = await request('PUT', `/api/guards/${createdGuard._id}`, {
      name: 'Vikramaditya Chauhan (Promoted)',
      phone: '+91 98765 99999',
      email: 'vikram.promoted@agencya.com',
      address: 'Penthouse Duty Quarters',
      designation: 'Head Guard / Supervisor',
    }, tokenA);

    assert(updateRes.status === 200, 'Guard updated with 200 OK');
    assert(updateRes.body.data.fullName === 'Vikramaditya Chauhan (Promoted)', 'Updated full name reflected in API response');
    assert(updateRes.body.data.mobileNumber === '+91 98765 99999', 'Updated mobile number reflected in API response');

    // Verify in MongoDB directly
    const dbGuardUpdated = await Guard.findById(createdGuard._id);
    assert(dbGuardUpdated.fullName === 'Vikramaditya Chauhan (Promoted)', 'Updated name permanently saved in MongoDB');
    assert(dbGuardUpdated.mobileNumber === '+91 98765 99999', 'Updated mobile permanently saved in MongoDB');
    assert(dbGuardUpdated.designation === 'Head Guard / Supervisor', 'Updated designation permanently saved in MongoDB');
    assert(dbGuardUpdated.residentialAddress === 'Penthouse Duty Quarters', 'Updated address permanently saved in MongoDB');

    // Test update using guardId (e.g., GC-GRD-XXXX) identifier support
    const updateByCodeRes = await request('PUT', `/api/guards/${createdGuard.guardId}`, {
      designation: 'Security Director Guard',
    }, tokenA);
    assert(updateByCodeRes.status === 200, 'Guard updated successfully using guardId string identifier');
    const dbGuardCodeCheck = await Guard.findById(createdGuard._id);
    assert(dbGuardCodeCheck.designation === 'Security Director Guard', 'Designation updated via guardId saved in MongoDB');

    console.log('\n--- Test 3: Historical Records Setup & Soft Deactivation ---');
    const testSite = await Site.create({
      companyId: compA._id,
      siteId: `SITE-${Date.now()}`,
      siteName: 'Cyber Park Post A',
      address: 'Tower A Ground Floor',
      city: 'Gurugram',
      state: 'Haryana',
    });

    const testShift = await Shift.create({
      companyId: compA._id,
      shiftId: `SHIFT-${Date.now()}`,
      shiftName: 'Day Shift',
      startTime: '08:00',
      endTime: '16:00',
    });

    // Create attendance record and call log for this guard
    await AttendanceRecord.create({
      companyId: compA._id,
      guardId: createdGuard._id,
      siteId: testSite._id,
      shiftId: testShift._id,
      date: new Date(),
      status: 'Present',
      verificationMethod: 'Automated Call',
    });

    await CallLog.create({
      companyId: compA._id,
      guardId: createdGuard._id,
      callId: `TEST-CALL-${Date.now()}`,
      callerNumber: '+911244567890',
      destinationNumber: createdGuard.mobileNumber || '+919876543210',
      initiationTime: new Date(),
      status: 'Completed',
      verificationResult: 'CONFIRMED',
      dtmfResponse: '1',
    });

    // Deactivate / Archive guard
    const archiveRes = await request('DELETE', `/api/guards/${createdGuard._id}`, null, tokenA);
    assert(archiveRes.status === 200, 'Guard deactivation API returned 200 OK');

    // Verify soft deactivation in MongoDB
    const dbGuardArchived = await Guard.findById(createdGuard._id);
    assert(dbGuardArchived.isDeleted === true, 'Guard isDeleted set to true (Soft deletion)');
    assert(dbGuardArchived.employmentStatus === 'Inactive', 'Guard employmentStatus set to Inactive');
    assert(dbGuardArchived.currentDutyStatus === 'Off Duty', 'Guard dutyStatus set to Off Duty');

    // Verify historical attendance and call records remain intact in MongoDB
    const attendanceCount = await AttendanceRecord.countDocuments({ guardId: createdGuard._id });
    assert(attendanceCount === 1, 'Historical attendance records completely preserved in MongoDB');

    const callLogCount = await CallLog.countDocuments({ guardId: createdGuard._id });
    assert(callLogCount === 1, 'Historical call log records completely preserved in MongoDB');

    console.log('\n--- Test 4: Query Isolation & Active Roster Verification ---');
    // GET /api/guards without includeArchived must NOT return archived guard
    const activeRosterRes = await request('GET', '/api/guards', null, tokenA);
    const activeGuards = activeRosterRes.body.data || [];
    const foundInActive = activeGuards.some((g) => g._id.toString() === createdGuard._id.toString());
    assert(!foundInActive, 'Archived guard excluded from standard active roster');

    // GET /api/guards?includeArchived=true returns archived guard
    const allGuardsRes = await request('GET', '/api/guards?includeArchived=true', null, tokenA);
    const allGuards = allGuardsRes.body.data || [];
    const foundInAll = allGuards.find((g) => g._id.toString() === createdGuard._id.toString());
    assert(foundInAll !== undefined, 'Archived guard included when includeArchived=true');
    assert(foundInAll.isDeleted === true, 'Archived guard has isDeleted: true');

    console.log('\n--- Test 5: Strict Cross-Tenant Isolation Enforcement ---');
    // Agency B attempts to access Agency A's guard
    const crossAccess = await request('GET', `/api/guards/${createdGuard._id}`, null, tokenB);
    assert(crossAccess.status === 404, 'Agency B rejected when attempting to read Agency A guard (HTTP 404 Not Found)');

    // Agency B attempts to edit Agency A's guard
    const crossEdit = await request('PUT', `/api/guards/${createdGuard._id}`, { fullName: 'Malicious Edit' }, tokenB);
    assert(crossEdit.status === 404, 'Agency B rejected when attempting to edit Agency A guard (HTTP 404 Not Found)');

    // Agency B attempts to deactivate Agency A's guard
    const crossDelete = await request('DELETE', `/api/guards/${createdGuard._id}`, null, tokenB);
    assert(crossDelete.status === 404, 'Agency B rejected when attempting to deactivate Agency A guard (HTTP 404 Not Found)');

    // Verify Agency A guard was unaffected
    const dbGuardSafe = await Guard.findById(createdGuard._id);
    assert(dbGuardSafe.fullName === 'Vikramaditya Chauhan (Promoted)', 'Guard data in Agency A remains secure and uncompromised');

    // Cleanup test artifacts
    await Site.deleteMany({ companyId: compA._id });
    await Shift.deleteMany({ companyId: compA._id });
    await AttendanceRecord.deleteMany({ companyId: compA._id });
    await CallLog.deleteMany({ companyId: compA._id });
    await Guard.deleteMany({ companyId: { $in: [compA._id, compB._id] } });
    await Admin.deleteMany({ companyId: { $in: [compA._id, compB._id] } });
    await Company.deleteMany({ _id: { $in: [compA._id, compB._id] } });

    console.log('\n===============================================================');
    console.log(`🎉 TEST RUN COMPLETE: ${passed} / ${total} TESTS PASSED (100% SUCCESS)`);
    console.log('===============================================================\n');
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTests();
