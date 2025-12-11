import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { api } from '../lib/api';
import { Trophy, Star, Award } from 'lucide-react';

export default function Gamification() {
  const [currentWeek, setCurrentWeek] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [weekData, leaderData] = await Promise.all([
        api.gamification.getCurrentWeek(),
        api.gamification.getLeaderboard(10),
      ]);
      setCurrentWeek(weekData);
      setLeaderboard(leaderData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateRewards = async () => {
    try {
      const rewards = await api.gamification.calculateRewards();
      alert(`Se calcularon ${rewards.length} premios`);
      loadData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Gamificación y Premios</h1>
        <Button onClick={handleCalculateRewards}>
          <Trophy className="w-5 h-5 mr-2" />
          Calcular Premios
        </Button>
      </div>

      {/* Current Week Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Desempeño de la Semana Actual</CardTitle>
        </CardHeader>
        <CardContent>
          {currentWeek.length > 0 ? (
            <div className="space-y-4">
              {currentWeek
                .sort((a, b) => {
                  const rateA = (a.tasks_completed / a.total_tasks) * 100;
                  const rateB = (b.tasks_completed / b.total_tasks) * 100;
                  return rateB - rateA;
                })
                .map((achievement, index) => {
                  const completionRate = (achievement.tasks_completed / achievement.total_tasks) * 100;

                  return (
                    <div
                      key={achievement.id}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-200 font-bold text-xl">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-lg">{achievement.employee_name}</p>
                        <p className="text-sm text-gray-600">
                          {achievement.tasks_completed} / {achievement.total_tasks} tareas completadas
                        </p>
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full transition-all"
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-green-600">
                          {completionRate.toFixed(0)}%
                        </p>
                        {achievement.premio && (
                          <p className="text-sm text-yellow-600 font-semibold mt-1">
                            🎁 {achievement.premio}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-center text-gray-600 py-8">
              No hay datos de la semana actual
            </p>
          )}
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-600" />
            Tabla de Líderes (Histórico)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboard.length > 0 ? (
            <div className="space-y-3">
              {leaderboard.map((employee, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-4 p-4 rounded-lg ${
                    index === 0
                      ? 'bg-yellow-50 border-2 border-yellow-400'
                      : index === 1
                      ? 'bg-gray-100 border-2 border-gray-400'
                      : index === 2
                      ? 'bg-orange-50 border-2 border-orange-400'
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white font-bold text-xl">
                    {index === 0 ? (
                      <span className="text-yellow-600">🥇</span>
                    ) : index === 1 ? (
                      <span className="text-gray-600">🥈</span>
                    ) : index === 2 ? (
                      <span className="text-orange-600">🥉</span>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-lg">{employee.employee_name}</p>
                    <p className="text-sm text-gray-600">
                      {employee.total_completed} tareas completadas en {employee.weeks_worked} semana
                      {employee.weeks_worked > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      {parseFloat(employee.completion_rate).toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-600">tasa de completado</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-600 py-8">
              No hay datos históricos disponibles
            </p>
          )}
        </CardContent>
      </Card>

      {/* Rewards Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-6 h-6 text-blue-600" />
            Sistema de Premios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
              <p className="font-bold text-green-900 mb-1">🍕 Pizza Gratis el Sábado</p>
              <p className="text-sm text-green-800">
                Se otorga al empleado que complete el 100% de sus tareas durante la semana
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <p className="font-bold text-blue-900 mb-1">🍺 Cerveza al Final del Turno</p>
              <p className="text-sm text-blue-800">
                Se otorga al empleado que complete el 90% o más de sus tareas
              </p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
              <p className="font-bold text-yellow-900 mb-1">📅 Semana Laboral</p>
              <p className="text-sm text-yellow-800">
                Los premios se calculan semanalmente de martes a sábado
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
