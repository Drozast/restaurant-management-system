import { db } from '../database/db.js';

interface RewardCalculation {
  employee_name: string;
  completion_rate: number;
  premio: string | null;
  points: number;
}

// Calculate points based on completion rate
export function calculatePoints(completionRate: number): number {
  if (completionRate === 100) return 100;
  if (completionRate >= 95) return 75;
  if (completionRate >= 90) return 50;
  if (completionRate >= 80) return 25;
  if (completionRate >= 70) return 10;
  return 0;
}

// Calculate level based on total points
export function calculateLevel(totalPoints: number): number {
  if (totalPoints >= 5000) return 10;
  if (totalPoints >= 4000) return 9;
  if (totalPoints >= 3000) return 8;
  if (totalPoints >= 2000) return 7;
  if (totalPoints >= 1500) return 6;
  if (totalPoints >= 1000) return 5;
  if (totalPoints >= 700) return 4;
  if (totalPoints >= 400) return 3;
  if (totalPoints >= 150) return 2;
  return 1;
}

// Get or create employee points record
export function getOrCreateEmployeePoints(employeeName: string) {
  let points = db.sqlite.prepare(`
    SELECT * FROM employee_points WHERE employee_name = ?
  `).get(employeeName) as any;

  if (!points) {
    db.sqlite.prepare(`
      INSERT INTO employee_points (employee_name, total_points, current_streak, longest_streak, level)
      VALUES (?, 0, 0, 0, 1)
    `).run(employeeName);

    points = db.sqlite.prepare(`
      SELECT * FROM employee_points WHERE employee_name = ?
    `).get(employeeName);
  }

  return points;
}

// Add points to employee and update level
export function addPointsToEmployee(employeeName: string, pointsToAdd: number) {
  const points = getOrCreateEmployeePoints(employeeName);
  const newTotal = points.total_points + pointsToAdd;
  const newLevel = calculateLevel(newTotal);

  db.sqlite.prepare(`
    UPDATE employee_points
    SET total_points = ?, level = ?, updated_at = CURRENT_TIMESTAMP
    WHERE employee_name = ?
  `).run(newTotal, newLevel, employeeName);

  return { newTotal, newLevel, leveledUp: newLevel > points.level };
}

// Update streak
export function updateStreak(employeeName: string, increment: boolean) {
  const points = getOrCreateEmployeePoints(employeeName);
  const newStreak = increment ? points.current_streak + 1 : 0;
  const longestStreak = Math.max(points.longest_streak, newStreak);

  db.sqlite.prepare(`
    UPDATE employee_points
    SET current_streak = ?, longest_streak = ?, updated_at = CURRENT_TIMESTAMP
    WHERE employee_name = ?
  `).run(newStreak, longestStreak, employeeName);

  return { newStreak, longestStreak };
}

// Record reward in history
export function recordRewardInHistory(
  employeeName: string,
  rewardTitle: string,
  rewardDescription: string,
  rewardIcon: string,
  pointsEarned: number,
  reason: string,
  weekStart?: string
) {
  db.sqlite.prepare(`
    INSERT INTO rewards_history (
      employee_name, reward_title, reward_description, reward_icon,
      points_earned, reason, week_start
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(employeeName, rewardTitle, rewardDescription, rewardIcon, pointsEarned, reason, weekStart || null);
}

// Check and award badges
export function checkAndAwardBadges(employeeName: string) {
  const badges: any[] = [];

  // Get all active badges
  const allBadges = db.sqlite.prepare(`
    SELECT * FROM badges WHERE active = 1
  `).all() as any[];

  for (const badge of allBadges) {
    // Check if already earned
    const hasBadge = db.sqlite.prepare(`
      SELECT * FROM employee_badges
      WHERE employee_name = ? AND badge_id = ?
    `).get(employeeName, badge.id);

    if (hasBadge) continue;

    let qualified = false;

    switch (badge.requirement_type) {
      case 'completion_rate': {
        const stats = db.sqlite.prepare(`
          SELECT AVG(
            CAST(tasks_completed AS FLOAT) / CAST(total_tasks AS FLOAT) * 100
          ) as avg_rate
          FROM weekly_achievements
          WHERE employee_name = ?
        `).get(employeeName) as any;

        qualified = stats && stats.avg_rate >= badge.requirement_value;
        break;
      }

      case 'streak': {
        const points = getOrCreateEmployeePoints(employeeName);
        qualified = points.longest_streak >= badge.requirement_value;
        break;
      }

      case 'total_tasks': {
        const count = db.sqlite.prepare(`
          SELECT COUNT(*) as count FROM shifts WHERE employee_name = ?
        `).get(employeeName) as any;

        qualified = count && count.count >= badge.requirement_value;
        break;
      }

      case 'rewards_count': {
        const count = db.sqlite.prepare(`
          SELECT COUNT(*) as count
          FROM weekly_achievements
          WHERE employee_name = ? AND premio IS NOT NULL
        `).get(employeeName) as any;

        qualified = count && count.count >= badge.requirement_value;
        break;
      }

      case 'perfect_weeks': {
        const perfectWeeks = db.sqlite.prepare(`
          SELECT COUNT(*) as count
          FROM weekly_achievements
          WHERE employee_name = ?
          AND tasks_completed = total_tasks
          AND total_tasks > 0
        `).get(employeeName) as any;

        qualified = perfectWeeks && perfectWeeks.count >= badge.requirement_value;
        break;
      }
    }

    if (qualified) {
      // Award badge
      db.sqlite.prepare(`
        INSERT INTO employee_badges (employee_name, badge_id)
        VALUES (?, ?)
      `).run(employeeName, badge.id);

      // Add points
      addPointsToEmployee(employeeName, badge.points_value);

      badges.push({
        ...badge,
        points_awarded: badge.points_value
      });
    }
  }

  return badges;
}
