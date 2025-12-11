import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { api } from '../lib/api';
import { useStore } from '../store/useStore';
import { ShoppingCart, Plus } from 'lucide-react';

export default function Sales() {
  const { currentShift } = useStore();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [recipesData, salesData] = await Promise.all([
        api.recipes.getAll(),
        api.sales.getAll({ date: new Date().toISOString().split('T')[0] }),
      ]);
      setRecipes(recipesData);
      setSales(salesData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  if (!currentShift) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-gray-600">Debes abrir un turno para registrar ventas</p>
      </div>
    );
  }

  const pizzas = recipes.filter((r) => r.type === 'pizza');
  const tablas = recipes.filter((r) => r.type === 'tabla');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Registro de Ventas</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Registrar Venta
        </Button>
      </div>

      {/* Quick Sale Buttons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>🍕 Pizzas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {pizzas.map((recipe) => (
                <QuickSaleButton
                  key={recipe.id}
                  recipe={recipe}
                  currentShift={currentShift}
                  onSuccess={loadData}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🍽️ Tablas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {tablas.map((recipe) => (
                <QuickSaleButton
                  key={recipe.id}
                  recipe={recipe}
                  currentShift={currentShift}
                  onSuccess={loadData}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales History */}
      <Card>
        <CardHeader>
          <CardTitle>Ventas de Hoy</CardTitle>
        </CardHeader>
        <CardContent>
          {sales.length > 0 ? (
            <div className="space-y-2">
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{sale.recipe_name}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(sale.timestamp).toLocaleTimeString('es-ES')}
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">×{sale.quantity}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-600 py-8">No hay ventas registradas hoy</p>
          )}
        </CardContent>
      </Card>

      {showModal && (
        <SaleModal
          recipes={recipes}
          currentShift={currentShift}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            loadData();
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

function QuickSaleButton({ recipe, currentShift, onSuccess }: any) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await api.sales.create({
        shift_id: currentShift.id,
        recipe_id: recipe.id,
        quantity: 1,
      });
      onSuccess();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all disabled:opacity-50 text-left"
    >
      <p className="font-semibold text-gray-900">{recipe.name}</p>
      <p className="text-xs text-gray-600 mt-1">Click para +1</p>
    </button>
  );
}

function SaleModal({ recipes, currentShift, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    recipe_id: 0,
    quantity: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.sales.create({
        shift_id: currentShift.id,
        ...formData,
      });
      onSuccess();
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Registrar Venta</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Receta</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={formData.recipe_id}
              onChange={(e) =>
                setFormData({ ...formData, recipe_id: parseInt(e.target.value) })
              }
              required
            >
              <option value={0}>Seleccionar...</option>
              <optgroup label="Pizzas">
                {recipes
                  .filter((r: any) => r.type === 'pizza')
                  .map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Tablas">
                {recipes
                  .filter((r: any) => r.type === 'tabla')
                  .map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Cantidad</label>
            <input
              type="number"
              min="1"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={formData.quantity}
              onChange={(e) =>
                setFormData({ ...formData, quantity: parseInt(e.target.value) })
              }
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              Registrar
            </Button>
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
