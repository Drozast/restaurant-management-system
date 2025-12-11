import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Activity } from 'lucide-react';

const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'];

export default function AnalyticsCharts() {
  const [salesTrends, setSalesTrends] = useState<any[]>([]);
  const [topRecipes, setTopRecipes] = useState<any[]>([]);
  const [inventoryDist, setInventoryDist] = useState<any[]>([]);
  const [weeklyTrends, setWeeklyTrends] = useState<any[]>([]);
  const [employeePerf, setEmployeePerf] = useState<any[]>([]);
  const [restockFreq, setRestockFreq] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sales, recipes, inventory, weekly, employees, restock] = await Promise.all([
        api.analytics.getSalesTrends(),
        api.analytics.getTopRecipes(5),
        api.analytics.getInventoryDistribution(),
        api.analytics.getWeeklyTrends(),
        api.analytics.getEmployeePerformance(),
        api.analytics.getRestockFrequency(),
      ]);

      setSalesTrends(sales);
      setTopRecipes(recipes);
      setInventoryDist(inventory);
      setWeeklyTrends(weekly);
      setEmployeePerf(employees);
      setRestockFreq(restock);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Cargando analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Activity className="w-8 h-8 text-orange-500" />
          Analytics y Estadísticas
        </h1>
        <p className="text-gray-600 mt-2">
          Visualiza tendencias, desempeño y métricas clave del negocio
        </p>
      </div>

      {/* Row 1: Sales Trends & Top Recipes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trends */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-bold text-gray-900">Tendencia de Ventas (Últimos 7 Días)</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('es-CL', { month: 'short', day: 'numeric' })}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleDateString('es-CL')}
                formatter={(value: any) => [value, 'Pizzas']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="total_pizzas"
                stroke="#f97316"
                strokeWidth={2}
                name="Pizzas Vendidas"
                dot={{ fill: '#f97316', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Recipes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-bold text-gray-900">Top 5 Pizzas Más Vendidas</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topRecipes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="recipe_name"
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip formatter={(value: any) => [value, 'Cantidad']} />
              <Legend />
              <Bar dataKey="total_quantity" fill="#f97316" name="Unidades Vendidas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Inventory Distribution & Weekly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-bold text-gray-900">Distribución de Inventario</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={inventoryDist}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, count }) => `${name}: ${count}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {inventoryDist.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Completion Trends */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-bold text-gray-900">Tendencia de Completitud Semanal</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="week_start"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('es-CL', { month: 'short', day: 'numeric' })}
              />
              <YAxis domain={[0, 100]} />
              <Tooltip
                labelFormatter={(value) => `Semana del ${new Date(value).toLocaleDateString('es-CL')}`}
                formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Completitud']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="avg_completion"
                stroke="#10b981"
                strokeWidth={2}
                name="% Promedio"
                dot={{ fill: '#10b981', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Employee Performance & Restock Frequency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee Performance */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-bold text-gray-900">Desempeño por Empleado</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={employeePerf} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="employee_name" type="category" width={100} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Completitud']} />
              <Legend />
              <Bar dataKey="avg_completion" fill="#f97316" name="% Completitud Promedio" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Restock Frequency */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-bold text-gray-900">Frecuencia de Restock (Últimos 30 Días)</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={restockFreq}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="ingredient_name"
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis />
              <Tooltip formatter={(value: any) => [value, 'Veces']} />
              <Legend />
              <Bar dataKey="restock_count" fill="#ef4444" name="Cantidad de Restocks" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="text-sm opacity-90">Ventas Totales (7d)</div>
          <div className="text-3xl font-bold mt-2">
            {salesTrends.reduce((sum, day) => sum + (day.total_pizzas || 0), 0)}
          </div>
          <div className="text-xs opacity-75 mt-1">pizzas vendidas</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="text-sm opacity-90">Completitud Promedio</div>
          <div className="text-3xl font-bold mt-2">
            {weeklyTrends.length > 0
              ? (weeklyTrends.reduce((sum, w) => sum + w.avg_completion, 0) / weeklyTrends.length).toFixed(1)
              : '0'}%
          </div>
          <div className="text-xs opacity-75 mt-1">últimas 4 semanas</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="text-sm opacity-90">Empleados Activos</div>
          <div className="text-3xl font-bold mt-2">{employeePerf.length}</div>
          <div className="text-xs opacity-75 mt-1">con registro</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="text-sm opacity-90">Items Críticos</div>
          <div className="text-3xl font-bold mt-2">
            {inventoryDist.find((d) => d.status.includes('Crítico'))?.count || 0}
          </div>
          <div className="text-xs opacity-75 mt-1">requieren restock</div>
        </div>
      </div>
    </div>
  );
}
