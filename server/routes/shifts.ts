import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';
import { Shift, ShiftTask } from '../types/index.js';

const router = Router();

// Default tasks for all shifts (22 tasks total)
const DEFAULT_TASKS = [
  // Apertura (4)
  'Encender todos los equipos (hornos, refrigeradores)',
  'Verificar temperatura de refrigeradores y congeladores',
  'Revisar inventario de ingredientes críticos',
  'Preparar estaciones de trabajo',
  // Preparación (8)
  'Preparar masas del día',
  'Cortar vegetales frescos',
  'Preparar salsas',
  'Organizar ingredientes en estaciones',
  'Preparar quesos (rallar, porcionar)',
  'Preparar carnes y embutidos',
  'Verificar stock de cajas y empaques',
  'Preparar ingredientes especiales del día',
  // Limpieza (4)
  'Limpiar y desinfectar superficies de trabajo',
  'Limpiar equipos de cocina',
  'Barrer y trapear pisos',
  'Sacar basura',
  // Seguridad e Higiene (4)
  'Verificar fecha de vencimiento de productos',
  'Lavar y desinfectar contenedores de ingredientes',
  'Revisar que todo el personal tenga uniforme limpio',
  'Verificar botiquín de primeros auxilios',
  // Organización (2)
  'Revisar stock de bebidas',
  'Verificar suministros de limpieza',
];

// GET all shifts
router.get('/', (req: Request, res: Response) => {
  try {
    const { date, status } = req.query;

    let query = 'SELECT * FROM shifts';
    const params: any[] = [];
    const conditions: string[] = [];

    if (date) {
      conditions.push('date = ?');
      params.push(date);
    }

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY date DESC, type';

    const shifts = db.sqlite.prepare(query).all(...params);

    // Get tasks for each shift
    const shiftsWithTasks = shifts.map((shift: any) => {
      const tasks = db.sqlite.prepare('SELECT * FROM shift_tasks WHERE shift_id = ?').all(shift.id);
      return { ...shift, tasks };
    });

    res.json(shiftsWithTasks);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener turnos' });
  }
});

// GET current open shift
router.get('/current', (req: Request, res: Response) => {
  try {
    const shift = db.sqlite.prepare(`
      SELECT * FROM shifts
      WHERE status = 'open'
      ORDER BY start_time DESC
      LIMIT 1
    `).get();

    if (!shift) {
      return res.json(null);
    }

    const tasks = db.sqlite.prepare('SELECT * FROM shift_tasks WHERE shift_id = ?').all((shift as any).id);

    res.json({ ...shift, tasks });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener turno actual' });
  }
});

