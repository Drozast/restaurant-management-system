import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';
import { Sale, RecipeIngredient, Ingredient } from '../types/index.js';

const router = Router();

// GET all sales
router.get('/', (req: Request, res: Response) => {
  try {
    const { shift_id, date } = req.query;

    let query = `
      SELECT s.*, r.name as recipe_name, r.type as recipe_type
      FROM sales s
      JOIN recipes r ON s.recipe_id = r.id
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    if (shift_id) {
      conditions.push('s.shift_id = ?');
      params.push(shift_id);
    }

    if (date) {
      conditions.push('DATE(s.timestamp) = ?');
      params.push(date);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY s.timestamp DESC';

    const sales = db.sqlite.prepare(query).all(...params);
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

// POST register sale
router.post('/', (req: Request, res: Response) => {
  try {
    const { shift_id, recipe_id, quantity, selected_sauces } = req.body;

    // Get recipe name for error messages
    const recipe = db.sqlite.prepare('SELECT name FROM recipes WHERE id = ?').get(recipe_id) as any;

    // Get recipe ingredients with their quantities
    let recipeIngredients = db.sqlite.prepare(`
      SELECT ri.*, i.name, i.unit, i.current_quantity, i.total_quantity, i.current_percentage, i.category
      FROM recipe_ingredients ri
      JOIN ingredients i ON ri.ingredient_id = i.id
      WHERE ri.recipe_id = ?
    `).all(recipe_id) as any[];

    // If selected_sauces is provided, filter out sauces not selected
    if (selected_sauces && selected_sauces.length > 0) {
      recipeIngredients = recipeIngredients.filter((ing: any) => {
        if (ing.category === 'salsas') {
          return selected_sauces.includes(ing.name);
        }
        return true; // Keep all non-sauce ingredients
      });
    }

    // Validate ingredient availability BEFORE making any changes
    const missingIngredients: string[] = [];
    const lowIngredients: string[] = [];

    for (const ing of recipeIngredients) {
      const totalRequired = ing.quantity * quantity;
      const currentQuantity = ing.current_quantity || 0;
      const percentage = ing.current_percentage || 0;

      // Check if ingredient is completely out of stock
      if (currentQuantity <= 0 || currentQuantity < totalRequired) {
        missingIngredients.push(ing.name);
      }
      // Check if ingredient is running low (20% or less) but still available
      else if (percentage <= 20) {
        lowIngredients.push(`${ing.name} (${percentage}% restante)`);
      }
    }

    // If any ingredients are missing, reject the sale
    if (missingIngredients.length > 0) {
      return res.status(400).json({
        error: `No se puede vender ${recipe.name}: falta ${missingIngredients.join(', ')}`,
        type: 'missing_ingredients',
        ingredients: missingIngredients
      });
    }

    // If ingredients are low but available, include warning in response
    let warning = null;
    if (lowIngredients.length > 0) {
      warning = `⚠️ Ingredientes bajos: ${lowIngredients.join(', ')}`;
    }

    // Update mise en place for current shift (deduct ingredients)
    const updateMiseStmt = db.sqlite.prepare(`
      UPDATE shift_mise_en_place
      SET current_quantity = current_quantity - ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE shift_id = ? AND ingredient_id = ?
    `);

    const io = req.app.get('io');

    for (const ing of recipeIngredients) {
      const totalDeduction = ing.quantity * quantity;
      updateMiseStmt.run(totalDeduction, shift_id, ing.ingredient_id);

      // Also update the main ingredients table (Inventario Real)
      const ingredient = db.sqlite.prepare('SELECT * FROM ingredients WHERE id = ?').get(ing.ingredient_id) as any;

      if (ingredient) {
        // Deduct from current_quantity
        const newCurrentQuantity = Math.max(0, (ingredient.current_quantity || 0) - totalDeduction);
        const newPercentage = ingredient.total_quantity > 0
          ? Math.round((newCurrentQuantity / ingredient.total_quantity) * 100)
          : 0;

        db.sqlite.prepare(`
          UPDATE ingredients
          SET current_quantity = ?,
              current_percentage = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(newCurrentQuantity, newPercentage, ing.ingredient_id);

        // Get updated ingredient for socket emission
        const updatedIngredient = db.sqlite.prepare('SELECT * FROM ingredients WHERE id = ?').get(ing.ingredient_id);
        io.emit('ingredient:updated', updatedIngredient);

        // Check if alert needed for main inventory
        checkAndCreateAlert(updatedIngredient as Ingredient, io);
      }

      // Get updated mise en place status
      const updatedMise = db.sqlite.prepare(`
        SELECT
          smp.*,
          i.name as ingredient_name,
          (smp.current_quantity * 100.0 / smp.initial_quantity) as percentage
        FROM shift_mise_en_place smp
        JOIN ingredients i ON smp.ingredient_id = i.id
        WHERE smp.shift_id = ? AND smp.ingredient_id = ?
      `).get(shift_id, ing.ingredient_id) as any;

      if (updatedMise) {
        // Add color status
        let status = 'green';
        if (updatedMise.percentage < 30) status = 'red';
        else if (updatedMise.percentage < 50) status = 'orange';
        else if (updatedMise.percentage < 70) status = 'yellow';

        updatedMise.status = status;
        updatedMise.percentage = Math.round(updatedMise.percentage);

        // Emit real-time update
        io.emit('mise:updated', updatedMise);

        // Create alert if needed
        if (updatedMise.percentage <= 50) {
          const alertType = updatedMise.percentage <= 30 ? 'critical' : 'warning';
          const message = `${updatedMise.ingredient_name} está al ${updatedMise.percentage}% en el mise en place`;

          const existingAlert = db.sqlite.prepare(`
            SELECT * FROM alerts
            WHERE ingredient_id = ? AND resolved = 0 AND message LIKE ?
          `).get(ing.ingredient_id, `%${updatedMise.percentage}%`);

          if (!existingAlert) {
            const alertStmt = db.sqlite.prepare(`
              INSERT INTO alerts (type, message, ingredient_id, priority)
              VALUES (?, ?, ?, ?)
            `);
            const priority = alertType === 'critical' ? 3 : 2;
            const alertResult = alertStmt.run(alertType, message, ing.ingredient_id, priority);
            const newAlert = db.sqlite.prepare('SELECT * FROM alerts WHERE id = ?').get(alertResult.lastInsertRowid);
            io.emit('alert:created', newAlert);
          }
        }
      }
    }

    // Register sale
    const saleStmt = db.sqlite.prepare(`
      INSERT INTO sales (shift_id, recipe_id, quantity)
      VALUES (?, ?, ?)
    `);

    const result = saleStmt.run(shift_id, recipe_id, quantity);

    const newSale = db.sqlite.prepare(`
      SELECT s.*, r.name as recipe_name, r.type as recipe_type
      FROM sales s
      JOIN recipes r ON s.recipe_id = r.id
      WHERE s.id = ?
    `).get(result.lastInsertRowid);

    io.emit('sale:registered', newSale);

    // Include warning in response if ingredients are low
    const response: any = { sale: newSale };
    if (warning) {
      response.warning = warning;
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Error registering sale:', error);
    res.status(500).json({ error: 'Error al registrar venta' });
  }
});

// GET sales summary by date
router.get('/summary', (req: Request, res: Response) => {
  try {
    const { date } = req.query;

    let query = `
      SELECT
        r.name,
        r.type,
        SUM(s.quantity) as total_quantity,
        COUNT(s.id) as sale_count
      FROM sales s
      JOIN recipes r ON s.recipe_id = r.id
    `;

    const params: any[] = [];

    if (date) {
      query += ' WHERE DATE(s.timestamp) = ?';
      params.push(date);
    }

    query += ' GROUP BY r.id ORDER BY total_quantity DESC';

    const summary = db.sqlite.prepare(query).all(...params);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener resumen de ventas' });
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
