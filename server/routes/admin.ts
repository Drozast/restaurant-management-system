import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';
import { createImmediateBackup, listBackups } from '../jobs/backup.js';

const router = Router();

// Dynamic import of bcryptjs to avoid build errors if not installed
let bcrypt: any = null;
try {
  bcrypt = await import('bcryptjs').then(m => m.default);
} catch (err) {
  console.warn('⚠️ bcryptjs not installed - password hashing disabled');
}

// POST - Reset week (Admin only)
router.post('/reset-week', async (req: Request, res: Response) => {
  try {
    const { rut, password } = req.body;

    if (!rut || !password) {
      return res.status(400).json({ error: 'RUT y contraseña son requeridos' });
    }

    // Verify admin credentials
    const user = db.sqlite.prepare('SELECT * FROM users WHERE rut = ?').get(rut) as any;

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Check if password is hashed (starts with $2a$ or $2b$) or plain text
    let validPassword = false;
    if (user.password.startsWith('$2') && bcrypt) {
      // Password is hashed, use bcrypt
      validPassword = await bcrypt.compare(password, user.password);
    } else {
      // Password is plain text, compare directly
      validPassword = password === user.password;
    }

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (user.role !== 'chef') {
      return res.status(403).json({ error: 'Solo los administradores pueden reiniciar la semana' });
    }

    // Begin transaction
    db.sqlite.exec('BEGIN TRANSACTION');

    try {
      // 1. Reset all ingredients to 100% (back to their total_quantity)
      db.sqlite.prepare(`
        UPDATE ingredients
        SET current_quantity = total_quantity,
            current_percentage = 100,
            updated_at = CURRENT_TIMESTAMP
      `).run();

      // 2. Delete all sales
      db.sqlite.prepare('DELETE FROM sales').run();

      // 3. Delete all alerts
      db.sqlite.prepare('DELETE FROM alerts').run();

      // 4. Delete all restocks
      db.sqlite.prepare('DELETE FROM restocks').run();

      // 5. Close all open shifts
      db.sqlite.prepare(`
        UPDATE shifts
        SET status = 'closed',
            end_time = CURRENT_TIMESTAMP
        WHERE status = 'open'
      `).run();

      // 6. Delete shift tasks for completed shifts (optional - keep history)
      // db.sqlite.prepare('DELETE FROM shift_tasks').run();

      // 7. Delete mise en place data
      db.sqlite.prepare('DELETE FROM shift_mise_en_place').run();

      // 8. Reset weekly achievements
      db.sqlite.prepare('DELETE FROM weekly_achievements').run();

      // Commit transaction
      db.sqlite.exec('COMMIT');

      // Emit socket event to refresh all clients
      const io = req.app.get('io');
      io.emit('week:reset', {
        message: 'La semana ha sido reiniciada',
        resetBy: user.name,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Semana reiniciada exitosamente',
        resetBy: user.name,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      // Rollback on error
      db.sqlite.exec('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error resetting week:', error);
    res.status(500).json({ error: 'Error al reiniciar la semana' });
  }
});

// GET - Get reset history (optional - for audit trail)
router.get('/reset-history', (req: Request, res: Response) => {
  try {
    // This would require a new table to track resets
    // For now, return empty array
    res.json([]);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

// POST - Create manual backup
router.post('/backup', (req: Request, res: Response) => {
  try {
    const backupPath = createImmediateBackup();
    res.json({
      success: true,
      message: 'Backup creado exitosamente',
      path: backupPath,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: error.message || 'Error al crear backup' });
  }
});

// GET - List all backups
router.get('/backups', (req: Request, res: Response) => {
  try {
    const backups = listBackups();
    res.json(backups);
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({ error: 'Error al listar backups' });
  }
});

export default router;
