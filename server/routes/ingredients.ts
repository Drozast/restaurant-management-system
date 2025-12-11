import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';
import { Ingredient, Restock } from '../types/index.js';
import bcrypt from 'bcryptjs';

const router = Router();

// GET all ingredients
router.get('/', (req: Request, res: Response) => {
  try {
    const ingredients = db.sqlite.prepare('SELECT * FROM ingredients ORDER BY category, name').all();
    res.json(ingredients);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ingredientes' });
  }
});

// GET ingredient by id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ingredient = db.sqlite.prepare('SELECT * FROM ingredients WHERE id = ?').get(id);

    if (!ingredient) {
      return res.status(404).json({ error: 'Ingrediente no encontrado' });
    }

    res.json(ingredient);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ingrediente' });
  }
});

// POST create ingredient
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, unit, category, critical_threshold, warning_threshold, total_quantity, current_quantity } = req.body;

    const totalQty = total_quantity || 1000;
    const currentQty = current_quantity || totalQty;
    const currentPercentage = Math.round((currentQty / totalQty) * 100);

    const stmt = db.sqlite.prepare(`
      INSERT INTO ingredients (name, unit, category, critical_threshold, warning_threshold, total_quantity, current_quantity, current_percentage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name,
      unit,
      category,
      critical_threshold || 20,
      warning_threshold || 50,
      totalQty,
      currentQty,
      currentPercentage
    );

    const newIngredient = db.sqlite.prepare('SELECT * FROM ingredients WHERE id = ?').get(result.lastInsertRowid);

    // Emit update via socket
    const io = req.app.get('io');
    io.emit('ingredient:created', newIngredient);

    res.status(201).json(newIngredient);
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      res.status(400).json({ error: 'El ingrediente ya existe' });
    } else {
      res.status(500).json({ error: 'Error al crear ingrediente' });
    }
  }
});

// PUT update ingredient
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, unit, category, critical_threshold, warning_threshold, current_percentage, total_quantity, current_quantity } = req.body;

    // Build dynamic update query based on provided fields
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (unit !== undefined) {
      updates.push('unit = ?');
      values.push(unit);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      values.push(category);
    }
    if (critical_threshold !== undefined) {
      updates.push('critical_threshold = ?');
      values.push(critical_threshold);
    }
    if (warning_threshold !== undefined) {
      updates.push('warning_threshold = ?');
      values.push(warning_threshold);
    }
    if (total_quantity !== undefined) {
      updates.push('total_quantity = ?');
      values.push(total_quantity);
    }
    if (current_quantity !== undefined) {
      updates.push('current_quantity = ?');
      values.push(current_quantity);
    }
    if (current_percentage !== undefined) {
      updates.push('current_percentage = ?');
      values.push(current_percentage);
    } else if (total_quantity !== undefined && current_quantity !== undefined) {
      // Auto-calculate percentage if both quantities provided
      const percentage = Math.round((current_quantity / total_quantity) * 100);
      updates.push('current_percentage = ?');
      values.push(percentage);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.sqlite.prepare(`
      UPDATE ingredients
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    const updated = db.sqlite.prepare('SELECT * FROM ingredients WHERE id = ?').get(id);

    // Emit update via socket
    const io = req.app.get('io');
    io.emit('ingredient:updated', updated);

    // Check if alert needed
    checkAndCreateAlert(updated as Ingredient, io);

    res.json(updated);
  } catch (error) {
    console.error('Error updating ingredient:', error);
    res.status(500).json({ error: 'Error al actualizar ingrediente' });
  }
});

