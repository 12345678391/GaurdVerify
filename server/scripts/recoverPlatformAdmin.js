/**
 * AutoGuard Enterprise — Secure Platform Admin Password Recovery Utility
 *
 * This utility allows the authorized platform owner to securely set a new password
 * for the primary Platform Administrator account (headadmin@autoguard.com).
 *
 * Security features:
 * - Interactive masked terminal input (typed password is NOT visible in terminal history or logs).
 * - Password confirmation validation.
 * - Minimum complexity validation (8+ characters, uppercase, lowercase, numbers, symbols).
 * - Strong bcrypt hashing (salt rounds: 10).
 * - Strictly targets the existing super_admin document; does not touch other collections.
 * - Zero plaintext password or hash logging.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const readline = require('readline');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const TARGET_EMAIL = 'headadmin@autoguard.com';
const TARGET_ALIAS = 'vikrant@autoguardsecurity.com';

/**
 * Prompt for a password with masked terminal feedback (*)
 */
function promptPassword(promptMessage) {
  return new Promise((resolve) => {
    process.stdout.write(promptMessage);
    const stdin = process.stdin;

    if (!stdin.isTTY) {
      // Fallback for non-TTY / piped inputs
      const rl = readline.createInterface({ input: stdin, output: process.stdout });
      rl.question('', (ans) => {
        rl.close();
        resolve(ans.trim());
      });
      return;
    }

    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let password = '';
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n' || char === '\u0004') {
          stdin.setRawMode(wasRaw || false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          return resolve(password);
        } else if (char === '\u0003') {
          // Ctrl+C
          stdin.setRawMode(wasRaw || false);
          stdin.pause();
          process.stdout.write('\n\n[Recovery Aborted by User]\n');
          process.exit(0);
        } else if (char === '\b' || char === '\x7f' || char === '\u0008') {
          // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          password += char;
          process.stdout.write('*');
        }
      }
    };

    stdin.on('data', onData);
  });
}

function validatePasswordStrength(pwd) {
  if (!pwd || pwd.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[A-Z]/.test(pwd)) {
    return 'Password must contain at least one uppercase letter (A-Z).';
  }
  if (!/[a-z]/.test(pwd)) {
    return 'Password must contain at least one lowercase letter (a-z).';
  }
  if (!/[0-9]/.test(pwd)) {
    return 'Password must contain at least one number (0-9).';
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) {
    return 'Password must contain at least one special character (!@#$%^&* etc.).';
  }
  return null;
}

async function main() {
  console.log('========================================================================');
  console.log('🛡️  AUTOGUARD PLATFORM ADMIN SECURE PASSWORD RECOVERY');
  console.log('========================================================================\n');
  console.log(`Target Platform Admin: ${TARGET_EMAIL}`);
  console.log(`Associated Alias    : ${TARGET_ALIAS}\n`);

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/guardconnect';

  try {
    console.log('[1/4] Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    const Admin = require('../models/Admin');

    // 1. Locate the exact super_admin account
    const headAdmin = await Admin.findOne({
      $or: [
        { email: TARGET_EMAIL },
        { aliasEmail: TARGET_ALIAS },
        { role: 'super_admin', companyId: null },
      ],
    });

    if (!headAdmin) {
      console.error(`\n❌ Error: Platform Administrator account (${TARGET_EMAIL}) was not found in database.`);
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`   Account located: ${headAdmin.fullName} (ID: ${headAdmin._id}, Role: ${headAdmin.role})\n`);

    // 2. Interactive Password Entry
    console.log('[2/4] Enter your new password below (input is masked for security):');
    const newPassword = await promptPassword('New Password: ');

    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      console.error(`\n❌ Validation Error: ${strengthError}`);
      console.log('Please run the recovery command again and choose a compliant password.\n');
      await mongoose.disconnect();
      process.exit(1);
    }

    const confirmPassword = await promptPassword('Confirm New Password: ');

    if (newPassword !== confirmPassword) {
      console.error('\n❌ Error: Passwords do not match. Recovery cancelled.');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('\n[3/4] Hashing password using bcrypt (salt rounds: 10)...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    console.log('[4/4] Updating administrator credentials in MongoDB...');
    const result = await Admin.updateOne(
      { _id: headAdmin._id },
      {
        $set: {
          password: hashedPassword,
          mustChangePassword: false, // Recovery completes password setup
          isActive: true,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 1) {
      console.log('\n========================================================================');
      console.log('✅ SUCCESS: Platform Administrator password updated successfully.');
      console.log('========================================================================\n');
      console.log('You can now log in at:');
      console.log('URL   : http://localhost:5000/login (or your production domain)');
      console.log(`Email : ${headAdmin.email}`);
      console.log('Destination: Redirects directly to /company-management\n');
    } else {
      console.error('\n❌ Error: Database update did not modify the record.');
    }
  } catch (err) {
    console.error('\n❌ Fatal error during recovery:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

main();
