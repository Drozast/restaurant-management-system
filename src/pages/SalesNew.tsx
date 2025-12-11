import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface Sale {
  id: number;
  recipe_name: string;
  quantity: number;
  timestamp: string;
  size?: string;
}

interface Recipe {
  id: number;
  name: string;
  size: string;
  type: string;
  sauces?: string[];
}

export default function SalesNew() {
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    recipe_name: '',
    size: 'M',
    quantity: 1,
    selected_sauces: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [shiftRes, recipesRes, salesRes] = await Promise.all([
        api.shifts.getCurrent(),
        api.recipes.getAll(),
        api.sales.getAll(),
      ]);

      setCurrentShift(shiftRes);
      setRecipes(recipesRes.filter((r: Recipe) => r.type === 'pizza'));
      setSales(salesRes.filter((s: Sale) => {
        const today = new Date().toISOString().split('T')[0];
        const saleDate = new Date(s.timestamp).toISOString().split('T')[0];
        return saleDate === today;
      }));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Get unique pizza names (without size)
  const uniquePizzas = Array.from(new Set(recipes.map(r => r.name))).sort();

  // Find the selected recipe based on name and size
  const getSelectedRecipe = () => {
    return recipes.find(
      r => r.name === formData.recipe_name && r.size === formData.size
    );
  };

  const handlePizzaChange = (pizzaName: string) => {
    setFormData({ ...formData, recipe_name: pizzaName, selected_sauces: [] });
  };

  const handleSizeChange = (size: string) => {
    setFormData({ ...formData, size, selected_sauces: [] });
  };

  const handleSauceSelect = (sauce: string) => {
    // Solo permite seleccionar UNA salsa (reemplaza la anterior)
    setFormData({
      ...formData,
      selected_sauces: [sauce]
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentShift) {
      alert('No hay un turno abierto');
      return;
    }

    if (!formData.recipe_name) {
      alert('Selecciona una pizza');
      return;
    }

    const recipe = getSelectedRecipe();
    if (!recipe) {
      alert('Receta no encontrada');
      return;
    }

    // If recipe has multiple sauces, require sauce selection
    if (recipe.sauces && recipe.sauces.length > 1 && formData.selected_sauces.length === 0) {
      alert('Debes seleccionar qué salsa se usó');
      return;
    }

    setLoading(true);
    try {
      // Only send selected_sauces if the recipe has multiple sauces
      const requestData: any = {
        shift_id: currentShift.id,
        recipe_id: recipe.id,
        quantity: formData.quantity,
      };

      // Add selected_sauces only if there are multiple sauces and user selected some
      if (recipe.sauces && recipe.sauces.length > 1 && formData.selected_sauces.length > 0) {
        requestData.selected_sauces = formData.selected_sauces;
      }

      const response = await api.sales.create(requestData);

      // Show warning if ingredients are low
      if (response.warning) {
        alert(response.warning);
      }

      // Reset form
      setFormData({
        recipe_name: '',
        size: 'M',
        quantity: 1,
        selected_sauces: [],
      });

      // Reload data
      await loadData();
    } catch (error: any) {
      // Extract error message from API response
      const errorMessage = error.message || 'Error al registrar venta';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Registro de Ventas</h1>

      {/* Registrar Venta Form */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Registrar Venta</h2>

        {!currentShift ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">
              No hay un turno abierto. Debes abrir un turno para registrar ventas.
            </p>
            <button
              onClick={() => window.location.href = '/checklist'}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
            >
              Ir a Abrir Turno
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pizza
              </label>
              <select
                className="w-full bg-white border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-orange-500 transition-colors"
                value={formData.recipe_name}
                onChange={(e) => handlePizzaChange(e.target.value)}
                required
              >
                <option value="">Seleccionar pizza...</option>
                {uniquePizzas.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tamaño
              </label>
              <select
                className="w-full bg-white border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-orange-500 transition-colors"
                value={formData.size}
                onChange={(e) => handleSizeChange(e.target.value)}
                required
              >
                <option value="S">Pequeña (S)</option>
                <option value="M">Mediana (M)</option>
                <option value="L">Grande (L)</option>
              </select>
            </div>

            {/* Sauce selection for pizzas with multiple sauces */}
            {getSelectedRecipe()?.sauces && getSelectedRecipe()!.sauces!.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ¿Qué salsa se usó? *
                </label>
                <div className="space-y-2">
                  {getSelectedRecipe()!.sauces!.map((sauce) => (
                    <label
                      key={sauce}
                      className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                        formData.selected_sauces.includes(sauce)
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-300 hover:border-orange-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="sauce"
                        checked={formData.selected_sauces.includes(sauce)}
                        onChange={() => handleSauceSelect(sauce)}
                        className="w-5 h-5 text-orange-600 border-gray-300 focus:ring-orange-500"
                      />
                      <span className="text-gray-900 font-medium">{sauce}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Solo se descontará la salsa que selecciones del inventario
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cantidad
              </label>
              <input
                type="number"
                min="1"
                required
                className="w-full bg-white border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-orange-500 transition-colors"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Registrando...' : 'Continuar'}
            </button>
          </form>
        )}
      </div>

      {/* Historial de Ventas */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Historial de Ventas</h2>

        {sales.length > 0 ? (
          <div className="space-y-3">
            {sales.map((sale) => (
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
                <span className="text-2xl font-bold text-gray-900">
                  ×{sale.quantity}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {currentShift
                ? 'No hay ventas registradas hoy'
                : 'Abre un turno para comenzar a registrar ventas'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
