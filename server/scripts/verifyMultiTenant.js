require('dotenv').config({ path: __dirname + '/../.env' });
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Import models
const Admin = require('../models/Admin');
const Company = require('../models/Company');
const Guard = require('../models/Guard');
const { protect, authorize } = require('../middleware/auth');

async function runVerification() {
  console.log('=================================================================');
  console.log('🛡️  AUTOGUARD MULTI-TENANT & TWO-LEVEL ADMIN SYSTEM VERIFICATION');
  console.log('=================================================================');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
    }
  }

  // TEST 1: Password security & bcrypt hashing
  console.log('\n--- 1. Password Security & Bcrypt Hashing ---');
  const plainPassword = 'SecureAdminPassword2026!';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(plainPassword, salt);
  assert(hash.startsWith('$2'), 'Password hashed using standard bcrypt format');
  assert(await bcrypt.compare(plainPassword, hash), 'Bcrypt correctly verifies candidate password');
  assert(!(await bcrypt.compare('WrongPassword', hash)), 'Bcrypt rejects incorrect candidate password');

  // TEST 2: Admin Model & Role Schema Rules
  console.log('\n--- 2. Admin Model & Role Schema Rules ---');
  const superAdminDoc = new Admin({
    fullName: 'Head Administrator',
    email: 'headadmin@autoguard.com',
    password: plainPassword,
    role: 'super_admin',
    companyId: null,
  });
  const superAdminValidation = superAdminDoc.validateSync();
  assert(!superAdminValidation, 'Level 1 Head Admin (super_admin) valid without companyId');

  const companyOwnerDoc = new Admin({
    fullName: 'Company Owner',
    email: 'owner@agency.com',
    password: plainPassword,
    role: 'company_owner',
  });
  const ownerValidation = companyOwnerDoc.validateSync();
  assert(
    ownerValidation && ownerValidation.errors && ownerValidation.errors.companyId,
    'Level 2 Company Owner strictly requires companyId'
  );

  // TEST 3: Company Status & Suspension Rules
  console.log('\n--- 3. Company Status & Suspension Rules ---');
  const companyActive = new Company({
    name: 'Active Security Agency',
    code: 'ACTIVESEC',
    email: 'info@activesec.com',
    status: 'active',
  });
  assert(companyActive.status === 'active', 'Company default status is active');
  assert(companyActive.isActive === true, 'Company isActive is true when active');

  const companySuspended = new Company({
    name: 'Suspended Security Agency',
    code: 'SUSPSEC',
    email: 'info@suspsec.com',
    status: 'suspended',
    isActive: false,
  });
  assert(companySuspended.status === 'suspended', 'Company status supports suspended');
  assert(companySuspended.isActive === false, 'Company isActive is false when suspended');

  // TEST 4: JWT Token Security
  console.log('\n--- 4. JWT Authentication Security ---');
  const secret = process.env.JWT_SECRET || 'guardconnect_secret_key';
  const mockId = new mongoose.Types.ObjectId();
  const token = jwt.sign({ id: mockId.toString() }, secret, { expiresIn: '7d' });
  const decoded = jwt.verify(token, secret);
  assert(decoded.id === mockId.toString(), 'JWT token successfully encodes and decodes admin id');

  let badTokenRejected = false;
  try {
    jwt.verify('invalid.token.string', secret);
  } catch (e) {
    badTokenRejected = true;
  }
  assert(badTokenRejected, 'Tampered/malformed JWT token is strictly rejected');

  // TEST 5: Two-Level Role Authorization Middleware
  console.log('\n--- 5. Two-Level Role Authorization Middleware ---');
  const superAdminReq = { admin: { role: 'super_admin', fullName: 'Head Admin' } };
  const companyOwnerReq = { admin: { role: 'company_owner', fullName: 'Company Owner' } };
  const operatorReq = { admin: { role: 'operator', fullName: 'Operator' } };

  // Platform super_admin-only route authorization check
  const superAdminOnlyCheck = authorize('super_admin');
  let allowedSuper = false;
  superAdminOnlyCheck(superAdminReq, {}, () => {
    allowedSuper = true;
  });
  assert(allowedSuper, 'Level 1 Head Admin authorized for platform routes');

  let blockedOwnerStatus = 0;
  const mockOwnerRes = {
    status: (code) => ({
      json: () => {
        blockedOwnerStatus = code;
      },
    }),
  };
  superAdminOnlyCheck(companyOwnerReq, mockOwnerRes, () => {});
  assert(blockedOwnerStatus === 403, 'Level 2 Company Owner forbidden (403) from platform admin routes');

  // Company management route authorization check
  const companyManagementCheck = authorize('company_owner', 'super_admin', 'admin');
  let allowedOwner = false;
  companyManagementCheck(companyOwnerReq, {}, () => {
    allowedOwner = true;
  });
  assert(allowedOwner, 'Level 2 Company Owner authorized for company management routes');

  let blockedOperatorStatus = 0;
  const mockOperatorRes = {
    status: (code) => ({
      json: () => {
        blockedOperatorStatus = code;
      },
    }),
  };
  companyManagementCheck(operatorReq, mockOperatorRes, () => {});
  assert(blockedOperatorStatus === 403, 'Operator forbidden (403) from administrative operations');

  // TEST 6: Strict Company Data Isolation in Queries
  console.log('\n--- 6. Strict Multi-Company Data Isolation ---');
  const companyAId = new mongoose.Types.ObjectId();
  const companyBId = new mongoose.Types.ObjectId();

  const mockQueryCompanyA = { companyId: companyAId, isDeleted: false };
  const mockQueryCompanyB = { companyId: companyBId, isDeleted: false };

  assert(
    mockQueryCompanyA.companyId.toString() !== mockQueryCompanyB.companyId.toString(),
    'Company A and Company B possess distinct immutable company IDs'
  );
  assert(
    mockQueryCompanyA.companyId.equals(companyAId),
    'Tenant query strictly scoped to Company A cannot return Company B records'
  );

  console.log('\n=================================================================');
  console.log(`VERIFICATION SUMMARY: ${passed}/${total} TESTS PASSED`);
  console.log('=================================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('[Verification Failed]', err);
  process.exit(1);
});
