import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface IngredientWithStatus {
  id: number;
  name: string;
  category: string;
  current_percentage: number;
  status: 'optimal' | 'medium' | 'low' | 'critical';
}

interface ConsumptionData {
  total_prepared: number;
  total_consumed: number;
  consumption_percentage: number;
}

interface TopConsumption {
  ingredient_name: string;
  total_consumed: number;
  percentage: number;
}

export default function AnalyticsNew() {
  const [ingredients, setIngredients] = useState<IngredientWithStatus[]>([]);
  const [consumptionData, setConsumptionData] = useState<ConsumptionData>({
    total_prepared: 0,
    total_consumed: 0,
    consumption_percentage: 0,
  });
  const [topConsumption, setTopConsumption] = useState<TopConsumption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const ingredientsRes = await api.ingredients.getAll();

      // Classify ingredients by status
      const classified = ingredientsRes.map((ing: any) => {
        let status: 'optimal' | 'medium' | 'low' | 'critical' = 'optimal';
        const percentage = ing.current_percentage || 100;

        if (percentage < 20) status = 'critical';
        else if (percentage < 40) status = 'low';
        else if (percentage < 70) status = 'medium';

        return {
          ...ing,
          current_percentage: percentage,
          status,
        };
      });

      setIngredients(classified);

      // Calculate consumption data (mock for now - will be real when we have sales tracking)
      const totalPrepared = 1000; // Mock value
      const totalConsumed = 450; // Mock value
      setConsumptionData({
        total_prepared: totalPrepared,
        total_consumed: totalConsumed,
        consumption_percentage: Math.round((totalConsumed / totalPrepared) * 100),
      });

      // Mock top 5 consumed ingredients
      setTopConsumption([
        { ingredient_name: 'Mozzarella', total_consumed: 2500, percentage: 85 },
        { ingredient_name: 'Salsa de tomate', total_consumed: 1800, percentage: 72 },
        { ingredient_name: 'Pepperoni', total_consumed: 1200, percentage: 60 },
        { ingredient_name: 'Champiñones', total_consumed: 800, percentage: 45 },
        { ingredient_name: 'Pimiento', total_consumed: 600, percentage: 35 },
      ]);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusCounts = {
    optimal: ingredients.filter(i => i.status === 'optimal').length,
    medium: ingredients.filter(i => i.status === 'medium').length,
    low: ingredients.filter(i => i.status === 'low').length,
    critical: ingredients.filter(i => i.status === 'critical').length,
  };

  // Group ingredients by category
  const categoryCounts = ingredients.reduce((acc, ing) => {
    const category = ing.category || 'Otros';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-green-500 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">
              Óptimo
            </h3>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-4xl font-bold text-green-600">
            {statusCounts.optimal}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Ingredientes
          </p>
        </div>

        <div className="bg-white border-2 border-yellow-500 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">
              Medio
            </h3>
            <Minus className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-4xl font-bold text-yellow-600">
            {statusCounts.medium}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Ingredientes
          </p>
        </div>

        <div className="bg-white border-2 border-orange-500 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">
              Bajo
            </h3>
            <TrendingDown className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-4xl font-bold text-orange-600">
            {statusCounts.low}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Ingredientes
          </p>
        </div>

        <div className="bg-white border-2 border-red-500 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">
              Crítico
            </h3>
            <TrendingDown className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-4xl font-bold text-red-600">
            {statusCounts.critical}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Ingredientes
          </p>
        </div>
      </div>

      {/* Consumo Total */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Consumo Total
        </h2>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">
                Preparado
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {consumptionData.total_prepared}g
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                Consumido
              </p>
              <p className="text-2xl font-bold text-orange-600">
                {consumptionData.total_consumed}g
              </p>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                Progreso de consumo
              </span>
              <span className="text-sm font-bold text-gray-900">
                {consumptionData.consumption_percentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-orange-500 h-4 rounded-full transition-all"
                style={{ width: `${consumptionData.consumption_percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Two columns: Análisis por Tipo & Top 5 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Análisis por Tipo */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Análisis por Tipo
          </h2>

          <div className="space-y-3">
            {Object.entries(categoryCounts).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {category}
                  </span>
                </div>
                <span className="text-lg font-bold text-gray-900">
                  {count}
                </span>
              </div>
            ))}

            {Object.keys(categoryCounts).length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No hay datos disponibles
              </p>
            )}
          </div>
        </div>

        {/* Top 5 Más Consumidos */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Top 5 Más Consumidos
          </h2>

          <div className="space-y-4">
            {topConsumption.map((item, index) => (
              <div key={item.ingredient_name}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-orange-600">
                      #{index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {item.ingredient_name}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      {item.total_consumed}g
                    </p>
                    <p className="text-xs text-gray-600">
                      {item.percentage}%
                    </p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full transition-all"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}

            {topConsumption.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No hay datos de consumo
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
