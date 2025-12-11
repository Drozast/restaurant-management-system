import { useEffect } from 'react';
import { getSocket } from '../lib/socket';
import toast from 'react-hot-toast';
import { useStore } from '../store/useStore';

export function useGamificationNotifications() {
  const user = useStore((state) => state.user);

  useEffect(() => {
    if (!user) return;

    const socket = getSocket();

    // Listen for level-ups
    const handleLevelUp = (levelUps: any[]) => {
      levelUps.forEach((levelUp) => {
        if (levelUp.employee_name === user.name) {
          toast.success(
            `🎉 ¡Subiste de nivel! Ahora eres Nivel ${levelUp.new_level}`,
            {
              duration: 6000,
              icon: '⬆️',
            }
          );
        }
      });
    };

    // Listen for new badges
    const handleBadgesEarned = (badgeData: any[]) => {
      badgeData.forEach((data) => {
        if (data.employee_name === user.name) {
          data.badges.forEach((badge: any) => {
            toast.success(
              `🎖️ ¡Nuevo badge desbloqueado!\n${badge.icon} ${badge.name}\n+${badge.points} puntos`,
              {
                duration: 7000,
                icon: '🏆',
              }
            );
          });
        }
      });
    };

    // Listen for rewards calculated
    const handleRewardsCalculated = (rewards: any[]) => {
      const myReward = rewards.find((r) => r.employee_name === user.name);
      if (myReward) {
        toast.success(
          `🎁 ¡Ganaste un premio!\n${myReward.premio}\nCompletitud: ${myReward.completion_rate.toFixed(1)}%\n+${myReward.points_earned} puntos`,
          {
            duration: 8000,
            icon: '🏆',
          }
        );
      }
    };

    socket.on('level:up', handleLevelUp);
    socket.on('badges:earned', handleBadgesEarned);
    socket.on('rewards:calculated', handleRewardsCalculated);

    return () => {
      socket.off('level:up', handleLevelUp);
      socket.off('badges:earned', handleBadgesEarned);
      socket.off('rewards:calculated', handleRewardsCalculated);
    };
  }, [user]);
}