// POST restock ingredient
router.post('/:id/restock', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { new_percentage, new_quantity, added_quantity, authorized_by, authorized_rut, authorized_password, shift_id } = req.body;

    // Verify credentials if provided (without creating session)
    let authorizedName = authorized_by;
    if (authorized_rut && authorized_password) {
      const user = db.sqlite.prepare('SELECT * FROM users WHERE rut = ?').get(authorized_rut) as any;

      if (!user) {
        return res.status(401).json({ error: 'RUT no encontrado' });
      }

      const isValidPassword = bcrypt.compareSync(authorized_password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
      }

      authorizedName = user.name;
    }

    const ingredient = db.sqlite.prepare('SELECT * FROM ingredients WHERE id = ?').get(id) as any;

    if (!ingredient) {
      return res.status(404).json({ error: 'Ingrediente no encontrado' });
    }

    let finalQuantity = ingredient.current_quantity || 0;
    let finalPercentage = ingredient.current_percentage || 0;

    // Si se proporciona cantidad agregada, sumar a la actual
    if (added_quantity !== undefined) {
      finalQuantity = (ingredient.current_quantity || 0) + added_quantity;
      finalPercentage = ingredient.total_quantity > 0
        ? Math.round((finalQuantity / ingredient.total_quantity) * 100)
        : 0;
    }
    // Si se proporciona cantidad nueva directa, usar esa
    else if (new_quantity !== undefined) {
      finalQuantity = new_quantity;
      finalPercentage = ingredient.total_quantity > 0
        ? Math.round((new_quantity / ingredient.total_quantity) * 100)
        : 0;
    }
    // Si se proporciona porcentaje, calcular cantidad
    else if (new_percentage !== undefined) {
      finalPercentage = new_percentage;
      finalQuantity = Math.round((new_percentage / 100) * (ingredient.total_quantity || 1000));
    }

    // Register restock in history
    const restockStmt = db.sqlite.prepare(`
      INSERT INTO restocks (ingredient_id, previous_percentage, new_percentage, authorized_by, shift_id)
      VALUES (?, ?, ?, ?, ?)
    `);

    const authInfo = authorized_rut
      ? `${authorizedName} (${authorized_rut})`
      : authorizedName;

    restockStmt.run(id, ingredient.current_percentage, finalPercentage, authInfo, shift_id || null);

    // Register movement in inventory_movements
    const movementStmt = db.sqlite.prepare(`
      INSERT INTO inventory_movements (
        ingredient_id, movement_type, quantity_before, quantity_after,
        quantity_change, reason, shift_id, authorized_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const quantityChange = finalQuantity - (ingredient.current_quantity || 0);
    movementStmt.run(
      id,
      'restock',
      ingredient.current_quantity || 0,
      finalQuantity,
      quantityChange,
      added_quantity ? `Reposición de ${added_quantity} ${ingredient.unit}` : 'Reposición desde bodega',
      shift_id || null,
      authInfo
    );

    // Update ingredient
    const updateStmt = db.sqlite.prepare(`
      UPDATE ingredients SET current_percentage = ?, current_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);

    updateStmt.run(finalPercentage, finalQuantity, id);

    const updated = db.sqlite.prepare('SELECT * FROM ingredients WHERE id = ?').get(id);

    // Emit update via socket
    const io = req.app.get('io');
    io.emit('ingredient:restocked', updated);
    io.emit('ingredient:updated', updated);

    res.json(updated);
  } catch (error) {
    console.error('Error restocking ingredient:', error);
    res.status(500).json({ error: 'Error al restoquear ingrediente' });
  }
});

// GET restock history
router.get('/:id/restocks', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const restocks = db.sqlite.prepare(`
      SELECT r.*, i.name as ingredient_name
      FROM restocks r
      JOIN ingredients i ON r.ingredient_id = i.id
      WHERE r.ingredient_id = ?
      ORDER BY r.timestamp DESC
      LIMIT 50
    `).all(id);

    res.json(restocks);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial de restoqueos' });
  }
});

// DELETE ingredient
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const stmt = db.sqlite.prepare('DELETE FROM ingredients WHERE id = ?');
    stmt.run(id);

    // Emit update via socket
    const io = req.app.get('io');
    io.emit('ingredient:deleted', { id });

    res.json({ message: 'Ingrediente eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar ingrediente' });
  }
});

// Helper function to check and create alerts
function checkAndCreateAlert(ingredient: Ingredient, io: any) {
  const percentage = ingredient.current_percentage;

  // Check if there's already an unresolved alert for this ingredient
  const existingAlert = db.sqlite.prepare(`
    SELECT * FROM alerts
    WHERE ingredient_id = ? AND resolved = 0
  `).get(ingredient.id);

  if (existingAlert) return;

  let alertType: 'critical' | 'warning' | null = null;
  let message = '';

  if (percentage <= ingredient.critical_threshold) {
    alertType = 'critical';
    message = `¡CRÍTICO! ${ingredient.name} está al ${percentage}% (umbral: ${ingredient.critical_threshold}%)`;
  } else if (percentage <= ingredient.warning_threshold) {
    alertType = 'warning';
    message = `Advertencia: ${ingredient.name} está al ${percentage}% (umbral: ${ingredient.warning_threshold}%)`;
  }

  if (alertType) {
    const stmt = db.sqlite.prepare(`
      INSERT INTO alerts (type, message, ingredient_id, priority)
      VALUES (?, ?, ?, ?)
    `);

    const priority = alertType === 'critical' ? 3 : 2;
    const result = stmt.run(alertType, message, ingredient.id, priority);

    const newAlert = db.sqlite.prepare('SELECT * FROM alerts WHERE id = ?').get(result.lastInsertRowid);
    io.emit('alert:created', newAlert);
  }
}

export default router;
