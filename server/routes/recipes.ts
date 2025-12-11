import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';
import { Recipe, RecipeIngredient } from '../types/index.js';

const router = Router();

// GET all recipes
router.get('/', (req: Request, res: Response) => {
  try {
    const recipes = db.sqlite.prepare(`
      SELECT * FROM recipes
      WHERE active = 1
      ORDER BY type, name
    `).all();

    // Get ingredients for each recipe
    const recipesWithIngredients = recipes.map((recipe: any) => {
      const ingredients = db.sqlite.prepare(`
        SELECT ri.*, i.name as ingredient_name, i.unit as ingredient_unit, i.category as ingredient_category
        FROM recipe_ingredients ri
        JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE ri.recipe_id = ?
      `).all(recipe.id);

      // Extract sauces from ingredients
      const sauces = ingredients
        .filter((ing: any) => ing.ingredient_category === 'salsas')
        .map((ing: any) => ing.ingredient_name);

      return { ...recipe, ingredients, sauces };
    });

    res.json(recipesWithIngredients);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener recetas' });
  }
});

// GET recipe by id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const recipe = db.sqlite.prepare('SELECT * FROM recipes WHERE id = ?').get(id);

    if (!recipe) {
      return res.status(404).json({ error: 'Receta no encontrada' });
    }

    const ingredients = db.sqlite.prepare(`
      SELECT ri.*, i.name as ingredient_name, i.unit as ingredient_unit
      FROM recipe_ingredients ri
      JOIN ingredients i ON ri.ingredient_id = i.id
      WHERE ri.recipe_id = ?
    `).all(id);

    res.json({ ...recipe, ingredients });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener receta' });
  }
});

// POST create recipe
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, type, size, ingredients } = req.body;

    // Validaciones
    if (!name || !type) {
      return res.status(400).json({ error: 'Nombre y tipo son requeridos' });
    }

    if (!ingredients || ingredients.length === 0) {
      return res.status(400).json({ error: 'La receta debe tener al menos un ingrediente' });
    }

    // Validar cantidades positivas
    for (const ing of ingredients) {
      if (ing.quantity <= 0) {
        return res.status(400).json({ error: 'Las cantidades deben ser mayores a 0' });
      }
    }

    const stmt = db.sqlite.prepare(`
      INSERT INTO recipes (name, type, size)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(name, type, size || null);
    const recipeId = result.lastInsertRowid;

    // Add ingredients
    if (ingredients && ingredients.length > 0) {
      const ingredientStmt = db.sqlite.prepare(`
        INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity)
        VALUES (?, ?, ?)
      `);

      for (const ing of ingredients) {
        ingredientStmt.run(recipeId, ing.ingredient_id, ing.quantity);
      }
    }

    const newRecipe = db.sqlite.prepare('SELECT * FROM recipes WHERE id = ?').get(recipeId);
    const recipeIngredients = db.sqlite.prepare(`
      SELECT ri.*, i.name as ingredient_name, i.unit as ingredient_unit
      FROM recipe_ingredients ri
      JOIN ingredients i ON ri.ingredient_id = i.id
      WHERE ri.recipe_id = ?
    `).all(recipeId);

    const completeRecipe = { ...newRecipe, ingredients: recipeIngredients };

    // Emit update via socket
    const io = req.app.get('io');
    io.emit('recipe:created', completeRecipe);

    res.status(201).json(completeRecipe);
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      res.status(400).json({ error: 'La receta ya existe' });
    } else {
      res.status(500).json({ error: 'Error al crear receta' });
    }
  }
});

// PUT update recipe
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type, size, ingredients } = req.body;

    // Validar que la receta existe
    const existingRecipe = db.sqlite.prepare('SELECT * FROM recipes WHERE id = ?').get(id);
    if (!existingRecipe) {
      return res.status(404).json({ error: 'Receta no encontrada' });
    }

    // Validaciones
    if (!name || !type) {
      return res.status(400).json({ error: 'Nombre y tipo son requeridos' });
    }

    if (!ingredients || ingredients.length === 0) {
      return res.status(400).json({ error: 'La receta debe tener al menos un ingrediente' });
    }

    // Validar cantidades positivas
    for (const ing of ingredients) {
      if (ing.quantity <= 0) {
        return res.status(400).json({ error: 'Las cantidades deben ser mayores a 0' });
      }
    }

    // Update recipe
    const stmt = db.sqlite.prepare(`
      UPDATE recipes
      SET name = ?, type = ?, size = ?
      WHERE id = ?
    `);

    stmt.run(name, type, size || null, id);

    // Delete old ingredients
    db.sqlite.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?').run(id);

    // Add new ingredients
    if (ingredients && ingredients.length > 0) {
      const ingredientStmt = db.sqlite.prepare(`
        INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity)
        VALUES (?, ?, ?)
      `);

      for (const ing of ingredients) {
        ingredientStmt.run(id, ing.ingredient_id, ing.quantity);
      }
    }

    const updated = db.sqlite.prepare('SELECT * FROM recipes WHERE id = ?').get(id);
    const recipeIngredients = db.sqlite.prepare(`
      SELECT ri.*, i.name as ingredient_name, i.unit as ingredient_unit
      FROM recipe_ingredients ri
      JOIN ingredients i ON ri.ingredient_id = i.id
      WHERE ri.recipe_id = ?
    `).all(id);

    const completeRecipe = { ...updated, ingredients: recipeIngredients };

    // Emit update via socket
    const io = req.app.get('io');
    io.emit('recipe:updated', completeRecipe);

    res.json(completeRecipe);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar receta' });
  }
});

// DELETE recipe (soft delete)
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const stmt = db.sqlite.prepare('UPDATE recipes SET active = 0 WHERE id = ?');
    stmt.run(id);

    // Emit update via socket
    const io = req.app.get('io');
    io.emit('recipe:deleted', { id });

    res.json({ message: 'Receta desactivada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar receta' });
  }
});

export default router;
