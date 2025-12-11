import { Router } from 'express';
import { db } from '../database/db.js';

const router = Router();

// Obtener todos los premios activos
router.get('/', (req, res) => {
  try {
    const rewards = db.sqlite
      .prepare('SELECT * FROM rewards WHERE active = 1 ORDER BY created_at DESC')
      .all();
    res.json(rewards);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener un premio específico
router.get('/:id', (req, res) => {
  try {
    const reward = db.sqlite
      .prepare('SELECT * FROM rewards WHERE id = ?')
      .get(req.params.id);

    if (!reward) {
      return res.status(404).json({ error: 'Premio no encontrado' });
    }

    res.json(reward);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Crear nuevo premio (solo admin)
router.post('/', (req, res) => {
  try {
    const { title, description, icon, created_by } = req.body;

    if (!title || !description || !created_by) {
      return res.status(400).json({
        error: 'Título, descripción y creador son requeridos'
      });
    }

    const result = db.sqlite.prepare(`
      INSERT INTO rewards (title, description, icon, created_by)
      VALUES (?, ?, ?, ?)
    `).run(title, description, icon || '🎁', created_by);

    const newReward = db.sqlite
      .prepare('SELECT * FROM rewards WHERE id = ?')
      .get(result.lastInsertRowid);

    res.status(201).json(newReward);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar premio (solo admin)
router.put('/:id', (req, res) => {
  try {
    const { title, description, icon } = req.body;

    const result = db.sqlite.prepare(`
      UPDATE rewards
      SET title = ?, description = ?, icon = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, description, icon, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Premio no encontrado' });
    }

    const updatedReward = db.sqlite
      .prepare('SELECT * FROM rewards WHERE id = ?')
      .get(req.params.id);

    res.json(updatedReward);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar premio (solo admin) - soft delete
router.delete('/:id', (req, res) => {
  try {
    const result = db.sqlite.prepare(`
      UPDATE rewards
      SET active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Premio no encontrado' });
    }

    res.json({ message: 'Premio eliminado correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener un premio aleatorio activo (para mostrar en login)
router.get('/random/active', (req, res) => {
  try {
    const reward = db.sqlite
      .prepare('SELECT * FROM rewards WHERE active = 1 ORDER BY RANDOM() LIMIT 1')
      .get();

    res.json(reward || null);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
