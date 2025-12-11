import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';
import {
  calculatePoints,
  addPointsToEmployee,
  updateStreak,
  recordRewardInHistory,
  checkAndAwardBadges
} from '../utils/pointsSystem.js';

const router = Router();

// GET current week achievements
router.get('/current-week', (req: Request, res: Response) => {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay();

    // Find Tuesday of current week
    const daysUntilTuesday = (dayOfWeek + 5) % 7;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysUntilTuesday);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const achievements = db.sqlite.prepare(`
      SELECT * FROM weekly_achievements
      WHERE week_start = ?
      ORDER BY tasks_completed DESC
    `).all(weekStartStr);

    res.json(achievements);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener logros de la semana' });
  }
});

// GET leaderboard
router.get('/leaderboard', (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;

    const leaderboard = db.sqlite.prepare(`
      SELECT
        employee_name,
        SUM(tasks_completed) as total_completed,
        SUM(total_tasks) as total_tasks,
        COUNT(*) as weeks_worked,
        CAST(SUM(tasks_completed) AS FLOAT) / CAST(SUM(total_tasks) AS FLOAT) * 100 as completion_rate
      FROM weekly_achievements
      GROUP BY employee_name
      ORDER BY completion_rate DESC, total_completed DESC
      LIMIT ?
    `).all(limit);

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tabla de líderes' });
  }
});

// POST assign reward
router.post('/reward', (req: Request, res: Response) => {
  try {
    const { week_start, employee_name, premio } = req.body;

    const stmt = db.sqlite.prepare(`
      UPDATE weekly_achievements
      SET premio = ?
      WHERE week_start = ? AND employee_name = ?
    `);

    stmt.run(premio, week_start, employee_name);

    const updated = db.sqlite.prepare(`
      SELECT * FROM weekly_achievements
      WHERE week_start = ? AND employee_name = ?
    `).get(week_start, employee_name);

    // Emit update via socket
    const io = req.app.get('io');
    io.emit('reward:assigned', updated);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al asignar premio' });
  }
});

// GET employee stats
router.get('/employee/:name', (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    const stats = db.sqlite.prepare(`
      SELECT
        COUNT(*) as total_weeks,
        SUM(tasks_completed) as total_tasks_completed,
        SUM(total_tasks) as total_tasks,
        AVG(CAST(tasks_completed AS FLOAT) / CAST(total_tasks AS FLOAT) * 100) as avg_completion_rate,
        COUNT(CASE WHEN premio IS NOT NULL THEN 1 END) as rewards_earned
      FROM weekly_achievements
      WHERE employee_name = ?
    `).get(name);

    const recentWeeks = db.sqlite.prepare(`
      SELECT * FROM weekly_achievements
      WHERE employee_name = ?
      ORDER BY week_start DESC
      LIMIT 5
    `).all(name);

    // Get points and level
    const pointsData = db.sqlite.prepare(`
      SELECT * FROM employee_points
      WHERE employee_name = ?
    `).get(name);

    // Get earned badges
    const badges = db.sqlite.prepare(`
      SELECT b.*, eb.earned_at
      FROM employee_badges eb
      JOIN badges b ON eb.badge_id = b.id
      WHERE eb.employee_name = ?
      ORDER BY eb.earned_at DESC
    `).all(name);

    res.json({
      employee_name: name,
      stats,
      recent_weeks: recentWeeks,
      points: pointsData || { total_points: 0, current_streak: 0, longest_streak: 0, level: 1 },
      badges
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener estadísticas del empleado' });
  }
});

// GET rewards history
router.get('/history/:name', (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const { limit = 20 } = req.query;

    const history = db.sqlite.prepare(`
      SELECT * FROM rewards_history
      WHERE employee_name = ?
      ORDER BY awarded_at DESC
      LIMIT ?
    `).all(name, limit);

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial de premios' });
  }
});

// GET all badges (available and earned)
router.get('/badges/:name', (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    // Get all active badges
    const allBadges = db.sqlite.prepare(`
      SELECT * FROM badges WHERE active = 1
    `).all();

    // Get earned badges for this employee
    const earnedBadges = db.sqlite.prepare(`
      SELECT badge_id, earned_at FROM employee_badges
      WHERE employee_name = ?
    `).all(name) as any[];

    const earnedIds = new Set(earnedBadges.map(b => b.badge_id));

    const badges = allBadges.map((badge: any) => ({
      ...badge,
      earned: earnedIds.has(badge.id),
      earned_at: earnedBadges.find(b => b.badge_id === badge.id)?.earned_at || null
    }));

    res.json(badges);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener badges' });
  }
});

