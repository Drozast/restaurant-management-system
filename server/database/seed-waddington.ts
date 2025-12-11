import { db } from './db.js';

/**
 * Script de precarga con datos EXACTOS de gramajes_pizzas.xlsx
 * Pizza Waddington - Mise en Place
 */

export const seedWaddingtonData = () => {
  console.log('🍕 Cargando datos de Pizza Waddington...');

  // Limpiar datos existentes
  try {
    db.sqlite.exec('DELETE FROM recipe_ingredients');
    db.sqlite.exec('DELETE FROM recipes WHERE id > 0');
    db.sqlite.exec('DELETE FROM ingredients WHERE id > 0');
    db.sqlite.exec('DELETE FROM sqlite_sequence WHERE name IN ("recipes", "ingredients", "recipe_ingredients")');
  } catch (error) {
    console.log('Limpiando datos...');
  }

  // INGREDIENTES (extraídos del Excel)
  const ingredients = [
    // Quesos
    { name: 'Mozzarella', unit: 'g', category: 'quesos' },
    { name: 'Queso azul', unit: 'g', category: 'quesos' },
    { name: 'Queso de cabra', unit: 'g', category: 'quesos' },
    { name: 'Provoleta', unit: 'g', category: 'quesos' },

    // Carnes y Embutidos
    { name: 'Pollo', unit: 'g', category: 'proteínas' },
    { name: 'Tocino', unit: 'g', category: 'proteínas' },
    { name: 'Camarón', unit: 'g', category: 'proteínas' },
    { name: 'Jamón serrano', unit: 'g', category: 'proteínas' },
    { name: 'Pepperoni', unit: 'g', category: 'proteínas' },
    { name: 'Carne', unit: 'g', category: 'proteínas' },
    { name: 'Jamón artesanal', unit: 'g', category: 'proteínas' },
    { name: 'Salame', unit: 'g', category: 'proteínas' },

    // Verduras
    { name: 'Cebolla morada', unit: 'g', category: 'vegetales' },
    { name: 'Rúcula (opc.)', unit: 'g', category: 'vegetales' },
    { name: 'Cebolla caramelizada', unit: 'g', category: 'vegetales' },
    { name: 'Champiñones', unit: 'g', category: 'vegetales' },
    { name: 'Pimentones', unit: 'g', category: 'vegetales' },
    { name: 'Aceitunas', unit: 'g', category: 'vegetales' },
    { name: 'Choclo', unit: 'g', category: 'vegetales' },
    { name: 'Tomates cherry', unit: 'g', category: 'vegetales' },

    // Salsas y Bases
    { name: 'Salsa BBQ', unit: 'ml', category: 'salsas' },
    { name: 'Aceite de oliva', unit: 'ml', category: 'salsas' },
    { name: 'Pomodoro', unit: 'ml', category: 'salsas' },
    { name: 'Crema', unit: 'ml', category: 'salsas' },
    { name: 'Pesto', unit: 'ml', category: 'salsas' },
    { name: 'Pomodoro o crema', unit: 'ml', category: 'salsas' },

    // Masas (medidas en unidades)
    { name: 'Masa Grande (L)', unit: 'unidades', category: 'masas' },
    { name: 'Masa Mediana (M)', unit: 'unidades', category: 'masas' },
    { name: 'Masa Pequeña (S)', unit: 'unidades', category: 'masas' },
  ];

  const ingredientStmt = db.sqlite.prepare(`
    INSERT INTO ingredients (name, unit, current_percentage, critical_threshold, warning_threshold, category)
    VALUES (?, ?, 100, 30, 70, ?)
  `);

  const ingredientIds: { [key: string]: number } = {};

  for (const ing of ingredients) {
    const result = ingredientStmt.run(ing.name, ing.unit, ing.category);
    ingredientIds[ing.name] = Number(result.lastInsertRowid);
  }

  console.log(`✅ ${ingredients.length} ingredientes creados`);

  // PIZZAS CON GRAMAJES EXACTOS POR TAMAÑO
  interface PizzaRecipe {
    name: string;
    size: 'S' | 'M' | 'L';
    ingredients: { [key: string]: number };
  }

  const pizzasBySize: PizzaRecipe[] = [
    // TEXANA
    { name: 'Texana', size: 'L', ingredients: { 'Mozzarella': 250, 'Pollo': 100, 'Tocino': 100, 'Cebolla morada': 30, 'Salsa BBQ': 160, 'Masa Grande (L)': 1 } },
    { name: 'Texana', size: 'M', ingredients: { 'Mozzarella': 200, 'Pollo': 70, 'Tocino': 70, 'Cebolla morada': 30, 'Salsa BBQ': 100, 'Masa Mediana (M)': 1 } },
    { name: 'Texana', size: 'S', ingredients: { 'Mozzarella': 150, 'Pollo': 50, 'Tocino': 50, 'Cebolla morada': 30, 'Salsa BBQ': 50, 'Masa Pequeña (S)': 1 } },

    // QUATTRO FORMAGGI
    { name: 'Quattro Formaggi', size: 'L', ingredients: { 'Mozzarella': 250, 'Queso azul': 50, 'Queso de cabra': 50, 'Provoleta': 50, 'Aceite de oliva': 20, 'Pomodoro': 100, 'Masa Grande (L)': 1 } },
    { name: 'Quattro Formaggi', size: 'M', ingredients: { 'Mozzarella': 200, 'Queso azul': 30, 'Queso de cabra': 30, 'Provoleta': 30, 'Aceite de oliva': 10, 'Pomodoro': 100, 'Masa Mediana (M)': 1 } },
    { name: 'Quattro Formaggi', size: 'S', ingredients: { 'Mozzarella': 150, 'Queso azul': 20, 'Queso de cabra': 20, 'Provoleta': 20, 'Aceite de oliva': 10, 'Pomodoro': 50, 'Masa Pequeña (S)': 1 } },

    // MAR Y TIERRA
    { name: 'Mar y Tierra', size: 'L', ingredients: { 'Camarón': 80, 'Jamón serrano': 35, 'Rúcula (opc.)': 20, 'Pomodoro': 100, 'Masa Grande (L)': 1 } },
    { name: 'Mar y Tierra', size: 'M', ingredients: { 'Camarón': 60, 'Jamón serrano': 25, 'Rúcula (opc.)': 20, 'Pomodoro': 100, 'Masa Mediana (M)': 1 } },
    { name: 'Mar y Tierra', size: 'S', ingredients: { 'Camarón': 40, 'Jamón serrano': 15, 'Rúcula (opc.)': 20, 'Pomodoro': 50, 'Masa Pequeña (S)': 1 } },

    // PEPPERONI
    { name: 'Pepperoni', size: 'L', ingredients: { 'Mozzarella': 300, 'Pepperoni': 150, 'Pomodoro': 100, 'Masa Grande (L)': 1 } },
    { name: 'Pepperoni', size: 'M', ingredients: { 'Mozzarella': 250, 'Pepperoni': 100, 'Pomodoro': 100, 'Masa Mediana (M)': 1 } },
    { name: 'Pepperoni', size: 'S', ingredients: { 'Mozzarella': 150, 'Pepperoni': 100, 'Pomodoro': 50, 'Masa Pequeña (S)': 1 } },

    // WADDINGTON
    { name: 'Waddington', size: 'L', ingredients: { 'Carne': 100, 'Jamón artesanal': 60, 'Salame': 60, 'Mozzarella': 250, 'Pomodoro': 100, 'Masa Grande (L)': 1 } },
    { name: 'Waddington', size: 'M', ingredients: { 'Carne': 60, 'Jamón artesanal': 40, 'Salame': 40, 'Mozzarella': 200, 'Pomodoro': 100, 'Masa Mediana (M)': 1 } },
    { name: 'Waddington', size: 'S', ingredients: { 'Carne': 30, 'Jamón artesanal': 20, 'Salame': 20, 'Mozzarella': 150, 'Pomodoro': 50, 'Masa Pequeña (S)': 1 } },

    // PANCETTA A LA CREMA
    { name: 'Pancetta a la Crema', size: 'L', ingredients: { 'Crema': 100, 'Cebolla caramelizada': 80, 'Tocino': 80, 'Mozzarella': 250, 'Masa Grande (L)': 1 } },
    { name: 'Pancetta a la Crema', size: 'M', ingredients: { 'Crema': 100, 'Cebolla caramelizada': 60, 'Tocino': 60, 'Mozzarella': 200, 'Masa Mediana (M)': 1 } },
    { name: 'Pancetta a la Crema', size: 'S', ingredients: { 'Crema': 50, 'Cebolla caramelizada': 30, 'Tocino': 30, 'Mozzarella': 150, 'Masa Pequeña (S)': 1 } },

    // VEGETARIANA
    { name: 'Vegetariana', size: 'L', ingredients: { 'Pomodoro': 100, 'Champiñones': 50, 'Pimentones': 50, 'Pesto': 50, 'Aceitunas': 50, 'Choclo': 50, 'Mozzarella': 250, 'Masa Grande (L)': 1 } },
    { name: 'Vegetariana', size: 'M', ingredients: { 'Pomodoro': 100, 'Champiñones': 30, 'Pimentones': 30, 'Pesto': 30, 'Aceitunas': 30, 'Choclo': 30, 'Mozzarella': 200, 'Masa Mediana (M)': 1 } },
    { name: 'Vegetariana', size: 'S', ingredients: { 'Pomodoro': 50, 'Champiñones': 20, 'Pimentones': 20, 'Pesto': 20, 'Aceitunas': 20, 'Choclo': 20, 'Mozzarella': 150, 'Masa Pequeña (S)': 1 } },

    // VERDE
    { name: 'Verde', size: 'L', ingredients: { 'Pomodoro o crema': 100, 'Jamón serrano': 80, 'Rúcula (opc.)': 30, 'Masa Grande (L)': 1 } },
    { name: 'Verde', size: 'M', ingredients: { 'Pomodoro o crema': 100, 'Jamón serrano': 60, 'Rúcula (opc.)': 20, 'Masa Mediana (M)': 1 } },
    { name: 'Verde', size: 'S', ingredients: { 'Pomodoro o crema': 50, 'Jamón serrano': 40, 'Rúcula (opc.)': 10, 'Masa Pequeña (S)': 1 } },

    // MARGARITA
    { name: 'Margarita', size: 'L', ingredients: { 'Pomodoro': 100, 'Mozzarella': 250, 'Tomates cherry': 100, 'Pesto': 50, 'Masa Grande (L)': 1 } },
    { name: 'Margarita', size: 'M', ingredients: { 'Pomodoro': 100, 'Mozzarella': 200, 'Tomates cherry': 80, 'Pesto': 30, 'Masa Mediana (M)': 1 } },
    { name: 'Margarita', size: 'S', ingredients: { 'Pomodoro': 50, 'Mozzarella': 150, 'Tomates cherry': 60, 'Pesto': 20, 'Masa Pequeña (S)': 1 } },

    // LA CLÁSICA
    { name: 'La Clásica', size: 'L', ingredients: { 'Pomodoro': 100, 'Mozzarella': 250, 'Masa Grande (L)': 1 } },
    { name: 'La Clásica', size: 'M', ingredients: { 'Pomodoro': 100, 'Mozzarella': 200, 'Masa Mediana (M)': 1 } },
    { name: 'La Clásica', size: 'S', ingredients: { 'Pomodoro': 50, 'Mozzarella': 150, 'Masa Pequeña (S)': 1 } },
  ];

  const recipeStmt = db.sqlite.prepare(`
    INSERT INTO recipes (name, type, size, active)
    VALUES (?, 'pizza', ?, 1)
  `);

  const recipeIngredientStmt = db.sqlite.prepare(`
    INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity)
    VALUES (?, ?, ?)
  `);

  let pizzaCount = 0;

  for (const pizza of pizzasBySize) {
    const result = recipeStmt.run(pizza.name, pizza.size);
    const recipeId = Number(result.lastInsertRowid);

    // Agregar ingredientes
    for (const [ingredientName, quantity] of Object.entries(pizza.ingredients)) {
      const ingredientId = ingredientIds[ingredientName];
      if (ingredientId) {
        recipeIngredientStmt.run(recipeId, ingredientId, quantity);
      } else {
        console.warn(`⚠️  Ingrediente no encontrado: ${ingredientName}`);
      }
    }

    pizzaCount++;
  }

  console.log(`✅ ${pizzaCount} recetas de pizzas creadas (${pizzaCount/3} pizzas × 3 tamaños)`);
  console.log('🎉 Datos de Pizza Waddington cargados exitosamente!');
};

// Ejecutar si se corre directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  db.initialize();
  seedWaddingtonData();
}
