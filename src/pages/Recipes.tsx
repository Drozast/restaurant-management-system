import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { api } from '../lib/api';
import { Plus, Trash2, Edit } from 'lucide-react';

export default function Recipes() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [recipesData, ingredientsData] = await Promise.all([
        api.recipes.getAll(),
        api.ingredients.getAll(),
      ]);
      setRecipes(recipesData);
      setIngredients(ingredientsData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta receta?')) return;

    try {
      await api.recipes.delete(id);
      loadData();
    } catch (error) {
      console.error('Error eliminando receta:', error);
    }
  };

  const pizzas = recipes.filter((r) => r.type === 'pizza');
  const tablas = recipes.filter((r) => r.type === 'tabla');

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Recetas</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Nueva Receta
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pizzas */}
        <Card>
          <CardHeader>
            <CardTitle>🍕 Pizzas ({pizzas.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pizzas.map((recipe) => (
                <div
                  key={recipe.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg">{recipe.name}</h3>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(recipe.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-700">Ingredientes:</p>
                    {recipe.ingredients?.map((ing: any) => (
                      <p key={ing.id} className="text-sm text-gray-600">
                        • {ing.ingredient_name}: {ing.quantity} {ing.ingredient_unit}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tablas */}
        <Card>
          <CardHeader>
            <CardTitle>🍽️ Tablas ({tablas.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tablas.map((recipe) => (
                <div
                  key={recipe.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg">{recipe.name}</h3>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(recipe.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-700">Ingredientes:</p>
                    {recipe.ingredients?.map((ing: any) => (
                      <p key={ing.id} className="text-sm text-gray-600">
                        • {ing.ingredient_name}: {ing.quantity} {ing.ingredient_unit}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {showModal && (
        <RecipeModal
          ingredients={ingredients}
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

function RecipeModal({ ingredients, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'pizza' as 'pizza' | 'tabla',
    ingredients: [] as { ingredient_id: number; quantity: number }[],
  });

  const handleAddIngredient = () => {
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, { ingredient_id: 0, quantity: 1 }],
    });
  };

  const handleRemoveIngredient = (index: number) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter((_, i) => i !== index),
    });
  };

  const handleIngredientChange = (index: number, field: string, value: any) => {
    const updated = [...formData.ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, ingredients: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.recipes.create(formData);
      onSuccess();
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Nueva Receta</h2>
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
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value as 'pizza' | 'tabla' })
              }
            >
              <option value="pizza">Pizza</option>
              <option value="tabla">Tabla</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Ingredientes</label>
              <Button type="button" size="sm" onClick={handleAddIngredient}>
                <Plus className="w-4 h-4 mr-1" />
                Agregar
              </Button>
            </div>

            <div className="space-y-2">
              {formData.ingredients.map((ing, index) => (
                <div key={index} className="flex gap-2">
                  <select
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                    value={ing.ingredient_id}
                    onChange={(e) =>
                      handleIngredientChange(index, 'ingredient_id', parseInt(e.target.value))
                    }
                    required
                  >
                    <option value={0}>Seleccionar ingrediente...</option>
                    {ingredients.map((ingredient: any) => (
                      <option key={ingredient.id} value={ingredient.id}>
                        {ingredient.name} ({ingredient.unit})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Cantidad"
                    className="w-24 border border-gray-300 rounded-lg px-3 py-2"
                    value={ing.quantity}
                    onChange={(e) =>
                      handleIngredientChange(index, 'quantity', parseFloat(e.target.value))
                    }
                    required
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={() => handleRemoveIngredient(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              Crear Receta
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
