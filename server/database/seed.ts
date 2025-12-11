import { db } from './db.js';

/**
 * Script de precarga de datos para Pizza Waddington
 * Basado en el diseño de referencia del cliente
 */

export const seedDatabase = () => {
  console.log('🌱 Iniciando precarga de datos...');

  // Verificar si las tablas existen
  try {
    // Limpiar datos existentes (solo en desarrollo)
    db.sqlite.exec('DELETE FROM recipe_ingredients');
    db.sqlite.exec('DELETE FROM recipes WHERE id > 0');
    db.sqlite.exec('DELETE FROM ingredients WHERE id > 0');

    // Resetear autoincrement
    db.sqlite.exec('DELETE FROM sqlite_sequence WHERE name IN ("recipes", "ingredients", "recipe_ingredients")');
  } catch (error) {
    console.error('Error limpiando datos:', error);
  }

  // INGREDIENTES BASE
  const ingredients = [
    // Quesos
    { name: 'Queso Mozzarella', unit: 'g', category: 'quesos' },
    { name: 'Queso Parmesano', unit: 'g', category: 'quesos' },
    { name: 'Queso Cheddar', unit: 'g', category: 'quesos' },
    { name: 'Queso Azul', unit: 'g', category: 'quesos' },
    { name: 'Queso Cabra', unit: 'g', category: 'quesos' },

    // Proteínas/Carnes
    { name: 'Pepperoni', unit: 'g', category: 'proteínas' },
    { name: 'Jamón', unit: 'g', category: 'proteínas' },
    { name: 'Salame', unit: 'g', category: 'proteínas' },
    { name: 'Chorizo', unit: 'g', category: 'proteínas' },
    { name: 'Tocino', unit: 'g', category: 'proteínas' },
    { name: 'Pollo', unit: 'g', category: 'proteínas' },
    { name: 'Carne Molida', unit: 'g', category: 'proteínas' },
    { name: 'Salchicha Italiana', unit: 'g', category: 'proteínas' },

    // Vegetales
    { name: 'Tomate', unit: 'g', category: 'vegetales' },
    { name: 'Cebolla', unit: 'g', category: 'vegetales' },
    { name: 'Pimiento Rojo', unit: 'g', category: 'vegetales' },
    { name: 'Pimiento Verde', unit: 'g', category: 'vegetales' },
    { name: 'Champiñones', unit: 'g', category: 'vegetales' },
    { name: 'Aceitunas Negras', unit: 'g', category: 'vegetales' },
    { name: 'Aceitunas Verdes', unit: 'g', category: 'vegetales' },
    { name: 'Albahaca', unit: 'g', category: 'vegetales' },
    { name: 'Rúcula', unit: 'g', category: 'vegetales' },
    { name: 'Espinaca', unit: 'g', category: 'vegetales' },
    { name: 'Jalapeños', unit: 'g', category: 'vegetales' },
    { name: 'Ajo', unit: 'g', category: 'vegetales' },

    // Bases y Salsas
    { name: 'Masa Pizza', unit: 'g', category: 'masas' },
    { name: 'Salsa de Tomate', unit: 'ml', category: 'salsas' },
    { name: 'Salsa BBQ', unit: 'ml', category: 'salsas' },
    { name: 'Salsa Blanca', unit: 'ml', category: 'salsas' },
    { name: 'Aceite de Oliva', unit: 'ml', category: 'salsas' },
    { name: 'Orégano', unit: 'g', category: 'especias' },

    // Otros
    { name: 'Piña', unit: 'g', category: 'frutas' },
    { name: 'Maíz', unit: 'g', category: 'vegetales' },
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

  // PIZZAS SEGÚN TAMAÑOS
  // Cantidades base por tamaño (en gramos):
  // S (Individual): Masa 200g, Queso 150g, Salsa 80ml, Ingredientes reducidos 30%
  // M (Mediana): Masa 300g, Queso 250g, Salsa 120ml, Ingredientes estándar
  // L (Familiar): Masa 450g, Queso 400g, Salsa 180ml, Ingredientes aumentados 50%

  interface RecipeDefinition {
    name: string;
    type: 'pizza' | 'tabla';
    size?: 'S' | 'M' | 'L';
    ingredients: { [key: string]: number }; // Cantidades para tamaño M
  }

  const recipes: RecipeDefinition[] = [
    // PIZZAS CLÁSICAS
    {
      name: 'Margarita',
      type: 'pizza',
      size: 'M',
      ingredients: {
        'Masa Pizza': 300,
        'Salsa de Tomate': 120,
        'Queso Mozzarella': 250,
        'Albahaca': 10,
        'Aceite de Oliva': 15,
      }
    },
    {
      name: 'Pepperoni',
      type: 'pizza',
      size: 'M',
      ingredients: {
        'Masa Pizza': 300,
        'Salsa de Tomate': 120,
        'Queso Mozzarella': 250,
        'Pepperoni': 120,
        'Orégano': 5,
      }
    },
    {
      name: 'Hawaiana',
      type: 'pizza',
      size: 'M',
      ingredients: {
        'Masa Pizza': 300,
        'Salsa de Tomate': 120,
        'Queso Mozzarella': 250,
        'Jamón': 100,
        'Piña': 120,
      }
    },
    {
      name: 'Cuatro Quesos',
      type: 'pizza',
      size: 'M',
      ingredients: {
        'Masa Pizza': 300,
        'Salsa Blanca': 100,
        'Queso Mozzarella': 100,
        'Queso Parmesano': 60,
        'Queso Cheddar': 60,
        'Queso Azul': 30,
      }
    },
    {
      name: 'Vegetariana',
      type: 'pizza',
      size: 'M',
      ingredients: {
        'Masa Pizza': 300,
        'Salsa de Tomate': 120,
        'Queso Mozzarella': 200,
        'Pimiento Rojo': 60,
        'Pimiento Verde': 60,
        'Cebolla': 50,
        'Champiñones': 80,
        'Aceitunas Negras': 40,
        'Tomate': 60,
      }
    },
    {
      name: 'BBQ Chicken',
      type: 'pizza',
      size: 'M',
      ingredients: {
        'Masa Pizza': 300,
        'Salsa BBQ': 120,
        'Queso Mozzarella': 250,
        'Pollo': 180,
        'Cebolla': 50,
        'Tocino': 60,
      }
    },
    {
      name: 'Suprema',
      type: 'pizza',
      size: 'M',
      ingredients: {
        'Masa Pizza': 300,
        'Salsa de Tomate': 120,
        'Queso Mozzarella': 250,
        'Pepperoni': 60,
        'Salchicha Italiana': 60,
        'Pimiento Verde': 50,
        'Cebolla': 50,
        'Champiñones': 60,
        'Aceitunas Negras': 40,
      }
    },
    {
      name: 'Napolitana',
      type: 'pizza',
      size: 'M',
      ingredients: {
        'Masa Pizza': 300,
        'Salsa de Tomate': 120,
        'Queso Mozzarella': 200,
        'Tomate': 100,
        'Ajo': 10,
        'Albahaca': 15,
        'Aceite de Oliva': 20,
      }
    },
    {
      name: 'Carnívora',
      type: 'pizza',
      size: 'M',
      ingredients: {
        'Masa Pizza': 300,
        'Salsa de Tomate': 120,
        'Queso Mozzarella': 250,
        'Pepperoni': 60,
        'Jamón': 60,
        'Tocino': 60,
        'Chorizo': 60,
        'Salchicha Italiana': 60,
      }
    },
    {
      name: 'Mexicana',
      type: 'pizza',
      size: 'M',
      ingredients: {
        'Masa Pizza': 300,
        'Salsa de Tomate': 120,
        'Queso Mozzarella': 250,
        'Carne Molida': 150,
        'Jalapeños': 50,
        'Cebolla': 50,
        'Tomate': 60,
        'Maíz': 50,
      }
    },

    // TABLAS
    {
      name: 'Tabla de Quesos',
      type: 'tabla',
      ingredients: {
        'Queso Mozzarella': 150,
        'Queso Parmesano': 100,
        'Queso Cheddar': 100,
        'Queso Cabra': 80,
        'Aceitunas Verdes': 60,
        'Aceitunas Negras': 60,
      }
    },
    {
      name: 'Tabla Mixta',
      type: 'tabla',
      ingredients: {
        'Jamón': 150,
        'Salame': 100,
        'Queso Mozzarella': 100,
        'Queso Cheddar': 100,
        'Aceitunas Negras': 60,
        'Tomate': 80,
      }
    },
  ];

  const recipeStmt = db.sqlite.prepare(`
    INSERT INTO recipes (name, type, size, active)
    VALUES (?, ?, ?, 1)
  `);

  const recipeIngredientStmt = db.sqlite.prepare(`
    INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity)
    VALUES (?, ?, ?)
  `);

  let pizzaCount = 0;
  let tablaCount = 0;

  for (const recipe of recipes) {
    const result = recipeStmt.run(recipe.name, recipe.type, recipe.size || null);
    const recipeId = Number(result.lastInsertRowid);

    // Agregar ingredientes
    for (const [ingredientName, quantity] of Object.entries(recipe.ingredients)) {
      const ingredientId = ingredientIds[ingredientName];
      if (ingredientId) {
        recipeIngredientStmt.run(recipeId, ingredientId, quantity);
      } else {
        console.warn(`⚠️  Ingrediente no encontrado: ${ingredientName}`);
      }
    }

    if (recipe.type === 'pizza') pizzaCount++;
    else tablaCount++;
  }

  console.log(`✅ ${pizzaCount} pizzas creadas`);
  console.log(`✅ ${tablaCount} tablas creadas`);
  console.log('🎉 Precarga completada exitosamente!');
};

// Ejecutar si se corre directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  db.initialize();
  seedDatabase();
}
