import cron from 'node-cron';
import { db } from '../database/db.js';
import {
  calculatePoints,
  addPointsToEmployee,
  updateStreak,
  recordRewardInHistory,
  checkAndAwardBadges
} from '../utils/pointsSystem.js';

/**
 * Calcula premios semanales automáticamente
 * Se ejecuta todos los sábados a las 23:00
 */
export function scheduleWeeklyRewards(io: any) {
  // Cron: every Saturday at 23:00 (11 PM)
  // Format: second minute hour day-of-month month day-of-week
  cron.schedule('0 0 23 * * 6', async () => {
    console.log('🎯 [CRON] Iniciando cálculo automático de premios semanales...');

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

      console.log(`📊 [CRON] Procesando ${achievements.length} empleados...`);

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

        // Calculate and award points
        const points = calculatePoints(completionRate);
        if (points > 0) {
          const pointsResult = addPointsToEmployee(achievement.employee_name, points);

          if (pointsResult.leveledUp) {
            levelUps.push({
              employee_name: achievement.employee_name,
              new_level: pointsResult.newLevel,
              total_points: pointsResult.newTotal
            });
            console.log(`⬆️ [CRON] ${achievement.employee_name} subió a nivel ${pointsResult.newLevel}`);
          }
        }

        // Update streak
        const streakResult = updateStreak(achievement.employee_name, completionRate >= 70);

        if (premio) {
          db.sqlite.prepare(`
            UPDATE weekly_achievements
            SET premio = ?
            WHERE id = ?
          `).run(premio, achievement.id);

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

          console.log(`🎁 [CRON] ${achievement.employee_name} ganó: ${premio}`);
        }

        // Check and award badges
        const earnedBadges = checkAndAwardBadges(achievement.employee_name);
        if (earnedBadges.length > 0) {
          newBadges.push({
            employee_name: achievement.employee_name,
            badges: earnedBadges
          });
          console.log(`🏆 [CRON] ${achievement.employee_name} desbloqueó ${earnedBadges.length} badge(s)`);
        }
      }

      // Emit Socket.IO events
      io.emit('rewards:calculated', rewards);
      if (levelUps.length > 0) {
        io.emit('level:up', levelUps);
      }
      if (newBadges.length > 0) {
        io.emit('badges:earned', newBadges);
      }

      console.log(`✅ [CRON] Premios calculados: ${rewards.length} premios, ${levelUps.length} level-ups, ${newBadges.reduce((sum, b) => sum + b.badges.length, 0)} badges`);

    } catch (error) {
      console.error('❌ [CRON] Error calculando premios:', error);
    }
  }, {
    timezone: "America/Santiago" // Chile timezone
  });

  console.log('⏰ Cron job configurado: Premios semanales cada sábado a las 23:00 (Chile)');
}

/**
 * Limpieza de datos antiguos
 * Se ejecuta el primer día de cada mes a las 2:00 AM
 */
export function scheduleDataCleanup() {
  cron.schedule('0 0 2 1 * *', async () => {
    console.log('🧹 [CRON] Iniciando limpieza de datos antiguos...');

    try {
      // Delete old alerts (older than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

      const deleteAlertsResult = db.sqlite.prepare(`
        DELETE FROM alerts
        WHERE created_at < ? AND resolved = 1
      `).run(thirtyDaysAgoStr);

      console.log(`🗑️ [CRON] Alertas antiguas eliminadas: ${deleteAlertsResult.changes}`);

      // Delete old restocks history (older than 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const ninetyDaysAgoStr = ninetyDaysAgo.toISOString();

      const deleteRestocksResult = db.sqlite.prepare(`
        DELETE FROM restocks
        WHERE created_at < ?
      `).run(ninetyDaysAgoStr);

      console.log(`🗑️ [CRON] Historial de restock antiguo eliminado: ${deleteRestocksResult.changes}`);

      console.log('✅ [CRON] Limpieza completada exitosamente');

    } catch (error) {
      console.error('❌ [CRON] Error en limpieza:', error);
    }
  }, {
    timezone: "America/Santiago"
  });

  console.log('⏰ Cron job configurado: Limpieza de datos el 1ro de cada mes a las 2:00 AM (Chile)');
}
