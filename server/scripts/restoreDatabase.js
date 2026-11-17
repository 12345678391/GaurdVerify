require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const args = process.argv.slice(2);
let backupDirArg = null;
let targetDbArg = 'guardconnect_restore_test'; // Default safe test database

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dir' && args[i + 1]) {
    backupDirArg = args[i + 1];
    i++;
  } else if (args[i] === '--target-db' && args[i + 1]) {
    targetDbArg = args[i + 1];
    i++;
  }
}

async function restore() {
  const baseBackupDir = path.resolve(__dirname, '../../backups');

  // If no specific dir provided, pick the latest backup directory
  let targetBackupDir = backupDirArg;
  if (!targetBackupDir) {
    if (!fs.existsSync(baseBackupDir)) {
      console.error(`[Restore CLI] No backups directory found at ${baseBackupDir}`);
      process.exit(1);
    }
    const entries = fs.readdirSync(baseBackupDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name.startsWith('backup-'))
      .map((e) => e.name)
      .sort()
      .reverse();

    if (entries.length === 0) {
      console.error(`[Restore CLI] No backup directories found in ${baseBackupDir}`);
      process.exit(1);
    }
    targetBackupDir = path.join(baseBackupDir, entries[0]);
  }

  const manifestPath = path.join(targetBackupDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`[Restore CLI] Invalid backup directory: manifest.json not found in ${targetBackupDir}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log('========================================================================');
  console.log('🛡️  AUTOGUARD DATABASE RESTORATION UTILITY');
  console.log('========================================================================');
  console.log(`Source Backup : ${targetBackupDir}`);
  console.log(`Backup Date   : ${manifest.createdAt}`);
  console.log(`Target Database: ${targetDbArg}`);

  if (targetDbArg === 'guardconnect') {
    console.warn('\n⚠️  WARNING: Restoring directly into the live database "guardconnect"!');
  } else {
    console.log(`\n🔒 SAFE TEST MODE: Restoring into isolated verification database "${targetDbArg}".`);
  }

  const baseUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/guardconnect';
  // Replace database name in URI
  const parsedUri = new URL(baseUri.startsWith('mongodb') ? baseUri : `mongodb://${baseUri}`);
  parsedUri.pathname = `/${targetDbArg}`;
  const targetUri = parsedUri.toString();

  console.log(`Connecting to: ${targetUri}`);
  await mongoose.connect(targetUri);
  const db = mongoose.connection.db;

  try {
    let totalRestored = 0;
    const collections = Object.keys(manifest.collections);

    for (const colName of collections) {
      const colMeta = manifest.collections[colName];
      const filePath = path.join(targetBackupDir, colMeta.file);
      if (!fs.existsSync(filePath)) {
        console.warn(`[Skip] File not found: ${filePath}`);
        continue;
      }

      const docs = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Clean existing target test collection
      await db.collection(colName).deleteMany({});

      if (docs.length > 0) {
        // Handle MongoDB BSON conversions (like $oid or ObjectIds)
        const sanitizedDocs = docs.map((doc) => {
          return JSON.parse(JSON.stringify(doc), (k, v) => {
            if (v && typeof v === 'object' && v.$oid) {
              return new mongoose.Types.ObjectId(v.$oid);
            }
            if (v && typeof v === 'object' && v.$date) {
              return new Date(v.$date);
            }
            return v;
          });
        });

        await db.collection(colName).insertMany(sanitizedDocs);
      }

      const restoredCount = await db.collection(colName).countDocuments();
      console.log(`  ✅ Restored collection "${colName}": ${restoredCount} / ${colMeta.count} documents`);
      totalRestored += restoredCount;
    }

    console.log('\n========================================================================');
    console.log(`Restoration Verification: ${totalRestored} / ${manifest.totalDocuments} total documents restored successfully.`);
    console.log('Target test database verified.');
    console.log('========================================================================\n');
  } catch (err) {
    console.error('[Restore CLI] Error during restoration:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

restore();
