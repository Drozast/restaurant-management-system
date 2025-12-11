import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { api } from '../lib/api';
import { useStore } from '../store/useStore';
import { AlertTriangle, TrendingUp, Clock, Package } from 'lucide-react';

export default function Dashboard() {
  const { ingredients, setIngredients, currentShift, setCurrentShift, alerts } = useStore();
  const [todaySales, setTodaySales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ingredientsData, shiftData, salesData] = await Promise.all([
        api.ingredients.getAll(),
        api.shifts.getCurrent(),
        api.sales.getSummary(new Date().toISOString().split('T')[0]),
      ]);

      setIngredients(ingredientsData);
      setCurrentShift(shiftData);
      setTodaySales(salesData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const criticalIngredients = ingredients.filter(
    (i) => i.current_percentage <= i.critical_threshold
  );

  const warningIngredients = ingredients.filter(
    (i) => i.current_percentage > i.critical_threshold && i.current_percentage <= i.warning_threshold
  );

  const unresolvedAlerts = alerts.filter(a => a.resolved === 0);
  const totalSales = todaySales.reduce((sum, s) => sum + s.total_quantity, 0);

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Alertas Activas</p>
              <p className="text-3xl font-bold text-red-600">{unresolvedAlerts.length}</p>
            </div>
            <AlertTriangle className="w-12 h-12 text-red-600 opacity-20" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ventas Hoy</p>
              <p className="text-3xl font-bold text-green-600">{totalSales}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-600 opacity-20" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Turno Actual</p>
              <p className="text-3xl font-bold text-blue-600">
                {currentShift ? currentShift.type : 'Cerrado'}
              </p>
            </div>
            <Clock className="w-12 h-12 text-blue-600 opacity-20" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Stock Crítico</p>
              <p className="text-3xl font-bold text-orange-600">{criticalIngredients.length}</p>
            </div>
            <Package className="w-12 h-12 text-orange-600 opacity-20" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Ingredients */}
        {criticalIngredients.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Ingredientes Críticos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {criticalIngredients.map((ingredient) => (
                  <div key={ingredient.id}>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{ingredient.name}</span>
                      <span className="text-sm text-gray-600">{ingredient.category}</span>
                    </div>
                    <ProgressBar
                      percentage={ingredient.current_percentage}
                      criticalThreshold={ingredient.critical_threshold}
                      warningThreshold={ingredient.warning_threshold}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Warning Ingredients */}
        {warningIngredients.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-yellow-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Ingredientes en Advertencia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {warningIngredients.slice(0, 5).map((ingredient) => (
                  <div key={ingredient.id}>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{ingredient.name}</span>
                      <span className="text-sm text-gray-600">{ingredient.category}</span>
                    </div>
                    <ProgressBar
                      percentage={ingredient.current_percentage}
                      criticalThreshold={ingredient.critical_threshold}
                      warningThreshold={ingredient.warning_threshold}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Sales */}
        {todaySales.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Ventas de Hoy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todaySales.map((sale, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{sale.name}</p>
                      <p className="text-sm text-gray-600 capitalize">{sale.type}</p>
                    </div>
                    <span className="text-2xl font-bold text-gray-900">
                      {sale.total_quantity}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Shift Info */}
        {currentShift && (
          <Card>
            <CardHeader>
              <CardTitle>Turno Actual - {currentShift.type}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Empleado</p>
                  <p className="font-medium">{currentShift.employee_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tareas Completadas</p>
                  <p className="font-medium">
                    {currentShift.tasks?.filter((t: any) => t.completed).length || 0} /{' '}
                    {currentShift.tasks?.length || 0}
                  </p>
                </div>
                <div className="pt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${
                          currentShift.tasks?.length
                            ? (currentShift.tasks.filter((t: any) => t.completed).length /
                                currentShift.tasks.length) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Alerts */}
      {unresolvedAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Alertas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unresolvedAlerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    alert.type === 'critical'
                      ? 'bg-red-50 border-red-500'
                      : alert.type === 'warning'
                      ? 'bg-yellow-50 border-yellow-500'
                      : 'bg-blue-50 border-blue-500'
                  }`}
                >
                  <p className="font-medium">{alert.message}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(alert.created_at).toLocaleString('es-ES')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
