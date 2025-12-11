import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { ProgressBar } from '../components/ProgressBar';
import { api } from '../lib/api';
import { useStore } from '../store/useStore';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';

export default function Ingredients() {
  const { ingredients, setIngredients } = useStore();
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<any>(null);

  useEffect(() => {
    loadIngredients();
  }, []);

  const loadIngredients = async () => {
    try {
      const data = await api.ingredients.getAll();
      setIngredients(data);
    } catch (error) {
      console.error('Error cargando ingredientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestock = (ingredient: any) => {
    setSelectedIngredient(ingredient);
    setShowRestockModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este ingrediente?')) return;

    try {
      await api.ingredients.delete(id);
      loadIngredients();
    } catch (error) {
      console.error('Error eliminando ingrediente:', error);
    }
  };

  const categories = [...new Set(ingredients.map((i) => i.category))];

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Ingredientes</h1>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Ingrediente
        </Button>
      </div>

      {categories.map((category) => {
        const categoryIngredients = ingredients.filter((i) => i.category === category);

        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="capitalize">{category}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryIngredients.map((ingredient) => (
                  <div
                    key={ingredient.id}
                    className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium text-lg">{ingredient.name}</span>
                        <span className="text-sm text-gray-600">{ingredient.unit}</span>
                      </div>
                      <ProgressBar
                        percentage={ingredient.current_percentage}
                        criticalThreshold={ingredient.critical_threshold}
                        warningThreshold={ingredient.warning_threshold}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleRestock(ingredient)}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Restoquear
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(ingredient.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {showAddModal && (
        <AddIngredientModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            loadIngredients();
            setShowAddModal(false);
          }}
        />
      )}

      {showRestockModal && selectedIngredient && (
        <RestockModal
          ingredient={selectedIngredient}
          onClose={() => {
            setShowRestockModal(false);
            setSelectedIngredient(null);
          }}
          onSuccess={() => {
            loadIngredients();
            setShowRestockModal(false);
            setSelectedIngredient(null);
          }}
        />
      )}
    </div>
  );
}

function AddIngredientModal({ onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    category: '',
    critical_threshold: 50,
    warning_threshold: 80,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.ingredients.create(formData);
      onSuccess();
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Nuevo Ingrediente</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <input
              type="text"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Unidad</label>
            <input
              type="text"
              required
              placeholder="kg, unidades, L, etc."
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Categoría</label>
            <input
              type="text"
              required
              placeholder="proteínas, vegetales, lácteos, etc."
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Umbral Crítico (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={formData.critical_threshold}
                onChange={(e) =>
                  setFormData({ ...formData, critical_threshold: parseInt(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Umbral Advertencia (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={formData.warning_threshold}
                onChange={(e) =>
                  setFormData({ ...formData, warning_threshold: parseInt(e.target.value) })
                }
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              Crear
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

function RestockModal({ ingredient, onClose, onSuccess }: any) {
  const [newPercentage, setNewPercentage] = useState(100);
  const [authorizedBy, setAuthorizedBy] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.ingredients.restock(ingredient.id, {
        new_percentage: newPercentage,
        authorized_by: authorizedBy,
      });
      onSuccess();
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Restoquear: {ingredient.name}</h2>
        <div className="mb-4 p-3 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-600">Nivel actual</p>
          <p className="text-2xl font-bold">{ingredient.current_percentage}%</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nuevo Porcentaje</label>
            <input
              type="number"
              min="0"
              max="100"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={newPercentage}
              onChange={(e) => setNewPercentage(parseInt(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Autorizado por</label>
            <input
              type="text"
              required
              placeholder="Nombre del encargado"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={authorizedBy}
              onChange={(e) => setAuthorizedBy(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="success" className="flex-1">
              Restoquear
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
