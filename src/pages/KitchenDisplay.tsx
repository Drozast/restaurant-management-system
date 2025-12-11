import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { ProgressBar } from '../components/ProgressBar';
import { AlertTriangle } from 'lucide-react';

export default function KitchenDisplay() {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadData();

    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Setup socket listeners
    const socket = getSocket();

    socket.on('ingredient:updated', (ingredient) => {
      setIngredients((prev) =>
        prev.map((i) => (i.id === ingredient.id ? ingredient : i))
      );
    });

    socket.on('ingredient:restocked', (ingredient) => {
      setIngredients((prev) =>
        prev.map((i) => (i.id === ingredient.id ? ingredient : i))
      );
    });

    socket.on('alert:created', (alert) => {
      setAlerts((prev) => [alert, ...prev]);
    });

    socket.on('alert:resolved', (alert) => {
      setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    });

    return () => {
      clearInterval(timeInterval);
      socket.off('ingredient:updated');
      socket.off('ingredient:restocked');
      socket.off('alert:created');
      socket.off('alert:resolved');
    };
  }, []);

  const loadData = async () => {
    try {
      const [ingredientsData, alertsData] = await Promise.all([
        api.ingredients.getAll(),
        api.alerts.getAll(false),
      ]);
      setIngredients(ingredientsData);
      setAlerts(alertsData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const criticalIngredients = ingredients.filter(
    (i) => i.current_percentage <= i.critical_threshold
  );

  const warningIngredients = ingredients.filter(
    (i) =>
      i.current_percentage > i.critical_threshold &&
      i.current_percentage <= i.warning_threshold
  );

  const okIngredients = ingredients.filter(
    (i) => i.current_percentage > i.warning_threshold
  );

  const categories = [...new Set(ingredients.map((i) => i.category))];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-4xl font-bold">🍕 Pantalla de Cocina</h1>
        <div className="text-right">
          <p className="text-3xl font-bold">
            {currentTime.toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          <p className="text-sm text-gray-400">
            {currentTime.toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalIngredients.length > 0 && (
        <div className="mb-6 p-6 bg-red-900 border-4 border-red-500 rounded-lg animate-pulse">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-8 h-8" />
            ¡ALERTA CRÍTICA! - Ingredientes Agotados
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {criticalIngredients.map((ingredient) => (
              <div
                key={ingredient.id}
                className="p-4 bg-red-800 rounded-lg text-center"
              >
                <p className="font-bold text-xl mb-2">{ingredient.name}</p>
                <p className="text-4xl font-bold">{ingredient.current_percentage}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning Alerts */}
      {warningIngredients.length > 0 && (
        <div className="mb-6 p-6 bg-yellow-900 border-4 border-yellow-500 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-7 h-7" />
            Advertencia - Stock Bajo
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {warningIngredients.map((ingredient) => (
              <div
                key={ingredient.id}
                className="p-3 bg-yellow-800 rounded-lg text-center"
              >
                <p className="font-semibold text-lg">{ingredient.name}</p>
                <p className="text-2xl font-bold">{ingredient.current_percentage}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Ingredients by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categories.map((category) => {
          const categoryIngredients = ingredients.filter((i) => i.category === category);

          return (
            <div
              key={category}
              className="bg-gray-800 rounded-lg p-5 border-2 border-gray-700"
            >
              <h3 className="text-2xl font-bold mb-4 capitalize text-blue-400">
                {category}
              </h3>
              <div className="space-y-3">
                {categoryIngredients.map((ingredient) => (
                  <div key={ingredient.id} className="bg-gray-700 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-lg">{ingredient.name}</span>
                      <span
                        className={`text-2xl font-bold ${
                          ingredient.current_percentage <= ingredient.critical_threshold
                            ? 'text-red-400'
                            : ingredient.current_percentage <= ingredient.warning_threshold
                            ? 'text-yellow-400'
                            : 'text-green-400'
                        }`}
                      >
                        {ingredient.current_percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          ingredient.current_percentage <= ingredient.critical_threshold
                            ? 'bg-red-500'
                            : ingredient.current_percentage <= ingredient.warning_threshold
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${ingredient.current_percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* All OK Message */}
      {criticalIngredients.length === 0 && warningIngredients.length === 0 && (
        <div className="mt-6 p-8 bg-green-900 border-4 border-green-500 rounded-lg text-center">
          <h2 className="text-3xl font-bold">✅ Todo el stock está en buen nivel</h2>
        </div>
      )}
    </div>
  );
}
