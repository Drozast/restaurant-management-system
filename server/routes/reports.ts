import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';
import { generatePerformancePDF, generateMonthlyPDF } from '../utils/pdfGenerator.js';

const router = Router();

// DEBUG endpoint to check ingredient thresholds
router.get('/debug-ingredients', (req: Request, res: Response) => {
  try {
    const ingredients = db.sqlite.prepare(`
      SELECT
        id,
        name,
        current_percentage,
        warning_threshold,
        critical_threshold,
        (current_percentage <= warning_threshold) as should_appear
      FROM ingredients
      WHERE name IN ('Camarón', 'Pomodoro', 'Mozzarella', 'Pepperoni', 'Champiñones')
      ORDER BY current_percentage ASC
    `).all();

    res.json(ingredients);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en debug' });
  }
});

// DEBUG endpoint to test shopping list query step by step
router.get('/debug-shopping-list', (req: Request, res: Response) => {
  try {
    const result: any = { steps: {} };

    // Step 1: Get low ingredients
    try {
      const lowIngredients = db.sqlite.prepare(`
        SELECT
          i.id,
          i.name,
          i.unit,
          COALESCE(i.current_percentage, 0) as current_percentage,
          COALESCE(i.critical_threshold, 50) as critical_threshold,
          COALESCE(i.warning_threshold, 80) as warning_threshold,
          i.category,
          COALESCE(i.current_quantity, 0) as current_quantity,
          COALESCE(i.total_quantity, 1000) as total_quantity,
          (100 - COALESCE(i.current_percentage, 0)) as needed_percentage
        FROM ingredients i
        WHERE COALESCE(i.current_percentage, 0) <= COALESCE(i.warning_threshold, 80)
        ORDER BY COALESCE(i.current_percentage, 0) ASC
      `).all();
      result.steps.lowIngredients = { success: true, count: lowIngredients.length, data: lowIngredients };
    } catch (error: any) {
      result.steps.lowIngredients = { success: false, error: error.message };
      return res.json(result);
    }

    // Step 2: Get sales data
    try {
      const salesQuery = `
        SELECT
          ri.ingredient_id,
          i.name as ingredient_name,
          SUM(s.quantity * ri.quantity) as total_consumed
        FROM sales s
        JOIN recipe_ingredients ri ON s.recipe_id = ri.recipe_id
        JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE s.timestamp >= datetime('now', '-7 days')
        GROUP BY ri.ingredient_id
      `;
      const salesData = db.sqlite.prepare(salesQuery).all();
      result.steps.salesData = { success: true, count: salesData.length, data: salesData };
    } catch (error: any) {
      result.steps.salesData = { success: false, error: error.message };
      return res.json(result);
    }

    result.success = true;
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET shopping list based on sales and current stock
router.get('/shopping-list', (req: Request, res: Response) => {
  try {
    const { date } = req.query;

    // Get all ingredients that need restocking
    const lowIngredients = db.sqlite.prepare(`
      SELECT
        i.id,
        i.name,
        i.unit,
        COALESCE(i.current_percentage, 0) as current_percentage,
        COALESCE(i.critical_threshold, 50) as critical_threshold,
        COALESCE(i.warning_threshold, 80) as warning_threshold,
        i.category,
        COALESCE(i.current_quantity, 0) as current_quantity,
        COALESCE(i.total_quantity, 1000) as total_quantity,
        (100 - COALESCE(i.current_percentage, 0)) as needed_percentage
      FROM ingredients i
      WHERE COALESCE(i.current_percentage, 0) <= COALESCE(i.warning_threshold, 80)
      ORDER BY COALESCE(i.current_percentage, 0) ASC
    `).all();

    // Get recent sales to predict demand
    let salesQuery = `
      SELECT
        ri.ingredient_id,
        i.name as ingredient_name,
        SUM(s.quantity * ri.quantity) as total_consumed
      FROM sales s
      JOIN recipe_ingredients ri ON s.recipe_id = ri.recipe_id
      JOIN ingredients i ON ri.ingredient_id = i.id
    `;

    const params: any[] = [];

    if (date) {
      salesQuery += ' WHERE DATE(s.timestamp) = ?';
      params.push(date);
    } else {
      // Last 7 days by default
      salesQuery += ' WHERE s.timestamp >= datetime(\'now\', \'-7 days\')';
    }

    salesQuery += ' GROUP BY ri.ingredient_id';

    const salesData = db.sqlite.prepare(salesQuery).all(...params);

    // Combine data
    const shoppingList = lowIngredients.map((ing: any) => {
      const salesInfo = salesData.find((s: any) => s.ingredient_id === ing.id);

      return {
        ...ing,
        total_consumed: salesInfo?.total_consumed || 0,
        priority: ing.current_percentage <= ing.critical_threshold ? 'high' : 'medium'
      };
    });

    res.json(shoppingList);
  } catch (error: any) {
    console.error('Error en shopping-list:', error);
    res.status(500).json({
      error: 'Error al generar lista de compras',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET daily report
router.get('/daily', (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Sales summary
    const sales = db.sqlite.prepare(`
      SELECT
        r.name,
        r.type,
        SUM(s.quantity) as total_quantity,
        COUNT(s.id) as sale_count
      FROM sales s
      JOIN recipes r ON s.recipe_id = r.id
      WHERE DATE(s.timestamp) = ?
      GROUP BY r.id
      ORDER BY total_quantity DESC
    `).all(targetDate);

    // Shifts summary
    const shifts = db.sqlite.prepare(`
      SELECT
        s.*,
        COUNT(st.id) as total_tasks,
        SUM(CASE WHEN st.completed = 1 THEN 1 ELSE 0 END) as completed_tasks
      FROM shifts s
      LEFT JOIN shift_tasks st ON s.id = st.shift_id
      WHERE s.date = ?
      GROUP BY s.id
    `).all(targetDate);

    // Alerts summary
    const alerts = db.sqlite.prepare(`
      SELECT type, COUNT(*) as count
      FROM alerts
      WHERE DATE(created_at) = ? AND resolved = 0
      GROUP BY type
    `).all(targetDate);

    // Low stock ingredients
    const lowStock = db.sqlite.prepare(`
      SELECT name, current_percentage, category
      FROM ingredients
      WHERE current_percentage < critical_threshold
      ORDER BY current_percentage ASC
    `).all();

    res.json({
      date: targetDate,
      sales,
      shifts,
      alerts,
      lowStock
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar reporte diario' });
  }
});

// GET weekly report (Tuesday to Saturday)
router.get('/weekly', (req: Request, res: Response) => {
  try {
    const { week_start } = req.query;

    let weekStartDate: Date;

    if (week_start) {
      weekStartDate = new Date(week_start as string);
    } else {
      // Calculate current week's Tuesday
      const now = new Date();
      const dayOfWeek = now.getDay();
      const daysUntilTuesday = (dayOfWeek + 5) % 7;
      weekStartDate = new Date(now);
      weekStartDate.setDate(now.getDate() - daysUntilTuesday);
    }

    const weekStart = weekStartDate.toISOString().split('T')[0];

    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 4); // Saturday
    const weekEnd = weekEndDate.toISOString().split('T')[0];

    // Sales summary for the week
    const sales = db.sqlite.prepare(`
      SELECT
        DATE(s.timestamp) as date,
        r.name,
        r.type,
        SUM(s.quantity) as total_quantity
      FROM sales s
      JOIN recipes r ON s.recipe_id = r.id
      WHERE DATE(s.timestamp) BETWEEN ? AND ?
      GROUP BY DATE(s.timestamp), r.id
      ORDER BY date, total_quantity DESC
    `).all(weekStart, weekEnd);

    // Employee performance
    const performance = db.sqlite.prepare(`
      SELECT * FROM weekly_achievements
      WHERE week_start = ?
      ORDER BY tasks_completed DESC
    `).all(weekStart);

    // Total shifts
    const shifts = db.sqlite.prepare(`
      SELECT
        date,
        type,
        employee_name,
        COUNT(st.id) as total_tasks,
        SUM(CASE WHEN st.completed = 1 THEN 1 ELSE 0 END) as completed_tasks
      FROM shifts s
      LEFT JOIN shift_tasks st ON s.id = st.shift_id
      WHERE s.date BETWEEN ? AND ?
      GROUP BY s.id
    `).all(weekStart, weekEnd);

    res.json({
      week_start: weekStart,
      week_end: weekEnd,
      sales,
      performance,
      shifts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar reporte semanal' });
  }
});

// GET my performance (for employees - only their own data)
router.get('/my-performance', (req: Request, res: Response) => {
  try {
    const { employee_name } = req.query;

    if (!employee_name) {
      return res.status(400).json({ error: 'Nombre de empleado requerido' });
    }

    // Get employee's shifts
    const shifts = db.sqlite.prepare(`
      SELECT
        s.*,
        COUNT(st.id) as total_tasks,
        SUM(CASE WHEN st.completed = 1 THEN 1 ELSE 0 END) as completed_tasks,
        CAST(SUM(CASE WHEN st.completed = 1 THEN 1 ELSE 0 END) AS FLOAT) / CAST(COUNT(st.id) AS FLOAT) * 100 as completion_rate
      FROM shifts s
      LEFT JOIN shift_tasks st ON s.id = st.shift_id
      WHERE s.employee_name = ?
      GROUP BY s.id
      ORDER BY s.start_time DESC
      LIMIT 30
    `).all(employee_name);

    // Get weekly achievements
    const achievements = db.sqlite.prepare(`
      SELECT * FROM weekly_achievements
      WHERE employee_name = ?
      ORDER BY week_start DESC
      LIMIT 12
    `).all(employee_name);

    // Get active goals
    const activeGoals = db.sqlite.prepare(`
      SELECT eg.*, r.title as reward_title, r.icon as reward_icon
      FROM employee_goals eg
      LEFT JOIN rewards r ON eg.reward_id = r.id
      WHERE eg.employee_name = ? AND eg.status = 'active'
      ORDER BY eg.period_end ASC
    `).all(employee_name);

    // Calculate overall stats
    const totalShifts = shifts.length;
    const avgCompletion = shifts.length > 0
      ? shifts.reduce((sum: number, s: any) => sum + (s.completion_rate || 0), 0) / shifts.length
      : 0;

    const rewardsEarned = achievements.filter((a: any) => a.premio).length;

    res.json({
      employee_name,
      stats: {
        total_shifts: totalShifts,
        avg_completion_rate: Math.round(avgCompletion),
        rewards_earned: rewardsEarned
      },
      recent_shifts: shifts,
      weekly_achievements: achievements,
      active_goals: activeGoals
    });
  } catch (error: any) {
    console.error('Error en my-performance:', error);
    res.status(500).json({ error: 'Error al obtener desempeño', details: error.message });
  }
});

// GET all employees performance (admin only)
router.get('/all-employees', (req: Request, res: Response) => {
  try {
    const { role } = req.query;

    // Only admins can access all employees data
    if (role !== 'chef') {
      return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
    }

    // Get all unique employees
    const employees = db.sqlite.prepare(`
      SELECT DISTINCT employee_name FROM shifts
      ORDER BY employee_name
    `).all() as any[];

    const employeesData = employees.map((emp: any) => {
      const name = emp.employee_name;

      // Get shifts count
      const shiftsData = db.sqlite.prepare(`
        SELECT COUNT(*) as total_shifts
        FROM shifts
        WHERE employee_name = ?
      `).get(name) as any;

      // Get completion rate separately
      const completion = db.sqlite.prepare(`
        SELECT
          SUM(CASE WHEN st.completed = 1 THEN 1 ELSE 0 END) as completed,
          COUNT(*) as total
        FROM shifts s
        LEFT JOIN shift_tasks st ON s.id = st.shift_id
        WHERE s.employee_name = ?
      `).get(name) as any;

      const avg_completion = completion && completion.total > 0
        ? (completion.completed / completion.total) * 100
        : 0;

      // Get achievements summary
      const achievementsData = db.sqlite.prepare(`
        SELECT
          COUNT(*) as total_weeks,
          COUNT(CASE WHEN premio IS NOT NULL THEN 1 END) as rewards_earned
        FROM weekly_achievements
        WHERE employee_name = ?
      `).get(name) as any;

      // Get active goals
      const activeGoalsCount = db.sqlite.prepare(`
        SELECT COUNT(*) as count FROM employee_goals
        WHERE employee_name = ? AND status = 'active'
      `).get(name) as any;

      return {
        employee_name: name,
        total_shifts: shiftsData?.total_shifts || 0,
        avg_completion_rate: Math.round(avg_completion),
        total_weeks: achievementsData?.total_weeks || 0,
        rewards_earned: achievementsData?.rewards_earned || 0,
        active_goals: activeGoalsCount?.count || 0
      };
    });

    res.json(employeesData);
  } catch (error: any) {
    console.error('Error en all-employees:', error);
    res.status(500).json({ error: 'Error al obtener datos de empleados', details: error.message });
  }
});

// GET monthly report (with access control)
router.get('/monthly', (req: Request, res: Response) => {
  try {
    const { year, month, role } = req.query;

    if (!year || !month) {
      return res.status(400).json({ error: 'Año y mes requeridos' });
    }

    const targetYear = parseInt(year as string);
    const targetMonth = parseInt(month as string);

    // Check if report already exists
    const existingReport = db.sqlite.prepare(`
      SELECT * FROM monthly_reports
      WHERE year = ? AND month = ?
    `).get(targetYear, targetMonth) as any;

    if (existingReport) {
      const reportData = existingReport.report_data ? JSON.parse(existingReport.report_data) : {};

      // If employee, only return aggregated data
      if (role !== 'chef') {
        return res.json({
          year: existingReport.year,
          month: existingReport.month,
          total_sales: existingReport.total_sales,
          employees_count: existingReport.employees_count,
          best_employee: existingReport.best_employee,
          generated_at: existingReport.generated_at
        });
      }

      // Admin gets full report
      return res.json({
        ...existingReport,
        report_data: reportData
      });
    }

    // Generate new report
    const firstDay = new Date(targetYear, targetMonth - 1, 1).toISOString().split('T')[0];
    const lastDay = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];

    // Sales summary
    const sales = db.sqlite.prepare(`
      SELECT
        r.name,
        r.type,
        SUM(s.quantity) as total_quantity
      FROM sales s
      JOIN recipes r ON s.recipe_id = r.id
      WHERE DATE(s.timestamp) BETWEEN ? AND ?
      GROUP BY r.id
      ORDER BY total_quantity DESC
    `).all(firstDay, lastDay);

    const totalSales = sales.reduce((sum: number, s: any) => sum + s.total_quantity, 0);

    // Restocks summary
    const restocks = db.sqlite.prepare(`
      SELECT COUNT(*) as count FROM restocks
      WHERE DATE(timestamp) BETWEEN ? AND ?
    `).get(firstDay, lastDay) as any;

    // Inventory average
    const avgInventory = db.sqlite.prepare(`
      SELECT AVG(current_percentage) as avg FROM ingredients
    `).get() as any;

    // Critical alerts
    const criticalAlerts = db.sqlite.prepare(`
      SELECT COUNT(*) as count FROM alerts
      WHERE type = 'critical' AND DATE(created_at) BETWEEN ? AND ?
    `).get(firstDay, lastDay) as any;

    // Employees performance (simplified query)
    const employeesPerf = db.sqlite.prepare(`
      SELECT
        employee_name,
        COUNT(*) as shifts_count
      FROM shifts
      WHERE date BETWEEN ? AND ?
      GROUP BY employee_name
      ORDER BY shifts_count DESC
    `).all(firstDay, lastDay) as any[];

    // Calculate completion rates separately
    for (const emp of employeesPerf) {
      const completion = db.sqlite.prepare(`
        SELECT
          SUM(CASE WHEN st.completed = 1 THEN 1 ELSE 0 END) as completed,
          COUNT(*) as total
        FROM shifts s
        LEFT JOIN shift_tasks st ON s.id = st.shift_id
        WHERE s.employee_name = ? AND s.date BETWEEN ? AND ?
      `).get(emp.employee_name, firstDay, lastDay) as any;

      emp.avg_completion = completion && completion.total > 0
        ? (completion.completed / completion.total) * 100
        : 0;
    }

    // Re-sort by completion
    employeesPerf.sort((a, b) => b.avg_completion - a.avg_completion);

    const bestEmployee = employeesPerf.length > 0 ? employeesPerf[0].employee_name : null;

    const reportData = {
      sales,
      employees_performance: employeesPerf,
      restocks_detail: restocks,
      alerts_detail: criticalAlerts
    };

    // Save report
    const insertStmt = db.sqlite.prepare(`
      INSERT INTO monthly_reports (
        year, month, total_sales, total_restocks, avg_inventory_level,
        critical_alerts_count, employees_count, best_employee, report_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      targetYear,
      targetMonth,
      totalSales,
      restocks.count,
      Math.round(avgInventory.avg),
      criticalAlerts.count,
      employeesPerf.length,
      bestEmployee,
      JSON.stringify(reportData)
    );

    // Return based on role
    if (role !== 'chef') {
      return res.json({
        year: targetYear,
        month: targetMonth,
        total_sales: totalSales,
        employees_count: employeesPerf.length,
        best_employee: bestEmployee
      });
    }

    res.json({
      year: targetYear,
      month: targetMonth,
      total_sales: totalSales,
      total_restocks: restocks.count,
      avg_inventory_level: Math.round(avgInventory.avg),
      critical_alerts_count: criticalAlerts.count,
      employees_count: employeesPerf.length,
      best_employee: bestEmployee,
      report_data: reportData
    });
  } catch (error: any) {
    console.error('Error en monthly report:', error);
    res.status(500).json({ error: 'Error al generar reporte mensual', details: error.message });
  }
});

// POST export report to PDF
router.post('/export-pdf', (req: Request, res: Response) => {
  try {
    const { report_type, data } = req.body;

    if (!report_type || !data) {
      return res.status(400).json({ error: 'Tipo de reporte y datos requeridos' });
    }

    let pdfBuffer: Buffer;
    let filename: string;

    switch (report_type) {
      case 'performance':
        pdfBuffer = generatePerformancePDF(data);
        filename = `desempeno_${data.employee_name}_${new Date().toISOString().split('T')[0]}.pdf`;
        break;

      case 'monthly':
        pdfBuffer = generateMonthlyPDF(data);
        filename = `reporte_mensual_${data.year}_${data.month}.pdf`;
        break;

      default:
        return res.status(400).json({ error: 'Tipo de reporte no válido' });
    }

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF buffer
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Error generando PDF:', error);
    res.status(500).json({ error: 'Error al generar PDF', details: error.message });
  }
});

export default router;