// GET extended leaderboard with points and levels
router.get('/leaderboard-extended', (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;

    const leaderboard = db.sqlite.prepare(`
      SELECT
        wa.employee_name,
        SUM(wa.tasks_completed) as total_completed,
        SUM(wa.total_tasks) as total_tasks,
        COUNT(*) as weeks_worked,
        CAST(SUM(wa.tasks_completed) AS FLOAT) / CAST(SUM(wa.total_tasks) AS FLOAT) * 100 as completion_rate,
        COALESCE(ep.total_points, 0) as total_points,
        COALESCE(ep.level, 1) as level,
        COALESCE(ep.current_streak, 0) as current_streak,
        (SELECT COUNT(*) FROM employee_badges WHERE employee_name = wa.employee_name) as badges_count
      FROM weekly_achievements wa
      LEFT JOIN employee_points ep ON wa.employee_name = ep.employee_name
      GROUP BY wa.employee_name
      ORDER BY completion_rate DESC, total_points DESC
      LIMIT ?
    `).all(limit);

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tabla de líderes' });
  }
});

// POST calculate weekly rewards (to be run on Saturday/Sunday)
router.post('/calculate-rewards', (req: Request, res: Response) => {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay();

    // Find Tuesday of current week
    const daysUntilTuesday = (dayOfWeek + 5) % 7;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysUntilTuesday);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const achievements = db.sqlite.prepare(`
      SELECT * FROM weekly_achievements
      WHERE week_start = ?
      ORDER BY tasks_completed DESC
    `).all(weekStartStr) as any[];

    const rewards = [];
    const levelUps = [];
    const newBadges = [];

    for (const achievement of achievements) {
      const completionRate = (achievement.tasks_completed / achievement.total_tasks) * 100;

      let premio = null;
      let rewardIcon = '';
      let rewardDescription = '';

      // Award pizza if 100% completion
      if (completionRate === 100) {
        premio = 'Pizza gratis el sábado';
        rewardIcon = '🍕';
        rewardDescription = '100% de tareas completadas';
      }
      // Award beer if >= 90% completion
      else if (completionRate >= 90) {
        premio = 'Cerveza al final del turno';
        rewardIcon = '🍺';
        rewardDescription = `${completionRate.toFixed(1)}% de tareas completadas`;
      }

      // Calculate and award points for everyone (not just those who win rewards)
      const points = calculatePoints(completionRate);
      if (points > 0) {
        const pointsResult = addPointsToEmployee(achievement.employee_name, points);

        // Check if employee leveled up
        if (pointsResult.leveledUp) {
          levelUps.push({
            employee_name: achievement.employee_name,
            new_level: pointsResult.newLevel,
            total_points: pointsResult.newTotal
          });
        }
      }

      // Update streak (increment if completion rate >= 70%)
      const streakResult = updateStreak(achievement.employee_name, completionRate >= 70);

      if (premio) {
        db.sqlite.prepare(`
          UPDATE weekly_achievements
          SET premio = ?
          WHERE id = ?
        `).run(premio, achievement.id);

        // Record in history
        recordRewardInHistory(
          achievement.employee_name,
          premio,
          rewardDescription,
          rewardIcon,
          points,
          weekStartStr
        );

        rewards.push({
          employee_name: achievement.employee_name,
          premio,
          completion_rate: completionRate,
          points_earned: points,
          current_streak: streakResult.newStreak
        });
      }

      // Check and award badges
      const earnedBadges = checkAndAwardBadges(achievement.employee_name);
      if (earnedBadges.length > 0) {
        newBadges.push({
          employee_name: achievement.employee_name,
          badges: earnedBadges
        });
      }
    }

    // Emit updates via socket
    const io = req.app.get('io');
    io.emit('rewards:calculated', rewards);

    if (levelUps.length > 0) {
      io.emit('level:up', levelUps);
    }

    if (newBadges.length > 0) {
      io.emit('badges:earned', newBadges);
    }

    res.json({
      rewards,
      level_ups: levelUps,
      new_badges: newBadges
    });
  } catch (error) {
    console.error('Error calculating rewards:', error);
    res.status(500).json({ error: 'Error al calcular premios' });
  }
});

export default router;
