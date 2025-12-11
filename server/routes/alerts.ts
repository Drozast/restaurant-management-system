import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';

const router = Router();

// GET all alerts
router.get('/', (req: Request, res: Response) => {
  try {
    const { resolved } = req.query;

    let query = `
      SELECT a.*, i.name as ingredient_name
      FROM alerts a
      LEFT JOIN ingredients i ON a.ingredient_id = i.id
    `;

    const params: any[] = [];

    if (resolved !== undefined) {
      query += ' WHERE a.resolved = ?';
      params.push(resolved === 'true' ? 1 : 0);
    }

    query += ' ORDER BY a.priority DESC, a.created_at DESC';

    const alerts = db.sqlite.prepare(query).all(...params);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener alertas' });
  }
});

// GET unresolved alerts count
router.get('/count', (req: Request, res: Response) => {
  try {
    const result = db.sqlite.prepare(`
      SELECT COUNT(*) as count FROM alerts WHERE resolved = 0
    `).get() as any;

    res.json({ count: result.count });
  } catch (error) {
    res.status(500).json({ error: 'Error al contar alertas' });
  }
});

// PUT resolve alert
router.put('/:id/resolve', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const stmt = db.sqlite.prepare(`
      UPDATE alerts
      SET resolved = 1, resolved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(id);

    const updated = db.sqlite.prepare(`
      SELECT a.*, i.name as ingredient_name
      FROM alerts a
      LEFT JOIN ingredients i ON a.ingredient_id = i.id
      WHERE a.id = ?
    `).get(id);

    // Emit update via socket
    const io = req.app.get('io');
    io.emit('alert:resolved', updated);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al resolver alerta' });
  }
});

// POST create suggestion alert (for idle time tasks)
router.post('/suggestion', (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    const stmt = db.sqlite.prepare(`
      INSERT INTO alerts (type, message, priority)
      VALUES ('suggestion', ?, 1)
    `);

    const result = stmt.run(message);

    const newAlert = db.sqlite.prepare('SELECT * FROM alerts WHERE id = ?').get(result.lastInsertRowid);

    // Emit update via socket
    const io = req.app.get('io');
    io.emit('alert:created', newAlert);

    res.status(201).json(newAlert);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear alerta de sugerencia' });
  }
});

// DELETE old resolved alerts (cleanup)
router.delete('/cleanup', (req: Request, res: Response) => {
  try {
    // Delete resolved alerts older than 7 days
    const stmt = db.sqlite.prepare(`
      DELETE FROM alerts
      WHERE resolved = 1
      AND resolved_at < datetime('now', '-7 days')
    `);

    const result = stmt.run();

    res.json({ message: 'Alertas antiguas eliminadas', deleted: result.changes });
  } catch (error) {
    res.status(500).json({ error: 'Error al limpiar alertas' });
  }
});

export default router;
