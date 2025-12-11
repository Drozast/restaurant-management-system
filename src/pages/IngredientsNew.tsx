import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useStore } from '../store/useStore';
import { Plus, RefreshCw, Trash2, Edit } from 'lucide-react';
import { getSocket } from '../lib/socket';

export default function IngredientsNew() {
  const { ingredients: rawIngredients, setIngredients } = useStore();
  const user = useStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showEditMaxModal, setShowEditMaxModal] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<any>(null);
  const [editingIngredients, setEditingIngredients] = useState<any[]>([]);
  const [isRestocking, setIsRestocking] = useState(false);

  // Ensure ingredients is always an array
  const ingredients = Array.isArray(rawIngredients) ? rawIngredients : [];

  useEffect(() => {
    loadIngredients();

    // Set up socket listeners for real-time updates
    const socket = getSocket();

    socket.on('ingredient:updated', (updatedIngredient) => {
      // Ignore socket updates during restock to prevent state conflicts
      if (isRestocking) return;

      setIngredients((prev: any[]) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((ing) => (ing.id === updatedIngredient.id ? updatedIngredient : ing));
      });
    });

    socket.on('ingredient:created', () => {
      loadIngredients();
    });

    socket.on('ingredient:deleted', (deletedId) => {
      setIngredients((prev: any[]) => {
        if (!Array.isArray(prev)) return prev;
        return prev.filter((ing) => ing.id !== deletedId);
      });
    });

    return () => {
      socket.off('ingredient:updated');
      socket.off('ingredient:created');
      socket.off('ingredient:deleted');
    };
  }, [isRestocking]);

  const loadIngredients = async () => {
    try {
      const data = await api.ingredients.getAll();
      // Ensure data is always an array before setting
      if (Array.isArray(data)) {
        setIngredients(data);
      } else {
        console.error('API returned non-array data:', data);
        setIngredients([]);
      }
    } catch (error) {
      console.error('Error cargando ingredientes:', error);
      setIngredients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRestock = (ingredient: any) => {
    setSelectedIngredient(ingredient);
    setShowRestockModal(true);
  };

  const handleDelete = async (id: number, ingredientName: string) => {
    const confirmed = confirm(
      `⚠️ ADVERTENCIA: Vas a eliminar el ingrediente "${ingredientName}".\n\n` +
      'Esta es una operación crítica que afectará:\n' +
      '- Todas las recetas que usan este ingrediente\n' +
      '- El sistema de ventas\n' +
      '- Los cálculos de inventario\n' +
      '- La lista de compras\n\n' +
      '¿Estás completamente seguro de que deseas continuar?'
    );

    if (!confirmed) return;

    // Double confirmation
    const doubleConfirm = prompt(
      `Para confirmar, escribe el nombre del ingrediente exactamente: "${ingredientName}"`
    );

    if (doubleConfirm !== ingredientName) {
      alert('El nombre no coincide. Operación cancelada.');
      return;
    }

    try {
      await api.ingredients.delete(id);
      alert(`✅ Ingrediente "${ingredientName}" eliminado exitosamente`);
      loadIngredients();
    } catch (error: any) {
      console.error('Error eliminando ingrediente:', error);
      alert('❌ Error al eliminar ingrediente: ' + (error.message || 'Error desconocido'));
    }
  };

  const getPercentageColor = (percentage: number, critical: number, warning: number) => {
    if (percentage <= critical) return 'bg-red-500';
    if (percentage <= warning) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const categories = [...new Set(ingredients.map((i) => i.category))];

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Cargando...</div>;
  }

  // Separar masas del resto de ingredientes
  const masas = ingredients
    .filter((i) => i.category === 'masas')
    .sort((a, b) => {
      // Ordenar: L (Grande) -> M (Mediana) -> S (Pequeña)
      const order: any = { 'L': 1, 'M': 2, 'S': 3 };
      const sizeA = a.name.includes('(L)') ? 'L' : a.name.includes('(M)') ? 'M' : 'S';
      const sizeB = b.name.includes('(L)') ? 'L' : b.name.includes('(M)') ? 'M' : 'S';
      return order[sizeA] - order[sizeB];
    });
  const otherIngredients = ingredients.filter((i) => i.category !== 'masas');
  const otherCategories = [...new Set(otherIngredients.map((i) => i.category))];

  // Calcular totales de masas
  const totalMasasDisponibles = masas.reduce((sum, m) =>
    sum + (m.current_quantity || Math.round((m.current_percentage / 100) * (m.total_quantity || 20))), 0
  );
  const totalMasasCapacidad = masas.reduce((sum, m) => sum + (m.total_quantity || 20), 0);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Inventario Real</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo
        </button>
      </div>

      {/* Sección Masas Disponibles */}
      {masas.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              🍕 Masas Disponibles
            </h2>
            <span className="text-sm font-semibold text-gray-700">
              {totalMasasDisponibles} / {totalMasasCapacidad}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {masas.map((masa) => {
              const cantidad = masa.current_quantity || Math.round((masa.current_percentage / 100) * (masa.total_quantity || 20));
              const maxCantidad = masa.total_quantity || 20;
              const percentage = masa.current_percentage || Math.round((cantidad / maxCantidad) * 100);

              // Determinar color según disponibilidad
              let colorClass = 'text-green-600';
              if (percentage < 30) colorClass = 'text-red-600';
              else if (percentage < 50) colorClass = 'text-orange-600';
              else if (percentage < 70) colorClass = 'text-yellow-600';

              return (
                <div key={masa.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center hover:border-orange-500 transition-colors">
                  <div className={`text-4xl font-bold ${colorClass} mb-1`}>
                    {cantidad}
                  </div>
                  <div className="text-gray-700 text-xs font-semibold mb-1">
                    {masa.name}
                  </div>
                  <div className="text-[10px] text-gray-500 mb-2">
                    Max: {maxCantidad}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        percentage < 30 ? 'bg-red-500' :
                        percentage < 50 ? 'bg-orange-500' :
                        percentage < 70 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-gray-600 mt-1 mb-2">
                    {percentage}%
                  </div>
                  <button
                    onClick={() => handleRestock(masa)}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-semibold py-1 px-2 rounded transition-colors"
                  >
                    + Restock
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inventario Actual */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">Inventario Actual</h2>
          {user?.role === 'chef' && (
            <button
              onClick={() => {
                setEditingIngredients(ingredients.map(i => ({ ...i })));
                setShowEditMaxModal(true);
              }}
              className="flex items-center gap-2 px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <Edit className="w-3 h-3" />
              Editar Máximos
            </button>
          )}
        </div>

        {otherCategories.map((category) => {
          const categoryIngredients = otherIngredients.filter((i) => i.category === category);

          return (
            <div key={category} className="space-y-2">
              <h2 className="text-base font-bold text-gray-900 capitalize">{category}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {categoryIngredients.map((ingredient) => (
                  <div
                    key={ingredient.id}
                    className="bg-white border border-gray-200 rounded-lg p-2 hover:border-orange-500 transition-colors shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-xs text-gray-900 leading-tight">
                        {ingredient.name}
                      </span>
                      <button
                        onClick={() => handleRestock(ingredient)}
                        className="text-gray-500 hover:text-gray-900 flex-shrink-0 ml-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="mb-2">
                      <div className="text-[10px] text-gray-600 mb-0.5">
                        {ingredient.current_quantity || Math.round((ingredient.current_percentage / 100) * (ingredient.total_quantity || 1000))}{ingredient.unit} / {ingredient.total_quantity || 1000}{ingredient.unit}
                      </div>
                      <div className="text-xl font-bold text-green-600">
                        {ingredient.current_percentage}%
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all ${getPercentageColor(
                          ingredient.current_percentage,
                          ingredient.critical_threshold,
                          ingredient.warning_threshold
                        )}`}
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

      {showAddModal && (
        <AddIngredientModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            loadIngredients();
            setShowAddModal(false);
          }}
        />
      )}

      {showEditMaxModal && (
        <EditMaxModal
          ingredients={editingIngredients}
          onClose={() => setShowEditMaxModal(false)}
          onSave={async (updatedIngredients) => {
            try {
              for (const ing of updatedIngredients) {
                await api.ingredients.update(ing.id, {
                  total_quantity: ing.total_quantity,
                  current_quantity: ing.current_quantity,
                });
              }
              await loadIngredients();
              setShowEditMaxModal(false);
              alert('✅ Cantidades máximas actualizadas');
            } catch (error) {
              alert('Error al actualizar ingredientes');
            }
          }}
        />
      )}

      {showRestockModal && selectedIngredient && (
        <RestockModal
          ingredient={selectedIngredient}
          onClose={() => {
            setShowRestockModal(false);
            setSelectedIngredient(null);
            setIsRestocking(false);
          }}
          onSuccess={async () => {
            setIsRestocking(true);
            await loadIngredients();
            setShowRestockModal(false);
            setSelectedIngredient(null);
            // Re-enable socket updates after a small delay
            setTimeout(() => setIsRestocking(false), 500);
          }}
        />
      )}
    </div>
  );
}

function AddIngredientModal({ onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    name: '',
    unit: 'g',
    category: '',
    critical_threshold: 20,
    warning_threshold: 50,
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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Nuevo Ingrediente</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
            <input
              type="text"
              required
              className="w-full bg-gray-50 border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors font-medium"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Unidad de Medida</label>
            <select
              className="w-full bg-gray-50 border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-orange-500 transition-colors font-medium"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            >
              <optgroup label="Peso">
                <option value="kg">Kilogramos (kg)</option>
                <option value="g">Gramos (g)</option>
              </optgroup>
              <optgroup label="Volumen">
                <option value="L">Litros (L)</option>
                <option value="ml">Mililitros (ml)</option>
                <option value="cc">Centímetros cúbicos (cc)</option>
              </optgroup>
              <optgroup label="Cantidad">
                <option value="unidades">Unidades</option>
                <option value="piezas">Piezas</option>
              </optgroup>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
            <input
              type="text"
              required
              placeholder="proteínas, vegetales, lácteos, etc."
              className="w-full bg-gray-50 border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors font-medium"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              autoComplete="off"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Umbral Crítico (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                className="w-full bg-gray-50 border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-orange-500 transition-colors font-medium"
                value={formData.critical_threshold}
                onChange={(e) =>
                  setFormData({ ...formData, critical_threshold: parseInt(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Umbral Advertencia (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                className="w-full bg-gray-50 border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-orange-500 transition-colors font-medium"
                value={formData.warning_threshold}
                onChange={(e) =>
                  setFormData({ ...formData, warning_threshold: parseInt(e.target.value) })
                }
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
            >
              Crear
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RestockModal({ ingredient, onClose, onSuccess }: any) {
  const currentQuantity = ingredient.current_quantity || Math.round((ingredient.current_percentage / 100) * (ingredient.total_quantity || 1000));
  const maxQuantity = ingredient.total_quantity || 1000;

  const [addedQuantity, setAddedQuantity] = useState(0);
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');

  // Format RUT with dash
  const formatRut = (value: string) => {
    const cleaned = value.replace(/[^0-9kK]/g, '');
    const limited = cleaned.slice(0, 9);
    if (limited.length > 1) {
      return limited.slice(0, -1) + '-' + limited.slice(-1);
    }
    return limited;
  };

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRut(e.target.value);
    setRut(formatted);
  };

  const newTotal = currentQuantity + addedQuantity;
  const newPercentage = maxQuantity > 0 ? Math.round((newTotal / maxQuantity) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (addedQuantity <= 0) {
      alert('Debes agregar una cantidad mayor a 0');
      return;
    }

    try {
      // Send credentials with restock request (backend will verify without creating session)
      await api.ingredients.restock(ingredient.id, {
        added_quantity: addedQuantity,
        new_quantity: newTotal,
        new_percentage: newPercentage,
        authorized_rut: rut,
        authorized_password: password,
      });

      onSuccess();
    } catch (error: any) {
      alert(error.message || 'Error al restoquear. Verifica tus credenciales.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Restoquear: {ingredient.name}
        </h2>

        <div className="mb-6 p-4 bg-gray-100 rounded-lg space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">Cantidad actual</p>
            <p className="text-lg font-bold text-gray-900">
              {currentQuantity} {ingredient.unit}
            </p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">Cantidad máxima</p>
            <p className="text-sm font-semibold text-gray-700">
              {maxQuantity} {ingredient.unit}
            </p>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-300">
            <p className="text-sm text-gray-600">Nivel actual</p>
            <p className="text-2xl font-bold text-orange-600">
              {ingredient.current_percentage}%
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cantidad a agregar ({ingredient.unit})
            </label>
            <input
              type="number"
              min="0"
              step="any"
              required
              className="w-full bg-gray-50 border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-orange-500 transition-colors font-medium"
              value={addedQuantity}
              onChange={(e) => setAddedQuantity(parseFloat(e.target.value) || 0)}
            />
          </div>

          {addedQuantity > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                Nueva cantidad: <strong>{newTotal} {ingredient.unit}</strong> ({newPercentage}%)
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-gray-300">
            <p className="text-sm font-semibold text-gray-900 mb-3">
              Autorización (Solo Admin)
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RUT
                </label>
                <input
                  type="text"
                  required
                  placeholder="12345678-9"
                  maxLength={10}
                  className="w-full bg-gray-50 border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors font-medium"
                  value={rut}
                  onChange={handleRutChange}
                  autoComplete="off"
                />
                <p className="text-xs text-gray-500 mt-1">Ingresa tu RUT sin puntos</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-gray-50 border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
            >
              Restoquear
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditMaxModal({ ingredients, onClose, onSave }: any) {
  const [editedIngredients, setEditedIngredients] = useState(ingredients);

  const handleChange = (id: number, field: string, value: number) => {
    setEditedIngredients((prev: any[]) =>
      prev.map((ing: any) =>
        ing.id === id ? { ...ing, [field]: value } : ing
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editedIngredients);
  };

  // Separate masas from other ingredients
  const masas = editedIngredients.filter((i: any) => i.category === 'masas');
  const others = editedIngredients.filter((i: any) => i.category !== 'masas');

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-4xl shadow-2xl my-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Editar Cantidades Máximas
        </h2>
        <p className="text-gray-600 mb-6 text-sm">
          Configura las cantidades máximas y actuales de cada ingrediente
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Masas Section */}
          {masas.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-orange-600 mb-3">
                🍕 Masas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {masas.map((ing: any) => (
                  <div key={ing.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="font-semibold text-gray-900 mb-3">{ing.name}</p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Cantidad Actual ({ing.unit})
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={ing.current_quantity || 0}
                          onChange={(e) => handleChange(ing.id, 'current_quantity', parseFloat(e.target.value) || 0)}
                          className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Cantidad Máxima ({ing.unit})
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="any"
                          value={ing.total_quantity || 0}
                          onChange={(e) => handleChange(ing.id, 'total_quantity', parseFloat(e.target.value) || 0)}
                          className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other Ingredients */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              Otros Ingredientes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {others.map((ing: any) => (
                <div key={ing.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="font-semibold text-gray-900 text-sm mb-2">{ing.name}</p>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Actual ({ing.unit})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={ing.current_quantity || 0}
                        onChange={(e) => handleChange(ing.id, 'current_quantity', parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Máximo ({ing.unit})
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={ing.total_quantity || 0}
                        onChange={(e) => handleChange(ing.id, 'total_quantity', parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm text-gray-900"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
            >
              Guardar Cambios
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
