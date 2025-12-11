import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface Sale {
  id: number;
  recipe_name: string;
  quantity: number;
  timestamp: string;
  size?: string;
}

interface Alert {
  id: number;
  ingredient_name: string;
  current_percentage: number;
  resolved: boolean;
  created_at: string;
  resolved_at?: string;
}

export default function HistorialNew() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [salesRes] = await Promise.all([
        api.sales.getAll(),
      ]);

      // Filter sales for today
      const today = new Date().toISOString().split('T')[0];
      const todaySales = salesRes.filter((s: Sale) => {
        const saleDate = new Date(s.timestamp).toISOString().split('T')[0];
        return saleDate === today;
      });

      setSales(todaySales);
      // TODO: Load alerts from API when endpoint is ready
      setAlerts([]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalTransactions = sales.length;
  const resolvedAlerts = alerts.filter(a => a.resolved).length;
  const pendingAlerts = alerts.filter(a => !a.resolved).length;

  // Group sales by hour
  const salesByHour = sales.reduce((acc, sale) => {
    const hour = new Date(sale.timestamp).getHours();
    acc[hour] = (acc[hour] || 0) + sale.quantity;
    return acc;
  }, {} as Record<number, number>);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Historial</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
          <h3 className="text-sm font-medium text-gray-600 mb-2">
            Total Transacciones
          </h3>
          <p className="text-3xl font-bold text-gray-900">
            {totalTransactions}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {totalTransactions === 1 ? '1 registro' : `${totalTransactions} registros`}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
          <h3 className="text-sm font-medium text-gray-600 mb-2">
            Alertas Resueltas
          </h3>
          <p className="text-3xl font-bold text-green-600">
            {resolvedAlerts}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {resolvedAlerts === 1 ? '1 reposición completada' : `${resolvedAlerts} reposiciones completadas`}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
          <h3 className="text-sm font-medium text-gray-600 mb-2">
            Alertas Pendientes
          </h3>
          <p className="text-3xl font-bold text-orange-600">
            {pendingAlerts}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {pendingAlerts === 1 ? '1 por resolver' : `${pendingAlerts} por resolver`}
          </p>
        </div>
      </div>

      {/* Actividad por Hora */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Actividad por Hora
        </h2>

        {Object.keys(salesByHour).length > 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 24 }, (_, i) => i)
              .filter(hour => salesByHour[hour])
              .map(hour => (
                <div key={hour} className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700 w-20">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                  <div className="flex-1 bg-gray-200 rounded-full h-8">
                    <div
                      className="bg-orange-500 h-8 rounded-full flex items-center justify-end px-3"
                      style={{
                        width: `${Math.min((salesByHour[hour] / Math.max(...Object.values(salesByHour))) * 100, 100)}%`
                      }}
                    >
                      <span className="text-sm font-bold text-white">
                        {salesByHour[hour]}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">
              No hay actividad registrada hoy
            </p>
          </div>
        )}
      </div>

      {/* Últimas Ventas */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Últimas Ventas
        </h2>

        {sales.length > 0 ? (
          <div className="space-y-2">
            {sales.slice(0, 10).map((sale) => (
              <div
                key={sale.id}
                className="flex justify-between items-center p-4 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <div>
                  <p className="font-semibold text-gray-900">
                    {sale.recipe_name} {sale.size ? `(${sale.size})` : ''}
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(sale.timestamp).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <span className="text-xl font-bold text-gray-900">
                  ×{sale.quantity}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">
              No hay ventas registradas hoy
            </p>
          </div>
        )}
      </div>

      {/* Historial de Alertas */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Historial de Alertas
        </h2>

        {alerts.length > 0 ? (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex justify-between items-center p-4 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <div>
                  <p className="font-semibold text-gray-900">
                    {alert.ingredient_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    Nivel: {alert.current_percentage}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(alert.created_at).toLocaleString('es-ES')}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  alert.resolved
                    ? 'bg-green-100 text-green-800'
                    : 'bg-orange-100 text-orange-800'
                }`}>
                  {alert.resolved ? 'Resuelta' : 'Pendiente'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">
              No hay alertas registradas
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
