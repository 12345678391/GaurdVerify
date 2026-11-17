require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const backupService = require('../services/backupService');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/guardconnect';
  console.log(`[Backup CLI] Connecting to MongoDB: ${uri}`);

  try {
    await mongoose.connect(uri);
    console.log('[Backup CLI] Connected to MongoDB.');

    const result = await backupService.runBackup();
    if (result && result.success) {
      console.log(`[Backup CLI] Success! Backup created at: ${result.backupDir}`);
      console.log(`[Backup CLI] Collections backed up:`, Object.keys(result.manifest.collections));
      console.log(`[Backup CLI] Total documents: ${result.manifest.totalDocuments}`);
    } else {
      console.error(`[Backup CLI] Error:`, result?.error);
      process.exit(1);
    }
  } catch (err) {
    console.error(`[Backup CLI] Fatal error:`, err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('[Backup CLI] Disconnected from MongoDB.');
  }
}

main();
