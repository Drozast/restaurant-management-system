import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';

const router = Router();

// GET sales trends (last 7 days)
router.get('/sales-trends', (req: Request, res: Response) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const salesByDay = db.sqlite.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as total_sales,
        SUM(quantity) as total_pizzas
      FROM sales
      WHERE DATE(created_at) >= ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all(sevenDaysAgoStr);

    res.json(salesByDay);
  } catch (error) {
    console.error('Error getting sales trends:', error);
    res.status(500).json({ error: 'Error al obtener tendencias de ventas' });
  }
});

// GET top recipes sold
router.get('/top-recipes', (req: Request, res: Response) => {
  try {
    const { limit = 5 } = req.query;

    const topRecipes = db.sqlite.prepare(`
      SELECT
        r.name as recipe_name,
        COUNT(*) as times_sold,
        SUM(s.quantity) as total_quantity
      FROM sales s
      JOIN recipes r ON s.recipe_id = r.id
      GROUP BY s.recipe_id
      ORDER BY total_quantity DESC
      LIMIT ?
    `).all(limit);

    res.json(topRecipes);
  } catch (error) {
    console.error('Error getting top recipes:', error);
    res.status(500).json({ error: 'Error al obtener recetas más vendidas' });
  }
});

// GET inventory status distribution
router.get('/inventory-distribution', (req: Request, res: Response) => {
  try {
    const distribution = db.sqlite.prepare(`
      SELECT
        CASE
          WHEN COALESCE(current_percentage, 100) >= 70 THEN 'Óptimo (70-100%)'
          WHEN COALESCE(current_percentage, 100) >= 40 THEN 'Medio (40-69%)'
          WHEN COALESCE(current_percentage, 100) >= 20 THEN 'Bajo (20-39%)'
          ELSE 'Crítico (<20%)'
        END as status,
        COUNT(*) as count
      FROM ingredients
      GROUP BY status
      ORDER BY
        CASE status
          WHEN 'Óptimo (70-100%)' THEN 1
          WHEN 'Medio (40-69%)' THEN 2
          WHEN 'Bajo (20-39%)' THEN 3
          ELSE 4
        END
    `).all();

    res.json(distribution);
  } catch (error) {
    console.error('Error getting inventory distribution:', error);
    res.status(500).json({ error: 'Error al obtener distribución de inventario' });
  }
});

// GET employee performance trends
router.get('/employee-performance', (req: Request, res: Response) => {
  try {
    const performance = db.sqlite.prepare(`
      SELECT
        wa.employee_name,
        AVG(CAST(wa.tasks_completed AS FLOAT) / CAST(wa.total_tasks AS FLOAT) * 100) as avg_completion,
        COUNT(*) as weeks_worked,
        COALESCE(ep.total_points, 0) as total_points,
        COALESCE(ep.level, 1) as level
      FROM weekly_achievements wa
      LEFT JOIN employee_points ep ON wa.employee_name = ep.employee_name
      GROUP BY wa.employee_name
      ORDER BY avg_completion DESC
      LIMIT 10
    `).all();

    res.json(performance);
  } catch (error) {
    console.error('Error getting employee performance:', error);
    res.status(500).json({ error: 'Error al obtener desempeño de empleados' });
  }
});

// GET weekly completion trends (last 4 weeks)
router.get('/weekly-trends', (req: Request, res: Response) => {
  try {
    const trends = db.sqlite.prepare(`
      SELECT
        week_start,
        AVG(CAST(tasks_completed AS FLOAT) / CAST(total_tasks AS FLOAT) * 100) as avg_completion,
        COUNT(DISTINCT employee_name) as employees_count
      FROM weekly_achievements
      GROUP BY week_start
      ORDER BY week_start DESC
      LIMIT 4
    `).all();

    // Reverse to show oldest first
    res.json(trends.reverse());
  } catch (error) {
    console.error('Error getting weekly trends:', error);
    res.status(500).json({ error: 'Error al obtener tendencias semanales' });
  }
});

// GET restock frequency by ingredient
router.get('/restock-frequency', (req: Request, res: Response) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    const frequency = db.sqlite.prepare(`
      SELECT
        i.name as ingredient_name,
        i.category,
        COUNT(*) as restock_count
      FROM restocks r
      JOIN ingredients i ON r.ingredient_id = i.id
      WHERE r.created_at >= ?
      GROUP BY r.ingredient_id
      ORDER BY restock_count DESC
      LIMIT 10
    `).all(thirtyDaysAgoStr);

    res.json(frequency);
  } catch (error) {
    console.error('Error getting restock frequency:', error);
    res.status(500).json({ error: 'Error al obtener frecuencia de reposición' });
  }
});

export default router;
