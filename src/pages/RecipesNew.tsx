import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Plus, Trash2, Package, X, Edit } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function RecipesNew() {
  const { user } = useStore();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [miseEnPlace, setMiseEnPlace] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPizza, setSelectedPizza] = useState<any>(null);
  const [editingRecipe, setEditingRecipe] = useState<any>(null);

  const isAdmin = user?.role === 'chef';

  useEffect(() => {
    loadData();
    loadMiseEnPlace();

    // Actualizar mise en place cada 15 segundos
    const interval = setInterval(loadMiseEnPlace, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Registrar función global para abrir modal de edición
    (window as any).openEditRecipeModal = (recipe: any) => {
      setEditingRecipe(recipe);
    };

    return () => {
      (window as any).openEditRecipeModal = null;
    };
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

  const loadMiseEnPlace = async () => {
    try {
      const response = await fetch('/api/shifts/current/mise-en-place');
      if (response.ok) {
        const data = await response.json();
        setMiseEnPlace(data.mise_en_place || []);
      } else {
        setMiseEnPlace([]);
      }
    } catch (error) {
      console.error('Error cargando mise en place:', error);
      setMiseEnPlace([]);
    }
  };

  const getMiseStatus = (ingredientName: string) => {
    const mise = miseEnPlace.find((m: any) => m.ingredient_name === ingredientName);
    if (!mise) return null;
    return {
      current: Math.round(mise.current_quantity),
      initial: Math.round(mise.initial_quantity),
      percentage: mise.percentage,
      status: mise.status,
      unit: mise.unit
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'green': return 'text-green-600 bg-green-100';
      case 'yellow': return 'text-yellow-600 bg-yellow-100';
      case 'orange': return 'text-orange-600 bg-orange-100';
      case 'red': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getProgressBarColor = (status: string) => {
    switch (status) {
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-yellow-500';
      case 'orange': return 'bg-orange-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handleDelete = async (id: number, recipeName: string) => {
    const confirmed = confirm(
      `⚠️ ADVERTENCIA: Vas a eliminar la receta "${recipeName}".\n\n` +
      'Esta es una operación crítica que afectará:\n' +
      '- El sistema de ventas\n' +
      '- Los cálculos de inventario\n' +
      '- Los reportes históricos\n\n' +
      '¿Estás completamente seguro de que deseas continuar?'
    );

    if (!confirmed) return;

    // Double confirmation
    const doubleConfirm = prompt(
      `Para confirmar, escribe el nombre de la receta exactamente como aparece: "${recipeName}"`
    );

    if (doubleConfirm !== recipeName) {
      alert('El nombre no coincide. Operación cancelada.');
      return;
    }

    try {
      await api.recipes.delete(id);
      alert(`✅ Receta "${recipeName}" eliminada exitosamente`);
      loadData();
    } catch (error) {
      console.error('Error eliminando receta:', error);
      alert('❌ Error al eliminar la receta');
    }
  };

  // Agrupar pizzas por nombre
  const pizzasByName = recipes
    .filter((r) => r.type === 'pizza')
    .reduce((acc: any, recipe: any) => {
      if (!acc[recipe.name]) {
        acc[recipe.name] = [];
      }
      acc[recipe.name].push(recipe);
      return acc;
    }, {});

  // Ordenar por tamaño: L, M, S
  Object.keys(pizzasByName).forEach(name => {
    pizzasByName[name].sort((a: any, b: any) => {
      const order = { 'L': 1, 'M': 2, 'S': 3 };
      return (order[a.size as keyof typeof order] || 0) - (order[b.size as keyof typeof order] || 0);
    });
  });

  const tablas = recipes.filter((r) => r.type === 'tabla');

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          🍕 Menú por Categorías
        </h1>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors"
          >
            <Plus className="w-5 h-5" />
            Agregar Pizza
          </button>
        )}
      </div>

      {/* Tab de Pizzas */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 inline-block">
        <span className="px-4 py-2 bg-orange-600/20 text-orange-600 rounded font-semibold text-sm">
          PIZZAS
        </span>
        <span className="ml-2 text-gray-600 text-sm">
          {Object.keys(pizzasByName).length} pizzas
        </span>
      </div>

      {/* Grid de Pizzas estilo maqueta */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(pizzasByName).map(([name, pizzas]: [string, any]) => {
          const uniqueIngredients = pizzas[0].ingredients?.length || 0;
          return (
            <div
              key={name}
              className="bg-white border border-gray-200 rounded-lg p-5 hover:border-orange-500 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-3">
                <div
                  onClick={() => setSelectedPizza({ name, pizzas })}
                  className="flex-1 cursor-pointer"
                >
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{name}</h3>
                  <p className="text-gray-600 text-sm">
                    {uniqueIngredients} ingredientes • {pizzas.length} tamaños
                  </p>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {pizzas.map((p: any) => (
                      <button
                        key={`quick-edit-${p.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingRecipe(p);
                        }}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1"
                        title={`Editar tamaño ${p.size}`}
                      >
                        <Edit className="w-3 h-3" />
                        {p.size}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedPizza({ name, pizzas })}
                className="w-full mt-2 px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg text-sm font-medium transition-colors"
              >
                Ver Detalles →
              </button>
            </div>
          );
        })}
      </div>

      {/* Tablas */}
      {tablas.length > 0 && (
        <div className="mt-8">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 inline-block mb-4">
            <span className="px-4 py-2 bg-orange-600/20 text-orange-600 rounded font-semibold text-sm">
              TABLAS
            </span>
            <span className="ml-2 text-gray-600 text-sm">
              {tablas.length} tablas
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tablas.map((tabla) => (
              <div
                key={tabla.id}
                className="bg-white border border-gray-200 rounded-lg p-5"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{tabla.name}</h3>
                    <p className="text-gray-600 text-sm">
                      {tabla.ingredients?.length || 0} ingredientes
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingRecipe(tabla)}
                        className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        title="Editar receta"
                      >
                        <Edit className="w-4 h-4 text-white" />
                      </button>
                      <button
                        onClick={() => handleDelete(tabla.id, tabla.name)}
                        className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                        title="Eliminar receta (requiere confirmación)"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Pizza con detalles */}
      {selectedPizza && (
        <PizzaDetailModal
          pizza={selectedPizza}
          miseEnPlace={miseEnPlace}
          getMiseStatus={getMiseStatus}
          getStatusColor={getStatusColor}
          getProgressBarColor={getProgressBarColor}
          onClose={() => setSelectedPizza(null)}
          onDelete={handleDelete}
          onReload={loadData}
          isAdmin={isAdmin}
        />
      )}

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

      {editingRecipe && (
        <RecipeModal
          ingredients={ingredients}
          editingRecipe={editingRecipe}
          onClose={() => setEditingRecipe(null)}
          onSuccess={() => {
            loadData();
            setEditingRecipe(null);
          }}
        />
      )}
    </div>
  );
}

// Hacer disponible globalmente para el modal de detalles
if (typeof window !== 'undefined') {
  (window as any).openEditRecipeModal = null;
}

function PizzaDetailModal({ pizza, miseEnPlace, getMiseStatus, getStatusColor, getProgressBarColor, onClose, onDelete, onReload, isAdmin }: any) {
  const { name, pizzas } = pizza;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-orange-500 p-6 flex justify-between items-center rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
              <span className="text-3xl">🍕</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{name}</h2>
              <span className="inline-block mt-1 px-3 py-1 bg-white/20 text-white rounded-full text-xs font-semibold">
                PIZZAS
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 bg-gray-50">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-600" />
              Ingredientes y Receta
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Esta pizza requiere {pizzas[0].ingredients?.length || 0} ingredientes diferentes
            </p>
          </div>

          {/* Ingredientes agrupados por tamaño */}
          <div className="space-y-4">
            {(() => {
              // Agrupar salsas si hay múltiples
              const allIngredients = pizzas[0].ingredients || [];
              const sauces = allIngredients.filter((ing: any) =>
                ing.ingredient_name === 'Pomodoro' || ing.ingredient_name === 'Crema' ||
                ing.ingredient_name === 'Pesto' || ing.ingredient_name === 'Salsa BBQ' ||
                ing.ingredient_name === 'Aceite de oliva'
              );
              const nonSauces = allIngredients.filter((ing: any) =>
                ing.ingredient_name !== 'Pomodoro' && ing.ingredient_name !== 'Crema' &&
                ing.ingredient_name !== 'Pesto' && ing.ingredient_name !== 'Salsa BBQ' &&
                ing.ingredient_name !== 'Aceite de oliva'
              );

              const ingredientsToShow = [];

              // Si hay múltiples salsas, agruparlas
              if (sauces.length > 1) {
                ingredientsToShow.push({
                  isGroup: true,
                  ingredient_name: sauces.map((s: any) => s.ingredient_name).join(' o '),
                  ingredient_unit: sauces[0].ingredient_unit,
                  sauces: sauces,
                });
              } else if (sauces.length === 1) {
                ingredientsToShow.push(sauces[0]);
              }

              // Agregar el resto
              ingredientsToShow.push(...nonSauces);

              return ingredientsToShow.map((ing: any, idx: number) => {
                if (ing.isGroup) {
                  // Grupo de salsas
                  const quantities = {
                    L: pizzas.find((p: any) => p.size === 'L')?.ingredients.find((i: any) => i.ingredient_name === ing.sauces[0].ingredient_name)?.quantity || 0,
                    M: pizzas.find((p: any) => p.size === 'M')?.ingredients.find((i: any) => i.ingredient_name === ing.sauces[0].ingredient_name)?.quantity || 0,
                    S: pizzas.find((p: any) => p.size === 'S')?.ingredients.find((i: any) => i.ingredient_name === ing.sauces[0].ingredient_name)?.quantity || 0,
                  };

                  return (
                    <div
                      key={`group-${idx}`}
                      className="bg-white border-2 border-orange-200 rounded-lg p-5 shadow-sm"
                    >
                      {/* Nombre del ingrediente */}
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <h4 className="text-gray-900 font-bold text-lg">{ing.ingredient_name}</h4>
                          <p className="text-xs text-orange-600 mt-1 font-semibold bg-orange-50 px-2 py-1 rounded inline-block">
                            ⚠️ Se usa solo UNA de estas opciones por pizza
                          </p>
                        </div>
                      </div>

                      {/* Gramajes por tamaño */}
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="bg-blue-50 border border-blue-200 rounded p-2">
                          <p className="text-xs text-blue-600 font-medium">Grande</p>
                          <p className="text-blue-900 font-bold">{quantities.L} {ing.ingredient_unit}</p>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded p-2">
                          <p className="text-xs text-green-600 font-medium">Mediana</p>
                          <p className="text-green-900 font-bold">{quantities.M} {ing.ingredient_unit}</p>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded p-2">
                          <p className="text-xs text-purple-600 font-medium">Pequeña</p>
                          <p className="text-purple-900 font-bold">{quantities.S} {ing.ingredient_unit}</p>
                        </div>
                      </div>

                      <div className="text-sm text-gray-500 italic bg-gray-100 p-2 rounded">
                        💡 Al registrar venta se preguntará cuál se usó
                      </div>
                    </div>
                  );
                }

                // Ingrediente normal
                const miseStatus = getMiseStatus(ing.ingredient_name);
                const quantities = {
                  L: pizzas.find((p: any) => p.size === 'L')?.ingredients.find((i: any) => i.ingredient_name === ing.ingredient_name)?.quantity || 0,
                  M: pizzas.find((p: any) => p.size === 'M')?.ingredients.find((i: any) => i.ingredient_name === ing.ingredient_name)?.quantity || 0,
                  S: pizzas.find((p: any) => p.size === 'S')?.ingredients.find((i: any) => i.ingredient_name === ing.ingredient_name)?.quantity || 0,
                };

                return (
                  <div
                    key={idx}
                    className="bg-white border-2 border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Nombre del ingrediente */}
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-gray-900 font-bold text-lg">{ing.ingredient_name}</h4>
                    </div>

                  {/* Gramajes por tamaño */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-blue-50 border border-blue-200 rounded p-2">
                      <p className="text-xs text-blue-600 font-medium">Grande</p>
                      <p className="text-blue-900 font-bold">{quantities.L} {ing.ingredient_unit}</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded p-2">
                      <p className="text-xs text-green-600 font-medium">Mediana</p>
                      <p className="text-green-900 font-bold">{quantities.M} {ing.ingredient_unit}</p>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded p-2">
                      <p className="text-xs text-purple-600 font-medium">Pequeña</p>
                      <p className="text-purple-900 font-bold">{quantities.S} {ing.ingredient_unit}</p>
                    </div>
                  </div>

                  {/* Inventario disponible */}
                  {miseStatus ? (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-700 font-medium">📦 Inventario Disponible</span>
                        <span className="text-sm font-bold text-gray-900">
                          {miseStatus.current}{miseStatus.unit} / {miseStatus.initial}{miseStatus.unit}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                        <div
                          className={`h-3 rounded-full transition-all ${getProgressBarColor(miseStatus.status)}`}
                          style={{ width: `${miseStatus.percentage}%` }}
                        />
                      </div>

                      {/* Status badge */}
                      <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(miseStatus.status)}`}>
                        {miseStatus.percentage}% disponible
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic bg-gray-100 p-2 rounded">
                      ⏸️ No hay turno abierto con mise en place
                    </div>
                  )}
                </div>
              );
              });
            })()}
          </div>

          {/* Botones de acción - Solo para administradores */}
          {isAdmin && (
            <div className="mt-6 pt-6 border-t-2 border-gray-300 space-y-3 bg-white p-4 rounded-lg">
              {/* Botones de editar */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2 uppercase">Editar Receta</p>
                <div className="flex gap-3">
                  {pizzas.map((p: any) => {
                    const sizeLabel = p.size === 'L' ? 'Grande' : p.size === 'M' ? 'Mediana' : 'Pequeña';
                    return (
                      <button
                        key={`edit-${p.id}`}
                        onClick={() => {
                          onClose();
                          // Llamar función para abrir modal de edición
                          if (window.openEditRecipeModal) {
                            window.openEditRecipeModal(p);
                          }
                        }}
                        className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-semibold flex items-center justify-center gap-2 shadow-md"
                      >
                        <Edit className="w-4 h-4" />
                        {sizeLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Botones de eliminar */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2 uppercase">Eliminar Tamaño</p>
                <div className="flex gap-3">
                  {pizzas.map((p: any) => {
                    const sizeLabel = p.size === 'L' ? 'Grande' : p.size === 'M' ? 'Mediana' : 'Pequeña';
                    return (
                      <button
                        key={`delete-${p.id}`}
                        onClick={async () => {
                          if (confirm(`¿Eliminar ${name} tamaño ${sizeLabel}?`)) {
                            await onDelete(p.id, name);
                            onReload();
                            // Si no quedan más tamaños, cerrar modal
                            const remaining = pizzas.filter((x: any) => x.id !== p.id);
                            if (remaining.length === 0) {
                              onClose();
                            }
                          }
                        }}
                        className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-semibold shadow-md"
                      >
                        🗑️ {sizeLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          {!isAdmin && (
            <div className="mt-6 pt-6 border-t-2 border-gray-300 bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-800 text-center font-medium">
                🔒 Solo los administradores pueden editar o eliminar recetas
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecipeModal({ ingredients, editingRecipe, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    name: editingRecipe?.name || '',
    type: (editingRecipe?.type || 'pizza') as 'pizza' | 'tabla',
    size: (editingRecipe?.size || 'M') as 'S' | 'M' | 'L',
    ingredients: editingRecipe?.ingredients?.map((ing: any) => ({
      ingredient_id: ing.ingredient_id,
      quantity: ing.quantity
    })) || [] as { ingredient_id: number; quantity: number }[],
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
      if (editingRecipe) {
        await api.recipes.update(editingRecipe.id, formData);
        alert('✅ Receta actualizada exitosamente');
      } else {
        await api.recipes.create(formData);
        alert('✅ Receta creada exitosamente');
      }
      onSuccess();
    } catch (error: any) {
      alert('❌ Error: ' + error.message);
    }
  };

  const getSizeLabel = (size: string) => {
    switch (size) {
      case 'L': return 'Grande (Familiar)';
      case 'M': return 'Mediana';
      case 'S': return 'Pequeña (Individual)';
      default: return size;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {editingRecipe ? '✏️ Editar Receta' : '➕ Nueva Receta'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Nombre</label>
            <input
              type="text"
              required
              className="w-full bg-white border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors font-medium"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Margarita"
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Tipo</label>
              <select
                className="w-full bg-white border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-orange-500 transition-colors font-medium"
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as 'pizza' | 'tabla' })
                }
              >
                <option value="pizza">🍕 Pizza</option>
                <option value="tabla">🍽️ Tabla</option>
              </select>
            </div>

            {formData.type === 'pizza' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tamaño</label>
                <select
                  className="w-full bg-white border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-orange-500 transition-colors font-medium"
                  value={formData.size}
                  onChange={(e) =>
                    setFormData({ ...formData, size: e.target.value as 'S' | 'M' | 'L' })
                  }
                >
                  <option value="S">Pequeña (Individual)</option>
                  <option value="M">Mediana</option>
                  <option value="L">Grande (Familiar)</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-bold text-gray-700">Ingredientes</label>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="flex items-center gap-1 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors font-semibold"
              >
                <Plus className="w-4 h-4" />
                Agregar
              </button>
            </div>

            <div className="space-y-2">
              {formData.ingredients.map((ing, index) => (
                <div key={index} className="flex gap-2">
                  <select
                    className="flex-1 bg-white border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-orange-500 transition-colors font-medium"
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
                    step="0.01"
                    min="0.01"
                    placeholder="Cantidad"
                    className="w-28 bg-white border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors font-medium"
                    value={ing.quantity}
                    onChange={(e) =>
                      handleIngredientChange(index, 'quantity', parseFloat(e.target.value))
                    }
                    required
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(index)}
                    className="p-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t-2 border-gray-200">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-colors shadow-md"
            >
              {editingRecipe ? 'Actualizar Receta' : 'Crear Receta'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
