import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useStore } from '../store/useStore';
import { TrendingUp, Award, Target, Download, Calendar, CheckCircle2 } from 'lucide-react';

export default function MiDesempeno() {
  const { user } = useStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [exportingPDF, setExportingPDF] = useState(false);

  useEffect(() => {
    if (user?.name) {
      loadPerformanceData();
    }
  }, [user]);

  const loadPerformanceData = async () => {
    try {
      setLoading(true);
      const performanceData = await api.reportsExtended.getMyPerformance(user!.name);
      setData(performanceData);
    } catch (error) {
      console.error('Error cargando desempeño:', error);
      alert('Error al cargar tus datos de desempeño');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!data) return;

    try {
      setExportingPDF(true);
      const blob = await api.reportsExtended.exportPDF('performance', data);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mi_desempeno_${user?.name}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exportando PDF:', error);
      alert('Error al generar PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando tu desempeño...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No se pudieron cargar tus datos</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-orange-600" />
            Mi Desempeño
          </h1>
          <p className="text-gray-600 mt-2">
            Revisa tu progreso y logros, {user?.name}
          </p>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={exportingPDF}
          className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
        >
          <Download className="w-5 h-5" />
          {exportingPDF ? 'Generando...' : 'Descargar PDF'}
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Calendar className="w-8 h-8 opacity-80" />
            <span className="text-3xl font-bold">{data.stats.total_shifts}</span>
          </div>
          <p className="text-sm opacity-90">Total de Turnos</p>
          <p className="text-xs opacity-75 mt-1">Últimos 30 registrados</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle2 className="w-8 h-8 opacity-80" />
            <span className="text-3xl font-bold">{data.stats.avg_completion_rate}%</span>
          </div>
          <p className="text-sm opacity-90">Completitud Promedio</p>
          <p className="text-xs opacity-75 mt-1">De todas tus tareas</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Award className="w-8 h-8 opacity-80" />
            <span className="text-3xl font-bold">{data.stats.rewards_earned}</span>
          </div>
          <p className="text-sm opacity-90">Premios Ganados</p>
          <p className="text-xs opacity-75 mt-1">¡Sigue así!</p>
        </div>
      </div>

      {/* Active Goals */}
      {data.active_goals && data.active_goals.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Target className="w-6 h-6 text-orange-600" />
            Metas Activas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.active_goals.map((goal: any) => {
              const progress = goal.target_value > 0
                ? Math.round((goal.current_value / goal.target_value) * 100)
                : 0;

              return (
                <div key={goal.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900 capitalize">
                        {goal.goal_type.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-gray-600">
                        Meta: {goal.target_value} · Actual: {goal.current_value}
                      </p>
                    </div>
                    {goal.reward_icon && (
                      <span className="text-3xl">{goal.reward_icon}</span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-orange-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{progress}% completado</span>
                    <span>{goal.period}</span>
                  </div>

                  {goal.reward_title && (
                    <p className="text-xs text-orange-600 font-medium mt-2">
                      Premio: {goal.reward_title}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Shifts */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Turnos Recientes</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Fecha</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Turno</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Tareas</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Completitud</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_shifts.slice(0, 10).map((shift: any) => {
                const completionRate = shift.completion_rate || 0;
                const statusColor = shift.status === 'closed'
                  ? 'text-gray-600 bg-gray-100'
                  : 'text-green-600 bg-green-100';

                return (
                  <tr key={shift.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      {new Date(shift.start_time).toLocaleDateString('es-CL')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        shift.type === 'AM' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {shift.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {shift.completed_tasks || 0} / {shift.total_tasks || 0}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              completionRate >= 90 ? 'bg-green-500' :
                              completionRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold">{Math.round(completionRate)}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColor}`}>
                        {shift.status === 'closed' ? 'Cerrado' : 'Abierto'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Weekly Achievements */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Logros Semanales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.weekly_achievements.slice(0, 9).map((achievement: any) => {
            const completionRate = achievement.total_tasks > 0
              ? Math.round((achievement.tasks_completed / achievement.total_tasks) * 100)
              : 0;

            return (
              <div
                key={achievement.id}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-orange-500 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm text-gray-600">Semana del</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(achievement.week_start).toLocaleDateString('es-CL')}
                    </p>
                  </div>
                  {achievement.premio && (
                    <Award className="w-5 h-5 text-yellow-500" />
                  )}
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Progreso</span>
                    <span className="font-semibold">{completionRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        completionRate === 100 ? 'bg-green-500' :
                        completionRate >= 90 ? 'bg-blue-500' :
                        completionRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>

                <p className="text-sm text-gray-600">
                  {achievement.tasks_completed} de {achievement.total_tasks} tareas
                </p>

                {achievement.premio && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-semibold text-orange-600">
                      🎁 {achievement.premio}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
