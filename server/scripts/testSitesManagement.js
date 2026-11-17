const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const axios = require('axios');
const connectDB = require('../config/db');
const Site = require('../models/Site');
const Company = require('../models/Company');
const Admin = require('../models/Admin');
const AuditLog = require('../models/AuditLog');

const BASE_URL = 'http://127.0.0.1:5000/api';

async function runSitesTest() {
  console.log('--- STARTING OPERATIONAL SITES MANAGEMENT VERIFICATION ---');
  await connectDB();
  console.log('MongoDB connected.');

  // Find active company owners that have completed initial password setup
  let owners = await Admin.find({
    role: 'company_owner',
    isActive: true,
    mustChangePassword: false,
  }).populate('companyId');

  // If less than 2, check all company owners
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

  // Generate tokens directly with jwt to avoid password dependencies in test script
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

  // 1. GET /api/sites for Company A
  console.log('\n[TEST 1] List Company A Sites...');
  const resA = await axios.get(`${BASE_URL}/sites`, { headers: headersA });
  console.log(`Company A sites found: ${resA.data.data.length}`);
  resA.data.data.forEach((s) => {
    if (s.companyId.toString() !== compA._id.toString()) {
      throw new Error(`Data leakage! Found site ${s.siteName} belonging to company ${s.companyId}`);
    }
  });
  console.log('PASS: Company A only received its own sites.');

  // 2. CREATE site for Company A
  console.log('\n[TEST 2] Create Site for Company A...');
  const createPayload = {
    siteName: 'Alpha Tech Horizon Post ' + Date.now().toString().slice(-4),
    address: 'Plot 42, Cyber Gateway Sector 21',
    city: 'Gurugram',
    state: 'Haryana',
    contactNumber: '+91 9988776655',
    guardCapacity: 8,
  };
  const createRes = await axios.post(`${BASE_URL}/sites`, createPayload, { headers: headersA });
  if (!createRes.data.success || !createRes.data.data.siteId) {
    throw new Error('Site creation failed or siteId missing');
  }
  const createdSite = createRes.data.data;
  console.log(`Created site: ${createdSite.siteName} (siteId: ${createdSite.siteId}, _id: ${createdSite._id})`);
  console.log('PASS: Site created with auto-generated siteId.');

  // Verify in MongoDB
  const dbSite = await Site.findById(createdSite._id);
  if (!dbSite || dbSite.companyId.toString() !== compA._id.toString()) {
    throw new Error('Site was not correctly persisted in MongoDB with companyId.');
  }
  console.log('PASS: Verified persistence in MongoDB with correct companyId.');

  // 3. UPDATE site for Company A
  console.log('\n[TEST 3] Update Site for Company A...');
  const updatePayload = {
    name: createdSite.siteName + ' (Updated)',
    address: 'Plot 42, Building B, Cyber Gateway',
    guardCapacity: 12,
  };
  const updateRes = await axios.put(`${BASE_URL}/sites/${createdSite._id}`, updatePayload, { headers: headersA });
  if (!updateRes.data.success || updateRes.data.data.siteName !== updatePayload.name || updateRes.data.data.guardCapacity !== 12) {
    throw new Error('Site update failed to reflect changes');
  }
  console.log(`Updated site name: ${updateRes.data.data.siteName}, capacity: ${updateRes.data.data.guardCapacity}`);
  console.log('PASS: Site updated successfully.');

  // 4. CROSS-TENANT ISOLATION: Company B attempts
  console.log('\n[TEST 4] Company B Tenant Isolation Checks...');
  const resB = await axios.get(`${BASE_URL}/sites`, { headers: headersB });
  const leakedSite = resB.data.data.find((s) => s._id.toString() === createdSite._id.toString());
  if (leakedSite) {
    throw new Error('FAIL: Company B was able to see Company A site in GET /api/sites!');
  }
  console.log('PASS: Company B site list does NOT contain Company A site.');

  // Company B tries to update Company A site
  try {
    await axios.put(`${BASE_URL}/sites/${createdSite._id}`, { siteName: 'Hacked Site' }, { headers: headersB });
    throw new Error('FAIL: Company B was able to update Company A site!');
  } catch (err) {
    if (err.response && (err.response.status === 404 || err.response.status === 403)) {
      console.log(`PASS: Company B cross-tenant update rejected with HTTP ${err.response.status}.`);
    } else {
      throw err;
    }
  }

  // Company B tries to delete Company A site
  try {
    await axios.delete(`${BASE_URL}/sites/${createdSite._id}`, { headers: headersB });
    throw new Error('FAIL: Company B was able to delete Company A site!');
  } catch (err) {
    if (err.response && (err.response.status === 404 || err.response.status === 403)) {
      console.log(`PASS: Company B cross-tenant delete rejected with HTTP ${err.response.status}.`);
    } else {
      throw err;
    }
  }

  // 5. DEACTIVATE (Soft Delete) site for Company A
  console.log('\n[TEST 5] Deactivate Site for Company A...');
  const deleteRes = await axios.delete(`${BASE_URL}/sites/${createdSite._id}`, { headers: headersA });
  if (!deleteRes.data.success) {
    throw new Error('Deactivation failed');
  }
  console.log('Delete response:', deleteRes.data.message);

  // Check MongoDB: isDeleted should be true
  const softDeletedSite = await Site.findById(createdSite._id);
  if (!softDeletedSite || !softDeletedSite.isDeleted || softDeletedSite.status !== 'Inactive') {
    throw new Error('FAIL: Site isDeleted is not true or status is not Inactive.');
  }
  console.log('PASS: Verified in MongoDB isDeleted=true, status="Inactive".');

  // Verify it no longer appears in GET /api/sites
  const resAAfter = await axios.get(`${BASE_URL}/sites`, { headers: headersA });
  const stillPresent = resAAfter.data.data.find((s) => s._id.toString() === createdSite._id.toString());
  if (stillPresent) {
    throw new Error('FAIL: Soft-deleted site still returned in active site list.');
  }
  console.log('PASS: Deactivated site correctly omitted from GET /api/sites.');

  // 6. Check Audit Logs
  console.log('\n[TEST 6] Audit Logs Verification...');
  const auditEntries = await AuditLog.find({
    entityId: createdSite._id,
  });
  console.log(`Found ${auditEntries.length} audit entries for this site:`);
  auditEntries.forEach((a) => console.log(`  - [${a.action}] ${a.details}`));
  if (auditEntries.length < 3) {
    throw new Error('Expected at least 3 audit logs (CREATE, UPDATE, DEACTIVATE).');
  }
  console.log('PASS: Audit trail completely recorded.');

  console.log('\n--- ALL OPERATIONAL SITES MANAGEMENT TESTS PASSED SUCCESSFULLY! ---');
  await mongoose.disconnect();
}

runSitesTest().catch((err) => {
  console.error('\nTEST FAILED:', err.response?.data || err.message);
  process.exit(1);
});
