const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const BACKUP_BASE_DIR = process.env.BACKUP_DIR
  ? path.resolve(__dirname, '..', process.env.BACKUP_DIR)
  : path.resolve(__dirname, '../../backups');

const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '7', 10);

class BackupService {
  constructor() {
    this.timer = null;
    this.isRunning = false;
  }

  log(msg, isError = false) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${msg}\n`;
    if (isError) {
      console.error(`[BackupService] ${msg}`);
    } else {
      console.log(`[BackupService] ${msg}`);
    }

    try {
      if (!fs.existsSync(BACKUP_BASE_DIR)) {
        fs.mkdirSync(BACKUP_BASE_DIR, { recursive: true });
      }
      fs.appendFileSync(path.join(BACKUP_BASE_DIR, 'backup.log'), line);
    } catch (_) {}
  }

  /**
   * Execute an atomic, non-destructive backup of all collections in the active database.
   * Exports each collection to a timestamped folder outside the live data directory.
   */
  async runBackup() {
    if (this.isRunning) {
      this.log('Backup already in progress. Skipping duplicate execution.');
      return null;
    }

    this.isRunning = true;
    const startTime = Date.now();
    const dateStamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(BACKUP_BASE_DIR, `backup-${dateStamp}`);

    try {
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('MongoDB connection is not established.');
      }

      this.log(`Initiating database backup to: ${backupDir}`);
      const collections = await db.listCollections().toArray();
      const manifest = {
        database: db.databaseName,
        createdAt: new Date().toISOString(),
        collections: {},
        totalDocuments: 0,
      };

      for (const col of collections) {
        const colName = col.name;
        if (colName.startsWith('system.')) continue;

        const cursor = db.collection(colName).find({});
        const docs = await cursor.toArray();
        const filePath = path.join(backupDir, `${colName}.json`);

        fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');

        manifest.collections[colName] = {
          count: docs.length,
          file: `${colName}.json`,
          sizeBytes: fs.statSync(filePath).size,
        };
        manifest.totalDocuments += docs.length;
      }

      fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      this.log(`Backup completed successfully in ${elapsed}s. Total documents: ${manifest.totalDocuments}. Directory: ${backupDir}`);

      // Apply retention rotation
      this.rotateBackups();

      return {
        success: true,
        backupDir,
        manifest,
        elapsedSeconds: elapsed,
      };
    } catch (err) {
      this.log(`Backup failed: ${err.message}`, true);
      return { success: false, error: err.message };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Delete backups older than RETENTION_DAYS
   */
  rotateBackups() {
    try {
      if (!fs.existsSync(BACKUP_BASE_DIR)) return;
      const entries = fs.readdirSync(BACKUP_BASE_DIR, { withFileTypes: true });
      const now = Date.now();
      const maxAgeMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('backup-')) {
          const dirPath = path.join(BACKUP_BASE_DIR, entry.name);
          const stat = fs.statSync(dirPath);
          if (now - stat.mtimeMs > maxAgeMs) {
            fs.rmSync(dirPath, { recursive: true, force: true });
            this.log(`Rotated old backup directory: ${entry.name} (exceeded ${RETENTION_DAYS} days retention)`);
          }
        }
      }
    } catch (err) {
      this.log(`Failed during backup rotation: ${err.message}`, true);
    }
  }

  /**
   * Schedule automated daily backup at 02:00 AM local time
   */
  schedule() {
    if (this.timer) clearInterval(this.timer);

    this.log(`Automated daily backup scheduler active. Retention: ${RETENTION_DAYS} days. Target: ${BACKUP_BASE_DIR}`);

    // Check hourly if current time matches scheduled 02:00 AM window
    this.timer = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 2 && now.getMinutes() < 5) {
        this.runBackup();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.log('Backup scheduler stopped.');
    }
  }
}

module.exports = new BackupService();
