import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useStore } from '../store/useStore';
import { Plus, Trash2, Edit2, Gift, Trophy, Star, Flame, Award, TrendingUp, Calculator } from 'lucide-react';
import type { Reward, CreateRewardInput } from '../types';

export default function RewardsNew() {
  const { user } = useStore();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [activeTab, setActiveTab] = useState<'rewards' | 'leaderboard' | 'badges' | 'history'>('rewards');

  // Employee-specific data
  const [employeeStats, setEmployeeStats] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [rewardsHistory, setRewardsHistory] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const isAdmin = user?.role === 'chef';

  useEffect(() => {
    loadRewards();
    if (!isAdmin && user?.name) {
      loadEmployeeData(user.name);
    }
    loadLeaderboard();
  }, [user]);

  const loadRewards = async () => {
    try {
      const data = await api.rewards.getAll();
      setRewards(data);
    } catch (error) {
      console.error('Error cargando premios:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeData = async (employeeName: string) => {
    try {
      const [stats, badgesData, history] = await Promise.all([
        api.gamification.getEmployeeStats(employeeName),
        api.gamification.getBadges(employeeName),
        api.gamification.getRewardsHistory(employeeName, 20),
      ]);
      setEmployeeStats(stats);
      setBadges(badgesData);
      setRewardsHistory(history);
    } catch (error) {
      console.error('Error cargando datos del empleado:', error);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const data = await api.gamification.getLeaderboardExtended(10);
      setLeaderboard(data);
    } catch (error) {
      console.error('Error cargando leaderboard:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este premio?')) return;

    try {
      await api.rewards.delete(id);
      loadRewards();
    } catch (error) {
      console.error('Error eliminando premio:', error);
    }
  };

  const handleEdit = (reward: Reward) => {
    setEditingReward(reward);
    setShowModal(true);
  };

  const handleCalculateRewards = async () => {
    if (!confirm('¿Calcular premios para la semana actual? Esto asignará puntos, niveles y badges a todos los empleados.')) return;

    try {
      const result = await api.gamification.calculateRewards();
      const { rewards, level_ups, new_badges } = result;

      let message = `✅ Premios calculados exitosamente!\n\n`;

      if (rewards && rewards.length > 0) {
        message += `🏆 Premios ganados: ${rewards.length}\n`;
        rewards.forEach((r: any) => {
          message += `  • ${r.employee_name}: ${r.premio} (${r.completion_rate.toFixed(1)}%)\n`;
        });
      }

      if (level_ups && level_ups.length > 0) {
        message += `\n⬆️ Level-ups: ${level_ups.length}\n`;
        level_ups.forEach((l: any) => {
          message += `  • ${l.employee_name} → Nivel ${l.new_level}\n`;
        });
      }

      if (new_badges && new_badges.length > 0) {
        message += `\n🎖️ Badges nuevos: ${new_badges.reduce((sum: number, b: any) => sum + b.badges.length, 0)}\n`;
        new_badges.forEach((nb: any) => {
          nb.badges.forEach((badge: any) => {
            message += `  • ${nb.employee_name}: ${badge.name}\n`;
          });
        });
      }

      alert(message);

      // Reload data
      if (!isAdmin && user?.name) {
        loadEmployeeData(user.name);
      }
      loadLeaderboard();
    } catch (error: any) {
      alert(error.message || 'Error al calcular premios');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Cargando...</div>;
  }

  // Calculate level progress
  const getLevelProgress = (points: number, level: number) => {
    const levelThresholds = [0, 100, 250, 500, 1000, 1500, 2500, 3000, 4000, 5000];
    const currentLevelMin = levelThresholds[level - 1] || 0;
    const nextLevelMin = levelThresholds[level] || 5000;
    const progress = ((points - currentLevelMin) / (nextLevelMin - currentLevelMin)) * 100;
    return Math.min(progress, 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-orange-500" />
            Premios y Gamificación
          </h1>
          <p className="text-gray-600 mt-2">
            {isAdmin
              ? 'Sistema de premios, puntos y recompensas para tu equipo'
              : 'Completa tareas, gana puntos, desbloquea badges y obtén premios'}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-3">
            <button
              onClick={handleCalculateRewards}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
            >
              <Calculator className="w-5 h-5" />
              Calcular Premios Semanales
            </button>
            <button
              onClick={() => {
                setEditingReward(null);
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nuevo Premio
            </button>
          </div>
        )}
      </div>

      {/* Employee Stats Card (only for employees) */}
      {!isAdmin && employeeStats?.points && (
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">{user?.name}</h2>
              <p className="text-orange-100">Nivel {employeeStats.points.level}</p>
            </div>
            <div className="text-5xl font-bold">{employeeStats.points.total_points}</div>
          </div>

          {/* Level Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Progreso al Nivel {employeeStats.points.level + 1}</span>
              <span>{getLevelProgress(employeeStats.points.total_points, employeeStats.points.level).toFixed(0)}%</span>
            </div>
            <div className="bg-orange-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-white h-full rounded-full transition-all duration-500"
                style={{ width: `${getLevelProgress(employeeStats.points.total_points, employeeStats.points.level)}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/20 rounded-lg p-3 text-center backdrop-blur">
              <Flame className="w-6 h-6 mx-auto mb-1" />
              <div className="text-2xl font-bold">{employeeStats.points.current_streak}</div>
              <div className="text-xs text-orange-100">Racha Actual</div>
            </div>
            <div className="bg-white/20 rounded-lg p-3 text-center backdrop-blur">
              <Star className="w-6 h-6 mx-auto mb-1" />
              <div className="text-2xl font-bold">{employeeStats.points.longest_streak}</div>
              <div className="text-xs text-orange-100">Mejor Racha</div>
            </div>
            <div className="bg-white/20 rounded-lg p-3 text-center backdrop-blur">
              <Award className="w-6 h-6 mx-auto mb-1" />
              <div className="text-2xl font-bold">{badges.filter((b: any) => b.earned).length}</div>
              <div className="text-xs text-orange-100">Badges</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('rewards')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'rewards'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4" />
              Premios Disponibles
            </div>
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'leaderboard'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Tabla de Líderes
            </div>
          </button>
          {!isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('badges')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'badges'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Mis Badges
                </div>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'history'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Historial
                </div>
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'rewards' && (
        <div>
          {rewards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-lg hover:scale-105 transition-transform"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-5xl">{reward.icon}</div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(reward)}
                          className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-white" />
                        </button>
                        <button
                          onClick={() => handleDelete(reward.id)}
                          className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {reward.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {reward.description}
                  </p>
                  {isAdmin && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        Creado por: {reward.created_by}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center shadow-lg">
              <Gift className="w-20 h-20 text-gray-300 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {isAdmin ? 'No hay premios configurados' : 'Aún no hay premios disponibles'}
              </h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                {isAdmin
                  ? 'Comienza a motivar a tu equipo agregando premios y recompensas'
                  : 'Pronto habrá premios increíbles esperándote'}
              </p>
              {isAdmin && (
                <button
                  onClick={() => {
                    setEditingReward(null);
                    setShowModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105"
                >
                  <Plus className="w-5 h-5" />
                  Crear Primer Premio
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="space-y-6">
          {/* Top 3 Podium */}
          {leaderboard.length >= 3 && (
            <div className="flex items-end justify-center gap-4 mb-8">
              {/* Second Place */}
              <div className="bg-gray-200 rounded-t-xl p-6 text-center w-48" style={{ height: '200px' }}>
                <div className="text-5xl mb-2">🥈</div>
                <div className="font-bold text-lg text-gray-900">{leaderboard[1]?.employee_name}</div>
                <div className="text-sm text-gray-600">Nivel {leaderboard[1]?.level}</div>
                <div className="text-2xl font-bold text-orange-600 mt-2">{leaderboard[1]?.total_points}</div>
                <div className="text-xs text-gray-500">puntos</div>
              </div>

              {/* First Place */}
              <div className="bg-gradient-to-b from-yellow-300 to-yellow-400 rounded-t-xl p-6 text-center w-48" style={{ height: '240px' }}>
                <div className="text-6xl mb-2">🥇</div>
                <div className="font-bold text-xl text-gray-900">{leaderboard[0]?.employee_name}</div>
                <div className="text-sm text-gray-700">Nivel {leaderboard[0]?.level}</div>
                <div className="text-3xl font-bold text-orange-600 mt-2">{leaderboard[0]?.total_points}</div>
                <div className="text-xs text-gray-700">puntos</div>
              </div>

              {/* Third Place */}
              <div className="bg-orange-200 rounded-t-xl p-6 text-center w-48" style={{ height: '160px' }}>
                <div className="text-4xl mb-2">🥉</div>
                <div className="font-bold text-base text-gray-900">{leaderboard[2]?.employee_name}</div>
                <div className="text-sm text-gray-600">Nivel {leaderboard[2]?.level}</div>
                <div className="text-xl font-bold text-orange-600 mt-2">{leaderboard[2]?.total_points}</div>
                <div className="text-xs text-gray-500">puntos</div>
              </div>
            </div>
          )}

          {/* Full Leaderboard Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posición</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nivel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Puntos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Racha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Badges</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">% Completitud</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leaderboard.map((entry, index) => (
                  <tr
                    key={entry.employee_name}
                    className={user?.name === entry.employee_name ? 'bg-orange-50' : 'hover:bg-gray-50'}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {entry.employee_name}
                      {user?.name === entry.employee_name && (
                        <span className="ml-2 text-xs text-orange-600">(Tú)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                        Nivel {entry.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-orange-600">
                      {entry.total_points}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span>{entry.current_streak}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Award className="w-4 h-4 text-purple-500" />
                        <span>{entry.badges_count}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {entry.completion_rate?.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'badges' && !isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {badges.map((badge: any) => (
            <div
              key={badge.id}
              className={`rounded-xl p-6 border-2 ${
                badge.earned
                  ? 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-300'
                  : 'bg-gray-50 border-gray-200 opacity-60'
              }`}
            >
              <div className="text-center">
                <div className="text-6xl mb-4">{badge.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{badge.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{badge.description}</p>
                {badge.earned ? (
                  <div className="space-y-2">
                    <div className="px-3 py-1 bg-purple-600 text-white rounded-full text-xs font-semibold inline-block">
                      ✓ Desbloqueado
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(badge.earned_at).toLocaleDateString('es-CL')}
                    </div>
                    <div className="text-sm font-bold text-purple-600">
                      +{badge.points_value} puntos
                    </div>
                  </div>
                ) : (
                  <div className="px-3 py-1 bg-gray-300 text-gray-600 rounded-full text-xs font-semibold inline-block">
                    🔒 Bloqueado
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'history' && !isAdmin && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Premio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Razón</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Puntos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Semana</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rewardsHistory.map((reward: any) => (
                <tr key={reward.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(reward.awarded_at).toLocaleDateString('es-CL')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{reward.reward_icon}</span>
                      <span className="font-medium text-gray-900">{reward.reward_title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{reward.reason}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                      +{reward.points_earned} pts
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(reward.week_start).toLocaleDateString('es-CL')}
                  </td>
                </tr>
              ))}
              {rewardsHistory.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Aún no has ganado ningún premio. ¡Sigue trabajando duro!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <RewardModal
          reward={editingReward}
          onClose={() => {
            setShowModal(false);
            setEditingReward(null);
          }}
          onSuccess={() => {
            loadRewards();
            setShowModal(false);
            setEditingReward(null);
          }}
          userName={user?.name || ''}
        />
      )}
    </div>
  );
}

interface RewardModalProps {
  reward: Reward | null;
  onClose: () => void;
  onSuccess: () => void;
  userName: string;
}

function RewardModal({ reward, onClose, onSuccess, userName }: RewardModalProps) {
  const [formData, setFormData] = useState({
    title: reward?.title || '',
    description: reward?.description || '',
    icon: reward?.icon || '🎁',
  });

  const emojiOptions = ['🎁', '🏆', '🎉', '🍕', '🎬', '🎮', '💰', '🎟️', '🛍️', '🎈'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (reward) {
        await api.rewards.update(reward.id, formData);
      } else {
        await api.rewards.create({ ...formData, created_by: userName });
      }
      onSuccess();
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {reward ? 'Editar Premio' : 'Nuevo Premio'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icono
            </label>
            <div className="grid grid-cols-5 gap-2">
              {emojiOptions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: emoji })}
                  className={`text-3xl p-3 rounded-lg border-2 transition-all ${
                    formData.icon === emoji
                      ? 'border-orange-500 bg-orange-50 scale-110'
                      : 'border-gray-300 hover:border-orange-300'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título del Premio
            </label>
            <input
              type="text"
              required
              placeholder="Ej: 2 Pizzas Familiares"
              className="w-full bg-white border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors font-medium"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              required
              rows={3}
              placeholder="Describe el premio y cómo ganarlo"
              className="w-full bg-white border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors font-medium resize-none"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
            >
              {reward ? 'Actualizar' : 'Crear'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
