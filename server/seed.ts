import { db } from './database/db.js';

console.log('🌱 Inicializando base de datos con datos de ejemplo...');

// Initialize database first
db.initialize();

// Clear existing data (except users)
console.log('Limpiando datos existentes...');
db.sqlite.exec('DELETE FROM sales');
db.sqlite.exec('DELETE FROM shift_tasks');
db.sqlite.exec('DELETE FROM shifts');
db.sqlite.exec('DELETE FROM recipe_ingredients');
db.sqlite.exec('DELETE FROM recipes');
db.sqlite.exec('DELETE FROM restocks');
db.sqlite.exec('DELETE FROM alerts');
db.sqlite.exec('DELETE FROM ingredients');
db.sqlite.exec('DELETE FROM weekly_achievements');

// Reset autoincrement
db.sqlite.exec('DELETE FROM sqlite_sequence');

// Create sample users (if they don't exist)
console.log('Creando usuarios de ejemplo...');
const users = [
  { rut: '22222222-2', name: 'Juan Pérez', role: 'empleado' },
  { rut: '33333333-3', name: 'María González', role: 'empleado' },
  { rut: '44444444-4', name: 'Carlos Rodríguez', role: 'chef' },
];

for (const user of users) {
  const exists = db.sqlite.prepare('SELECT * FROM users WHERE rut = ?').get(user.rut);
  if (!exists) {
    const password = user.rut.replace(/[^0-9]/g, '').substring(0, 4);
    db.sqlite.prepare(`
      INSERT INTO users (rut, password, name, role)
      VALUES (?, ?, ?, ?)
    `).run(user.rut, password, user.name, user.role);
  }
}

console.log('✅ Usuarios creados\n');

// Ingredientes
console.log('Creando ingredientes...');
const ingredients = [
  // Proteínas
  { name: 'Pepperoni', unit: 'kg', category: 'proteínas', critical: 30, warning: 60 },
  { name: 'Jamón', unit: 'kg', category: 'proteínas', critical: 30, warning: 60 },
  { name: 'Salchicha italiana', unit: 'kg', category: 'proteínas', critical: 30, warning: 60 },
  { name: 'Pollo', unit: 'kg', category: 'proteínas', critical: 30, warning: 60 },
  { name: 'Tocino', unit: 'kg', category: 'proteínas', critical: 30, warning: 60 },

  // Vegetales
  { name: 'Champiñones', unit: 'kg', category: 'vegetales', critical: 40, warning: 70 },
  { name: 'Pimientos', unit: 'kg', category: 'vegetales', critical: 40, warning: 70 },
  { name: 'Cebolla', unit: 'kg', category: 'vegetales', critical: 40, warning: 70 },
  { name: 'Tomate', unit: 'kg', category: 'vegetales', critical: 40, warning: 70 },
  { name: 'Aceitunas', unit: 'kg', category: 'vegetales', critical: 50, warning: 75 },
  { name: 'Albahaca fresca', unit: 'manojos', category: 'vegetales', critical: 50, warning: 75 },

  // Lácteos
  { name: 'Mozzarella', unit: 'kg', category: 'lácteos', critical: 20, warning: 50 },
  { name: 'Parmesano', unit: 'kg', category: 'lácteos', critical: 40, warning: 70 },
  { name: 'Queso azul', unit: 'kg', category: 'lácteos', critical: 50, warning: 75 },

  // Bases
  { name: 'Masa de pizza', unit: 'unidades', category: 'bases', critical: 20, warning: 50 },
  { name: 'Salsa de tomate', unit: 'L', category: 'bases', critical: 30, warning: 60 },
  { name: 'Aceite de oliva', unit: 'L', category: 'bases', critical: 40, warning: 70 },

  // Otros
  { name: 'Orégano', unit: 'g', category: 'condimentos', critical: 50, warning: 75 },
  { name: 'Ajo', unit: 'kg', category: 'condimentos', critical: 50, warning: 75 },
];

