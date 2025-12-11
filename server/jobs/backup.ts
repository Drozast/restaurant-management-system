import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates a backup of the SQLite database
 * Se ejecuta todos los días a las 3:00 AM
 */
export function scheduleDatabaseBackup() {
  cron.schedule('0 0 3 * * *', async () => {
    console.log('💾 [BACKUP] Iniciando backup de base de datos...');

    try {
      const dataDir = path.join(__dirname, '../../data');
      const backupDir = path.join(dataDir, 'backups');
      const dbPath = path.join(dataDir, 'pizza.db');

      // Create backups directory if it doesn't exist
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
        console.log('📁 [BACKUP] Directorio de backups creado');
      }

      // Create backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const backupPath = path.join(backupDir, `pizza-backup-${timestamp}.db`);

      // Copy database file
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, backupPath);

        // Get file size
        const stats = fs.statSync(backupPath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log(`✅ [BACKUP] Backup creado: ${path.basename(backupPath)} (${sizeMB} MB)`);

        // Clean old backups (keep last 30 days)
        cleanOldBackups(backupDir, 30);
      } else {
        console.error('❌ [BACKUP] Base de datos no encontrada:', dbPath);
      }

    } catch (error) {
      console.error('❌ [BACKUP] Error creando backup:', error);
    }
  }, {
    timezone: "America/Santiago"
  });

  console.log('⏰ Cron job configurado: Backup diario a las 3:00 AM (Chile)');
}

/**
 * Clean backups older than specified days
 */
function cleanOldBackups(backupDir: string, daysToKeep: number) {
  try {
    const files = fs.readdirSync(backupDir);
    const now = Date.now();
    const maxAge = daysToKeep * 24 * 60 * 60 * 1000; // days to milliseconds

    let deletedCount = 0;

    files.forEach((file) => {
      if (file.startsWith('pizza-backup-') && file.endsWith('.db')) {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }
    });

    if (deletedCount > 0) {
      console.log(`🗑️ [BACKUP] Backups antiguos eliminados: ${deletedCount}`);
    }
  } catch (error) {
    console.error('❌ [BACKUP] Error limpiando backups:', error);
  }
}

/**
 * Create immediate backup (on-demand)
 */
export function createImmediateBackup(): string {
  console.log('💾 [BACKUP] Creando backup inmediato...');

  try {
    const dataDir = path.join(__dirname, '../../data');
    const backupDir = path.join(dataDir, 'backups');
    const dbPath = path.join(dataDir, 'pizza.db');

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `pizza-backup-manual-${timestamp}.db`);

    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
      const stats = fs.statSync(backupPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      console.log(`✅ [BACKUP] Backup manual creado: ${path.basename(backupPath)} (${sizeMB} MB)`);
      return backupPath;
    } else {
      throw new Error('Base de datos no encontrada');
    }
  } catch (error) {
    console.error('❌ [BACKUP] Error creando backup manual:', error);
    throw error;
  }
}

/**
 * List all backups
 */
export function listBackups(): { filename: string; size: string; date: Date }[] {
  try {
    const dataDir = path.join(__dirname, '../../data');
    const backupDir = path.join(dataDir, 'backups');

    if (!fs.existsSync(backupDir)) {
      return [];
    }

    const files = fs.readdirSync(backupDir);
    const backups = files
      .filter((file) => file.startsWith('pizza-backup-') && file.endsWith('.db'))
      .map((file) => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

        return {
          filename: file,
          size: `${sizeMB} MB`,
          date: stats.mtime,
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    return backups;
  } catch (error) {
    console.error('Error listando backups:', error);
    return [];
  }
}
