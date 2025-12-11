import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/pizza.db');
const sqlite = new Database(dbPath);

// Enable foreign keys
sqlite.pragma('foreign_keys = ON');

const initialize = () => {
  // Tabla de usuarios
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rut TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('empleado', 'chef')),
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )
  `);

  // Crear usuario admin por defecto si no existe
  const adminExists = sqlite.prepare('SELECT * FROM users WHERE rut = ?').get('11111111-1');
  if (!adminExists) {
    sqlite.prepare(`
      INSERT INTO users (rut, password, name, role)
      VALUES (?, ?, ?, ?)
    `).run('11111111-1', '1111', 'Administrador', 'chef');
  }

  // Tabla de ingredientes
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      unit TEXT NOT NULL,
      current_percentage INTEGER DEFAULT 100,
      critical_threshold INTEGER DEFAULT 50,
      warning_threshold INTEGER DEFAULT 80,
      category TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de recetas (pizzas y tablas)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('pizza', 'tabla')),
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de ingredientes por receta
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL,
      ingredient_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
      UNIQUE(recipe_id, ingredient_id)
    )
  `);

  // Tabla de turnos
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('AM', 'PM')),
      employee_name TEXT NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      status TEXT DEFAULT 'open' CHECK(status IN ('open', 'closed')),
      checklist_signed INTEGER DEFAULT 0,
      checklist_signed_by TEXT,
      checklist_signed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de checklist de tareas por turno
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS shift_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_id INTEGER NOT NULL,
      task_name TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      completed_at DATETIME,
      FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
    )
  `);

  // Tabla de ventas
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_id INTEGER NOT NULL,
      recipe_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    )
  `);

  // Tabla de alertas
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('critical', 'warning', 'info', 'suggestion')),
      message TEXT NOT NULL,
      ingredient_id INTEGER,
      priority INTEGER DEFAULT 1,
      resolved INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
    )
  `);

  // Tabla de restoqueos (restock)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS restocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_id INTEGER NOT NULL,
      previous_percentage INTEGER NOT NULL,
      new_percentage INTEGER NOT NULL,
      authorized_by TEXT NOT NULL,
      shift_id INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
      FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL
    )
  `);

  // Tabla de gamificación (tracking semanal)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS weekly_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start DATE NOT NULL,
      week_end DATE NOT NULL,
      employee_name TEXT NOT NULL,
      tasks_completed INTEGER DEFAULT 0,
      total_tasks INTEGER DEFAULT 0,
      premio TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(week_start, employee_name)
    )
  `);

  // Tabla de premios/recompensas
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT DEFAULT '🎁',
      active INTEGER DEFAULT 1,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de configuración de mise en place
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS mise_en_place_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      base_pizza_count INTEGER DEFAULT 20,
      size_l_percentage INTEGER DEFAULT 60,
      size_m_percentage INTEGER DEFAULT 25,
      size_s_percentage INTEGER DEFAULT 15,
      min_close_percentage INTEGER DEFAULT 80,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insertar configuración por defecto si no existe
  const settingsExists = sqlite.prepare('SELECT * FROM mise_en_place_settings').get();
  if (!settingsExists) {
    sqlite.prepare(`
      INSERT INTO mise_en_place_settings (base_pizza_count, size_l_percentage, size_m_percentage, size_s_percentage, min_close_percentage)
      VALUES (20, 60, 25, 15, 80)
    `).run();
  }

  // Tabla de mise en place por turno (snapshot inicial del turno)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS shift_mise_en_place (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_id INTEGER NOT NULL,
      ingredient_id INTEGER NOT NULL,
      initial_quantity REAL NOT NULL,
      current_quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
      UNIQUE(shift_id, ingredient_id)
    )
  `);

  // Migración: Recrear tabla recipes sin UNIQUE constraint en name
  try {
    // Verificar si necesitamos migrar
    const tableInfo = sqlite.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='recipes'").get() as any;

    if (tableInfo && tableInfo.sql.includes('name TEXT NOT NULL UNIQUE')) {
      console.log('🔄 Migrando tabla recipes para permitir nombres duplicados con diferentes tamaños...');

      // Backup de datos existentes
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS recipes_backup AS SELECT * FROM recipes;
        DROP TABLE recipes;

        CREATE TABLE recipes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('pizza', 'tabla')),
          size TEXT CHECK(size IN ('S', 'M', 'L')),
          active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(name, size, type)
        );

        INSERT INTO recipes (id, name, type, active, created_at)
        SELECT id, name, type, active, created_at FROM recipes_backup;

        DROP TABLE recipes_backup;
      `);

      console.log('✅ Tabla recipes migrada correctamente');
    }
  } catch (error) {
    console.error('Error en migración de recipes:', error);
  }

  // Migración: Agregar size a recipes si no existe
  try {
    const columns = sqlite.pragma('table_info(recipes)');
    const hasSize = columns.some((col: any) => col.name === 'size');
    if (!hasSize) {
      sqlite.exec(`ALTER TABLE recipes ADD COLUMN size TEXT CHECK(size IN ('S', 'M', 'L'))`);
      console.log('✅ Campo size agregado a la tabla recipes');
    }
  } catch (error) {
    console.error('Error agregando size:', error);
  }

  // Migración: Agregar total_quantity si no existe
  try {
    const columns = sqlite.pragma('table_info(ingredients)');
    const hasTotal = columns.some((col: any) => col.name === 'total_quantity');
    if (!hasTotal) {
      sqlite.exec(`ALTER TABLE ingredients ADD COLUMN total_quantity REAL DEFAULT 1000`);
      console.log('✅ Campo total_quantity agregado a la tabla ingredients');
    }
  } catch (error) {
    console.error('Error en migración de total_quantity:', error);
  }

  // Migración: Agregar current_quantity si no existe
  try {
    const columns = sqlite.pragma('table_info(ingredients)');
    const hasCurrent = columns.some((col: any) => col.name === 'current_quantity');
    if (!hasCurrent) {
      sqlite.exec(`ALTER TABLE ingredients ADD COLUMN current_quantity REAL DEFAULT 1000`);
      console.log('✅ Campo current_quantity agregado a la tabla ingredients');
    }
  } catch (error) {
    console.error('Error en migración de current_quantity:', error);
  }

  // Migración: Agregar campos de firma de checklist a shifts
  try {
    const columns = sqlite.pragma('table_info(shifts)');
    const hasChecklistSigned = columns.some((col: any) => col.name === 'checklist_signed');
    if (!hasChecklistSigned) {
      sqlite.exec(`
        ALTER TABLE shifts ADD COLUMN checklist_signed INTEGER DEFAULT 0;
        ALTER TABLE shifts ADD COLUMN checklist_signed_by TEXT;
        ALTER TABLE shifts ADD COLUMN checklist_signed_at DATETIME;
      `);
      console.log('✅ Campos de firma de checklist agregados a la tabla shifts');
    }
  } catch (error) {
    console.error('Error en migración de checklist_signed:', error);
  }

  // Tabla de completion de checklist para tracking de premios
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS shift_checklist_completion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_id INTEGER NOT NULL,
      employee_name TEXT NOT NULL,
      total_tasks INTEGER NOT NULL,
      completed_tasks INTEGER NOT NULL,
      completion_percentage INTEGER NOT NULL,
      signed_at DATETIME NOT NULL,
      FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
    )
  `);

  // Tabla de reportes de cierre de turno
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS shift_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_id INTEGER NOT NULL UNIQUE,
      total_sales INTEGER NOT NULL,
      total_revenue REAL DEFAULT 0,
      ingredients_used TEXT,
      alerts_generated INTEGER DEFAULT 0,
      checklist_completion TEXT,
      closed_by TEXT NOT NULL,
      closed_at DATETIME NOT NULL,
      FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
    )
  `);

  // Migración: Eliminar ingrediente "Pomodoro o crema" si existe
  try {
    const pomodoroOCrema = sqlite.prepare(`
      SELECT id FROM ingredients WHERE name = 'Pomodoro o crema'
    `).get() as any;

    if (pomodoroOCrema) {
      console.log('🔄 Eliminando ingrediente obsoleto "Pomodoro o crema"...');

      // Primero eliminar referencias en recipe_ingredients
      const deleteRecipeIngs = sqlite.prepare(`
        DELETE FROM recipe_ingredients WHERE ingredient_id = ?
      `).run(pomodoroOCrema.id);

      console.log(`  - Eliminadas ${deleteRecipeIngs.changes} referencias en recetas`);

      // Luego eliminar el ingrediente
      const deleteIng = sqlite.prepare(`
        DELETE FROM ingredients WHERE id = ?
      `).run(pomodoroOCrema.id);

      console.log(`✅ Ingrediente "Pomodoro o crema" eliminado correctamente`);
    }
  } catch (error) {
    console.error('Error eliminando "Pomodoro o crema":', error);
  }

  // Migración: Agregar Crema como opción a Pizza Verde
  try {
    const verdeNeedsCrema = sqlite.prepare(`
      SELECT COUNT(*) as count
      FROM recipes r
      WHERE r.name = 'Verde'
      AND NOT EXISTS (
        SELECT 1 FROM recipe_ingredients ri
        WHERE ri.recipe_id = r.id AND ri.ingredient_id = 131
      )
    `).get() as any;

    if (verdeNeedsCrema && verdeNeedsCrema.count > 0) {
      console.log('🔄 Agregando Crema como opción de salsa a Pizza Verde...');

      const stmt = sqlite.prepare(`
        INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity)
        SELECT
            r.id,
            131 as ingredient_id,
            CASE
                WHEN r.size = 'L' THEN 100.0
                WHEN r.size = 'M' THEN 100.0
                WHEN r.size = 'S' THEN 50.0
            END as quantity
        FROM recipes r
        WHERE r.name = 'Verde'
        AND NOT EXISTS (
            SELECT 1 FROM recipe_ingredients ri
            WHERE ri.recipe_id = r.id AND ri.ingredient_id = 131
        )
      `);

      const result = stmt.run();
      console.log(`✅ Crema agregada a ${result.changes} recetas de Pizza Verde`);
    }
  } catch (error) {
    console.error('Error en migración de Pizza Verde:', error);
  }

  // Tabla de movimientos de inventario (tracking detallado)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_id INTEGER NOT NULL,
      movement_type TEXT NOT NULL CHECK(movement_type IN ('restock', 'consumption', 'adjustment', 'waste')),
      quantity_before REAL NOT NULL,
      quantity_after REAL NOT NULL,
      quantity_change REAL NOT NULL,
      reason TEXT,
      shift_id INTEGER,
      authorized_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
      FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL
    )
  `);

  // Tabla de metas de empleados
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS employee_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_name TEXT NOT NULL,
      goal_type TEXT NOT NULL CHECK(goal_type IN ('checklist_completion', 'shift_count', 'custom')),
      target_value REAL NOT NULL,
      current_value REAL DEFAULT 0,
      period TEXT NOT NULL CHECK(period IN ('daily', 'weekly', 'monthly')),
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      reward_id INTEGER,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'failed', 'cancelled')),
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE SET NULL
    )
  `);

  // Tabla de reportes mensuales (precalculados para performance)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS monthly_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      total_sales INTEGER DEFAULT 0,
      total_restocks INTEGER DEFAULT 0,
      avg_inventory_level REAL DEFAULT 0,
      critical_alerts_count INTEGER DEFAULT 0,
      employees_count INTEGER DEFAULT 0,
      best_employee TEXT,
      report_data TEXT,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(year, month)
    )
  `);

  // Tabla de historial de premios ganados
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS rewards_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_name TEXT NOT NULL,
      reward_id INTEGER,
      reward_title TEXT NOT NULL,
      reward_description TEXT,
      reward_icon TEXT,
      points_earned INTEGER DEFAULT 0,
      reason TEXT NOT NULL,
      week_start DATE,
      awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      claimed INTEGER DEFAULT 0,
      claimed_at DATETIME,
      FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE SET NULL
    )
  `);

  // Tabla de puntos de empleados
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS employee_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_name TEXT NOT NULL UNIQUE,
      total_points INTEGER DEFAULT 0,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de insignias/badges
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      requirement_type TEXT NOT NULL CHECK(requirement_type IN ('completion_rate', 'streak', 'total_tasks', 'rewards_count', 'perfect_weeks')),
      requirement_value INTEGER NOT NULL,
      points_value INTEGER DEFAULT 50,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de insignias ganadas por empleados
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS employee_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_name TEXT NOT NULL,
      badge_id INTEGER NOT NULL,
      earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
      UNIQUE(employee_name, badge_id)
    )
  `);

  // Insertar badges por defecto si no existen
  const badgeExists = sqlite.prepare('SELECT COUNT(*) as count FROM badges').get() as any;
  if (badgeExists.count === 0) {
    const insertBadge = sqlite.prepare(`
      INSERT INTO badges (name, description, icon, requirement_type, requirement_value, points_value)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertBadge.run('Perfeccionista', '100% completitud 3 semanas seguidas', '⭐', 'perfect_weeks', 3, 100);
    insertBadge.run('Racha de Fuego', '7 días consecutivos con tareas completas', '🔥', 'streak', 7, 75);
    insertBadge.run('Veterano', '50 turnos completados', '🏆', 'total_tasks', 50, 150);
    insertBadge.run('Coleccionista', '10 premios ganados', '🎁', 'rewards_count', 10, 200);
    insertBadge.run('Maestro', '95% o más de completitud promedio', '👑', 'completion_rate', 95, 125);

    console.log('✅ Badges por defecto creados');
  }

  console.log('✅ Base de datos inicializada correctamente');
};

export const db = {
  sqlite,
  initialize,
};