const ingredientStmt = db.sqlite.prepare(`
  INSERT INTO ingredients (name, unit, category, critical_threshold, warning_threshold, current_percentage)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const ingredientIds: { [key: string]: number } = {};

for (const ing of ingredients) {
  const result = ingredientStmt.run(
    ing.name,
    ing.unit,
    ing.category,
    ing.critical,
    ing.warning,
    Math.floor(Math.random() * 50) + 50 // Random percentage between 50-100
  );
  ingredientIds[ing.name] = Number(result.lastInsertRowid);
}

console.log(`✅ ${ingredients.length} ingredientes creados`);

// Recetas - Pizzas
console.log('Creando recetas...');
const recipes = [
  {
    name: 'Margarita',
    type: 'pizza',
    ingredients: [
      { name: 'Masa de pizza', qty: 1 },
      { name: 'Salsa de tomate', qty: 0.15 },
      { name: 'Mozzarella', qty: 0.2 },
      { name: 'Albahaca fresca', qty: 0.5 },
      { name: 'Aceite de oliva', qty: 0.02 },
    ],
  },
  {
    name: 'Pepperoni',
    type: 'pizza',
    ingredients: [
      { name: 'Masa de pizza', qty: 1 },
      { name: 'Salsa de tomate', qty: 0.15 },
      { name: 'Mozzarella', qty: 0.2 },
      { name: 'Pepperoni', qty: 0.1 },
    ],
  },
  {
    name: 'Hawaiana',
    type: 'pizza',
    ingredients: [
      { name: 'Masa de pizza', qty: 1 },
      { name: 'Salsa de tomate', qty: 0.15 },
      { name: 'Mozzarella', qty: 0.2 },
      { name: 'Jamón', qty: 0.1 },
    ],
  },
  {
    name: 'Cuatro Quesos',
    type: 'pizza',
    ingredients: [
      { name: 'Masa de pizza', qty: 1 },
      { name: 'Salsa de tomate', qty: 0.1 },
      { name: 'Mozzarella', qty: 0.15 },
      { name: 'Parmesano', qty: 0.05 },
      { name: 'Queso azul', qty: 0.05 },
    ],
  },
  {
    name: 'Vegetariana',
    type: 'pizza',
    ingredients: [
      { name: 'Masa de pizza', qty: 1 },
      { name: 'Salsa de tomate', qty: 0.15 },
      { name: 'Mozzarella', qty: 0.2 },
      { name: 'Champiñones', qty: 0.1 },
      { name: 'Pimientos', qty: 0.08 },
      { name: 'Cebolla', qty: 0.05 },
      { name: 'Aceitunas', qty: 0.05 },
    ],
  },
  {
    name: 'BBQ Chicken',
    type: 'pizza',
    ingredients: [
      { name: 'Masa de pizza', qty: 1 },
      { name: 'Salsa de tomate', qty: 0.1 },
      { name: 'Mozzarella', qty: 0.2 },
      { name: 'Pollo', qty: 0.15 },
      { name: 'Cebolla', qty: 0.05 },
    ],
  },
  {
    name: 'Suprema',
    type: 'pizza',
    ingredients: [
      { name: 'Masa de pizza', qty: 1 },
      { name: 'Salsa de tomate', qty: 0.15 },
      { name: 'Mozzarella', qty: 0.2 },
      { name: 'Pepperoni', qty: 0.08 },
      { name: 'Salchicha italiana', qty: 0.08 },
      { name: 'Champiñones', qty: 0.08 },
      { name: 'Pimientos', qty: 0.06 },
      { name: 'Cebolla', qty: 0.05 },
    ],
  },
  // Tablas
  {
    name: 'Tabla de Quesos',
    type: 'tabla',
    ingredients: [
      { name: 'Mozzarella', qty: 0.15 },
      { name: 'Parmesano', qty: 0.1 },
      { name: 'Queso azul', qty: 0.1 },
    ],
  },
  {
    name: 'Tabla Mixta',
    type: 'tabla',
    ingredients: [
      { name: 'Jamón', qty: 0.15 },
      { name: 'Salchicha italiana', qty: 0.1 },
      { name: 'Mozzarella', qty: 0.1 },
      { name: 'Aceitunas', qty: 0.08 },
    ],
  },
];

const recipeStmt = db.sqlite.prepare(`
  INSERT INTO recipes (name, type) VALUES (?, ?)
`);

const recipeIngStmt = db.sqlite.prepare(`
  INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity)
  VALUES (?, ?, ?)
`);

for (const recipe of recipes) {
  const result = recipeStmt.run(recipe.name, recipe.type);
  const recipeId = Number(result.lastInsertRowid);

  for (const ing of recipe.ingredients) {
    recipeIngStmt.run(recipeId, ingredientIds[ing.name], ing.qty);
  }
}

console.log(`✅ ${recipes.length} recetas creadas`);

console.log('');
console.log('✅ Base de datos poblada exitosamente!');
console.log('');
console.log('Puedes iniciar el servidor con: npm run dev');