// POST create shift
router.post('/', (req: Request, res: Response) => {
  try {
    const { date, type, employee_name, mise_en_place } = req.body;

    // Check if there's already an open shift
    const openShift = db.sqlite.prepare('SELECT * FROM shifts WHERE status = ?').get('open');

    if (openShift) {
      return res.status(400).json({ error: 'Ya hay un turno abierto. Ciérralo antes de abrir uno nuevo.' });
    }

    const stmt = db.sqlite.prepare(`
      INSERT INTO shifts (date, type, employee_name, start_time)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `);

    const result = stmt.run(date, type, employee_name);
    const shiftId = result.lastInsertRowid;

    // Add default tasks (all 22 tasks, starting unchecked)
    const taskStmt = db.sqlite.prepare(`
      INSERT INTO shift_tasks (shift_id, task_name, completed)
      VALUES (?, ?, 0)
    `);

    for (const task of DEFAULT_TASKS) {
      taskStmt.run(shiftId, task);
    }

    // Initialize mise en place for this shift
    if (mise_en_place && Array.isArray(mise_en_place)) {
      const miseStmt = db.sqlite.prepare(`
        INSERT INTO shift_mise_en_place (shift_id, ingredient_id, initial_quantity, current_quantity, unit)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const item of mise_en_place) {
        miseStmt.run(
          shiftId,
          item.ingredient_id,
          item.quantity,
          item.quantity,
          item.unit
        );
      }
    }

    const newShift = db.sqlite.prepare('SELECT * FROM shifts WHERE id = ?').get(shiftId);
    const shiftTasks = db.sqlite.prepare('SELECT * FROM shift_tasks WHERE shift_id = ?').all(shiftId);
    const shiftMise = db.sqlite.prepare('SELECT * FROM shift_mise_en_place WHERE shift_id = ?').all(shiftId);

    const completeShift = { ...newShift, tasks: shiftTasks, mise_en_place: shiftMise };

    // Emit update via socket
    const io = req.app.get('io');
    io.emit('shift:opened', completeShift);

    res.status(201).json(completeShift);
  } catch (error) {
    console.error('Error creating shift:', error);
    res.status(500).json({ error: 'Error al crear turno' });
  }
});

// PUT close shift
router.put('/:id/close', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { closed_by } = req.body;

    if (!closed_by) {
      return res.status(400).json({ error: 'Se requiere el nombre del responsable que cierra el turno' });
    }

    // Check if all critical tasks are done and mise en place is sufficient
    const shift = db.sqlite.prepare('SELECT * FROM shifts WHERE id = ?').get(id) as Shift;

    if (!shift) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    if (shift.status === 'closed') {
      return res.status(400).json({ error: 'El turno ya está cerrado' });
    }

    // Get mise en place settings
    const settings = db.sqlite.prepare('SELECT * FROM mise_en_place_settings LIMIT 1').get() as any;
    const minClosePercentage = settings?.min_close_percentage || 80;

    // Check mise en place levels for this shift
    const miseEnPlace = db.sqlite.prepare(`
      SELECT
        smp.*,
        i.name as ingredient_name,
        (smp.current_quantity * 100.0 / smp.initial_quantity) as percentage
      FROM shift_mise_en_place smp
      JOIN ingredients i ON smp.ingredient_id = i.id
      WHERE smp.shift_id = ?
    `).all(id) as any[];

    const lowIngredients = miseEnPlace.filter((item: any) => item.percentage < minClosePercentage);

    if (lowIngredients.length > 0) {
      return res.status(400).json({
        error: `No puedes cerrar el turno. Los siguientes ingredientes están por debajo del ${minClosePercentage}%:`,
        low_ingredients: lowIngredients.map((item: any) => ({
          name: item.ingredient_name,
          percentage: Math.round(item.percentage),
          current: item.current_quantity,
          initial: item.initial_quantity,
          unit: item.unit
        }))
      });
    }

    // Generate shift report
    // Get total sales
    const salesData = db.sqlite.prepare(`
      SELECT COUNT(*) as count, SUM(s.quantity) as total_quantity
      FROM sales s
      WHERE s.shift_id = ?
    `).get(id) as any;

    // Get ingredients used
    const ingredientsUsed = db.sqlite.prepare(`
      SELECT
        i.name,
        smp.initial_quantity - smp.current_quantity as used_quantity,
        smp.unit
      FROM shift_mise_en_place smp
      JOIN ingredients i ON smp.ingredient_id = i.id
      WHERE smp.shift_id = ? AND (smp.initial_quantity - smp.current_quantity) > 0
    `).all(id) as any[];

    // Get alerts generated during shift
    const alertsCount = db.sqlite.prepare(`
      SELECT COUNT(*) as count
      FROM alerts
      WHERE datetime(created_at) >= datetime((SELECT start_time FROM shifts WHERE id = ?))
        AND datetime(created_at) <= datetime('now')
    `).get(id) as any;

    // Get checklist completion
    const checklistCompletion = db.sqlite.prepare(`
      SELECT * FROM shift_checklist_completion WHERE shift_id = ?
    `).get(id) as any;

    // Close the shift
    const stmt = db.sqlite.prepare(`
      UPDATE shifts
      SET status = 'closed', end_time = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(id);

    // Save shift report
    const reportStmt = db.sqlite.prepare(`
      INSERT INTO shift_reports (
        shift_id, total_sales, ingredients_used, alerts_generated,
        checklist_completion, closed_by, closed_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    reportStmt.run(
      id,
      salesData?.total_quantity || 0,
      JSON.stringify(ingredientsUsed),
      alertsCount?.count || 0,
      checklistCompletion ? JSON.stringify(checklistCompletion) : null,
      closed_by
    );

    const updated = db.sqlite.prepare('SELECT * FROM shifts WHERE id = ?').get(id);
    const tasks = db.sqlite.prepare('SELECT * FROM shift_tasks WHERE shift_id = ?').all(id);
    const report = db.sqlite.prepare('SELECT * FROM shift_reports WHERE shift_id = ?').get(id);

    const completeShift = { ...updated, tasks, report };

    // Update weekly achievements
    updateWeeklyAchievements(shift.employee_name, tasks);

    // Emit update via socket
    const io = req.app.get('io');
    io.emit('shift:closed', completeShift);

    res.json({
      shift: completeShift,
      report: {
        total_sales: salesData?.total_quantity || 0,
        ingredients_used: ingredientsUsed,
        alerts_generated: alertsCount?.count || 0,
        checklist_completion: checklistCompletion,
        closed_by,
        message: `Turno cerrado exitosamente. Se vendieron ${salesData?.total_quantity || 0} pizzas.`
      }
    });
  } catch (error) {
    console.error('Error closing shift:', error);
    res.status(500).json({ error: 'Error al cerrar turno' });
  }
});

// PUT update task completion
router.put('/:shiftId/tasks/:taskId', (req: Request, res: Response) => {
  try {
    const { shiftId, taskId } = req.params;
    const { completed } = req.body;

    const stmt = db.sqlite.prepare(`
      UPDATE shift_tasks
      SET completed = ?, completed_at = ${completed ? 'CURRENT_TIMESTAMP' : 'NULL'}
      WHERE id = ? AND shift_id = ?
    `);

    stmt.run(completed ? 1 : 0, taskId, shiftId);

    const updated = db.sqlite.prepare('SELECT * FROM shift_tasks WHERE id = ?').get(taskId);

    // Emit update via socket
    const io = req.app.get('io');
    io.emit('task:updated', updated);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar tarea' });
  }
});

// GET mise en place status for current shift
router.get('/current/mise-en-place', (req: Request, res: Response) => {
  try {
    const shift = db.sqlite.prepare(`
      SELECT * FROM shifts
      WHERE status = 'open'
      ORDER BY start_time DESC
      LIMIT 1
    `).get() as any;

    if (!shift) {
      return res.status(404).json({ error: 'No hay turno abierto' });
    }

    const miseEnPlace = db.sqlite.prepare(`
      SELECT
        smp.*,
        i.name as ingredient_name,
        i.category,
        (smp.current_quantity * 100.0 / smp.initial_quantity) as percentage
      FROM shift_mise_en_place smp
      JOIN ingredients i ON smp.ingredient_id = i.id
      WHERE smp.shift_id = ?
      ORDER BY i.category, i.name
    `).all(shift.id);

    // Add color status based on percentage
    const miseWithStatus = (miseEnPlace as any[]).map((item: any) => {
      let status = 'green';
      if (item.percentage < 30) status = 'red';
      else if (item.percentage < 50) status = 'orange';
      else if (item.percentage < 70) status = 'yellow';

      return {
        ...item,
        status,
        percentage: Math.round(item.percentage)
      };
    });

    res.json({
      shift_id: shift.id,
      mise_en_place: miseWithStatus
    });
  } catch (error) {
    console.error('Error getting mise en place status:', error);
    res.status(500).json({ error: 'Error al obtener estado del mise en place' });
  }
});

// POST calculate initial mise en place based on settings
router.post('/calculate-mise-en-place', (req: Request, res: Response) => {
  try {
    // Get settings
    const settings = db.sqlite.prepare('SELECT * FROM mise_en_place_settings LIMIT 1').get() as any;
    const basePizzaCount = settings?.base_pizza_count || 20;

    // Get all recipes with their ingredients
    const recipes = db.sqlite.prepare(`
      SELECT r.*, ri.ingredient_id, ri.quantity, i.name as ingredient_name, i.unit
      FROM recipes r
      JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      JOIN ingredients i ON ri.ingredient_id = i.id
      WHERE r.active = 1 AND r.type = 'pizza'
    `).all() as any[];

    // Group by ingredient and sum quantities for base pizza count
    const ingredientMap = new Map<number, any>();

    for (const recipe of recipes) {
      const qty = recipe.quantity * basePizzaCount / recipes.length; // Distribute evenly among all pizzas

      if (ingredientMap.has(recipe.ingredient_id)) {
        const existing = ingredientMap.get(recipe.ingredient_id);
        existing.quantity += qty;
      } else {
        ingredientMap.set(recipe.ingredient_id, {
          ingredient_id: recipe.ingredient_id,
          ingredient_name: recipe.ingredient_name,
          quantity: qty,
          unit: recipe.unit
        });
      }
    }

    const calculatedMiseEnPlace = Array.from(ingredientMap.values());

    res.json({
      base_pizza_count: basePizzaCount,
      mise_en_place: calculatedMiseEnPlace
    });
  } catch (error) {
    console.error('Error calculating mise en place:', error);
    res.status(500).json({ error: 'Error al calcular mise en place' });
  }
});

// PUT restock ingredient in current shift
router.put('/current/mise-en-place/:ingredientId/restock', (req: Request, res: Response) => {
  try {
    const { ingredientId } = req.params;
    const { quantity } = req.body;

    const shift = db.sqlite.prepare(`
      SELECT * FROM shifts
      WHERE status = 'open'
      ORDER BY start_time DESC
      LIMIT 1
    `).get() as any;

    if (!shift) {
      return res.status(404).json({ error: 'No hay turno abierto' });
    }

    const stmt = db.sqlite.prepare(`
      UPDATE shift_mise_en_place
      SET current_quantity = current_quantity + ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE shift_id = ? AND ingredient_id = ?
    `);

    stmt.run(quantity, shift.id, ingredientId);

    const updated = db.sqlite.prepare(`
      SELECT
        smp.*,
        i.name as ingredient_name,
        (smp.current_quantity * 100.0 / smp.initial_quantity) as percentage
      FROM shift_mise_en_place smp
      JOIN ingredients i ON smp.ingredient_id = i.id
      WHERE smp.shift_id = ? AND smp.ingredient_id = ?
    `).get(shift.id, ingredientId);

    // Emit update via socket
    const io = req.app.get('io');
    io.emit('mise:updated', updated);

    res.json(updated);
  } catch (error) {
    console.error('Error restocking ingredient:', error);
    res.status(500).json({ error: 'Error al reponer ingrediente' });
  }
});

// POST sign checklist (requires chef/admin auth)
router.post('/:id/sign-checklist', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rut, password } = req.body;

    if (!rut || !password) {
      return res.status(400).json({ error: 'RUT y contraseña son requeridos' });
    }

    // Verify chef/admin credentials
    const user = db.sqlite.prepare(`
      SELECT * FROM users
      WHERE rut = ? AND password = ? AND role = 'chef' AND active = 1
    `).get(rut, password);

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas o no tienes permisos de Chef/Admin' });
    }

    // Get shift
    const shift = db.sqlite.prepare('SELECT * FROM shifts WHERE id = ?').get(id) as any;

    if (!shift) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    if (shift.checklist_signed) {
      return res.status(400).json({ error: 'El checklist ya fue firmado' });
    }

    // Get all tasks and calculate completion
    const tasks = db.sqlite.prepare('SELECT * FROM shift_tasks WHERE shift_id = ?').all(id) as any[];
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t: any) => t.completed).length;
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const incompleteTasks = tasks.filter((t: any) => !t.completed);

    if (incompleteTasks.length > 0) {
      return res.status(400).json({
        error: 'No se puede firmar el checklist. Hay tareas pendientes.',
        incomplete_tasks: incompleteTasks.map((t: any) => t.task_name)
      });
    }

    // Sign the checklist
    const stmt = db.sqlite.prepare(`
      UPDATE shifts
      SET checklist_signed = 1,
          checklist_signed_by = ?,
          checklist_signed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run((user as any).name, id);

    // Save checklist completion for rewards tracking
    const completionStmt = db.sqlite.prepare(`
      INSERT INTO shift_checklist_completion (shift_id, employee_name, total_tasks, completed_tasks, completion_percentage, signed_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    completionStmt.run(id, shift.employee_name, totalTasks, completedTasks, completionPercentage);

    const updated = db.sqlite.prepare('SELECT * FROM shifts WHERE id = ?').get(id);

    // Emit update via socket
    const io = req.app.get('io');
    io.emit('checklist:signed', updated);

    res.json({
      success: true,
      message: `Checklist firmado por ${(user as any).name} - Completado: ${completionPercentage}%`,
      shift: updated,
      completion: {
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        percentage: completionPercentage
      }
    });
  } catch (error) {
    console.error('Error signing checklist:', error);
    res.status(500).json({ error: 'Error al firmar checklist' });
  }
});

// Helper function to update weekly achievements
function updateWeeklyAchievements(employeeName: string, tasks: any[]) {
  const now = new Date();
  const dayOfWeek = now.getDay();

  // Find Tuesday of current week
  const daysUntilTuesday = (dayOfWeek + 5) % 7;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysUntilTuesday);
  weekStart.setHours(0, 0, 0, 0);

  // Saturday is end of week
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 4);

  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  const completedCount = tasks.filter((t: any) => t.completed === 1).length;
  const totalCount = tasks.length;

  const existing = db.sqlite.prepare(`
    SELECT * FROM weekly_achievements
    WHERE week_start = ? AND employee_name = ?
  `).get(weekStartStr, employeeName);

  if (existing) {
    db.sqlite.prepare(`
      UPDATE weekly_achievements
      SET tasks_completed = tasks_completed + ?, total_tasks = total_tasks + ?
      WHERE week_start = ? AND employee_name = ?
    `).run(completedCount, totalCount, weekStartStr, employeeName);
  } else {
    db.sqlite.prepare(`
      INSERT INTO weekly_achievements (week_start, week_end, employee_name, tasks_completed, total_tasks)
      VALUES (?, ?, ?, ?, ?)
    `).run(weekStartStr, weekEndStr, employeeName, completedCount, totalCount);
  }
}

// GET employee checklist completion history
router.get('/checklist-history/:employee_name', (req: Request, res: Response) => {
  try {
    const { employee_name } = req.params;

    const history = db.sqlite.prepare(`
      SELECT
        scc.*,
        s.date,
        s.type as shift_type,
        s.start_time,
        s.end_time
      FROM shift_checklist_completion scc
      JOIN shifts s ON scc.shift_id = s.id
      WHERE scc.employee_name = ?
      ORDER BY scc.signed_at DESC
      LIMIT 30
    `).all(employee_name);

    // Calculate stats
    const stats = db.sqlite.prepare(`
      SELECT
        COUNT(*) as total_shifts,
        SUM(CASE WHEN completion_percentage = 100 THEN 1 ELSE 0 END) as perfect_completions,
        AVG(completion_percentage) as avg_completion
      FROM shift_checklist_completion
      WHERE employee_name = ?
    `).get(employee_name) as any;

    res.json({
      employee_name,
      history,
      stats: {
        total_shifts: stats?.total_shifts || 0,
        perfect_completions: stats?.perfect_completions || 0,
        avg_completion: Math.round(stats?.avg_completion || 0),
        is_eligible_for_rewards: stats?.perfect_completions > 0
      }
    });
  } catch (error) {
    console.error('Error getting checklist history:', error);
    res.status(500).json({ error: 'Error al obtener historial de checklist' });
  }
});

// GET shift report by ID
router.get('/reports/:shift_id', (req: Request, res: Response) => {
  try {
    const { shift_id } = req.params;

    const report = db.sqlite.prepare(`
      SELECT
        sr.*,
        s.date,
        s.type as shift_type,
        s.employee_name,
        s.start_time,
        s.end_time
      FROM shift_reports sr
      JOIN shifts s ON sr.shift_id = s.id
      WHERE sr.shift_id = ?
    `).get(shift_id);

    if (!report) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    // Parse JSON fields
    const reportData = report as any;
    if (reportData.ingredients_used) {
      reportData.ingredients_used = JSON.parse(reportData.ingredients_used);
    }
    if (reportData.checklist_completion) {
      reportData.checklist_completion = JSON.parse(reportData.checklist_completion);
    }

    res.json(reportData);
  } catch (error) {
    console.error('Error getting shift report:', error);
    res.status(500).json({ error: 'Error al obtener reporte de turno' });
  }
});

// GET all employees eligible for rewards (100% completion)
router.get('/eligible-employees', (req: Request, res: Response) => {
  try {
    const { date } = req.query;

    let query = `
      SELECT DISTINCT
        scc.employee_name,
        COUNT(scc.id) as perfect_shifts,
        AVG(scc.completion_percentage) as avg_completion
      FROM shift_checklist_completion scc
      WHERE scc.completion_percentage = 100
    `;

    const params: any[] = [];

    if (date) {
      query += ` AND EXISTS (
        SELECT 1 FROM shifts s
        WHERE s.id = scc.shift_id AND s.date = ?
      )`;
      params.push(date);
    }

    query += ' GROUP BY scc.employee_name ORDER BY perfect_shifts DESC';

    const eligibleEmployees = db.sqlite.prepare(query).all(...params);

    res.json(eligibleEmployees);
  } catch (error) {
    console.error('Error getting eligible employees:', error);
    res.status(500).json({ error: 'Error al obtener empleados elegibles' });
  }
});

export default router;
