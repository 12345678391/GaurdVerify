const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function resetHeadAdminPassword() {
  await mongoose.connect('mongodb://127.0.0.1:27017/guardconnect');
  const Admin = require('../models/Admin');

  // Locate existing Head Admin by role super_admin or email
  const headAdmin = await Admin.findOne({
    $or: [
      { email: 'headadmin@autoguard.com' },
      { aliasEmail: 'vikrant@autoguardsecurity.com' },
      { role: 'super_admin', companyId: null },
    ],
  });

  if (!headAdmin) {
    console.error('Head Admin account not found in database.');
    process.exit(1);
  }

  // Generate secure bcrypt hash for development credential
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('Admin@AutoGuard2026', salt);

  // Atomically update password and ensure aliasEmail is strictly bound
  await Admin.updateOne(
    { _id: headAdmin._id },
    {
      $set: {
        password: hashedPassword,
        aliasEmail: 'vikrant@autoguardsecurity.com',
      },
    }
  );

  // Verify the reset with comparePassword without logging sensitive values
  const updatedAdmin = await Admin.findById(headAdmin._id);
  const matchResult = await updatedAdmin.comparePassword('Admin@AutoGuard2026');

  console.log('Head Admin password reset complete:');
  console.log({
    id: updatedAdmin._id,
    email: updatedAdmin.email,
    aliasEmail: updatedAdmin.aliasEmail,
    role: updatedAdmin.role,
    companyId: updatedAdmin.companyId,
    isActive: updatedAdmin.isActive,
    verificationSuccess: matchResult,
  });

  await mongoose.disconnect();
}

resetHeadAdminPassword().catch((err) => {
  console.error('Error during password reset:', err);
  process.exit(1);
});
