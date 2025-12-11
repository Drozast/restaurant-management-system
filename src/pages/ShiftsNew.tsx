import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useStore } from '../store/useStore';
import { Clock, CheckCircle, Circle, XCircle, AlertTriangle, Package } from 'lucide-react';

export default function ShiftsNew() {
  const { currentShift, setCurrentShift, user } = useStore();
  const [loading, setLoading] = useState(true);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    loadCurrentShift();
  }, []);

  const loadCurrentShift = async () => {
    try {
      const shift = await api.shifts.getCurrent();
      setCurrentShift(shift);
    } catch (error) {
      console.error('Error cargando turno:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskId: number, completed: boolean) => {
    if (!currentShift) return;

    try {
      await api.shifts.updateTask(currentShift.id, taskId, !completed);
      loadCurrentShift();
    } catch (error) {
      console.error('Error actualizando tarea:', error);
    }
  };

  const handleCloseShift = async (forceClose = false) => {
    if (!currentShift) return;

    // Verificar si hay tareas pendientes
    const pendingTasks = currentShift.tasks?.filter((t: any) => !t.completed) || [];

    if (pendingTasks.length > 0 && !forceClose) {
      // Si hay tareas pendientes y el usuario es chef, mostrar modal de autorización
      if (user?.role === 'chef') {
        setShowAuthModal(true);
        return;
      } else {
        // Si es empleado, no puede cerrar sin completar todas las tareas
        alert(`No puedes cerrar el turno sin completar todas las tareas. Faltan ${pendingTasks.length} tareas pendientes.`);
        return;
      }
    }

    if (!confirm('¿Estás seguro de cerrar el turno?')) return;

    try {
      await api.shifts.close(currentShift.id);
      loadCurrentShift();
      setShowAuthModal(false);
      alert('Turno cerrado exitosamente');
    } catch (error: any) {
      alert(error.message || 'Error al cerrar turno');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Checklist</h1>
        {!currentShift && (
          <button
            onClick={() => setShowOpenModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors"
          >
            <Clock className="w-5 h-5" />
            Abrir Turno
          </button>
        )}
      </div>

      {currentShift ? (
        <div className="space-y-6">
          {/* Shift Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-lg">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Turno {currentShift.type} - {currentShift.employee_name}
                </h2>
                <p className="text-gray-600 mt-1">
                  {new Date(currentShift.date).toLocaleDateString('es-ES')} •{' '}
                  {new Date(currentShift.start_time).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <span className="px-4 py-2 bg-green-900 text-green-300 rounded-lg text-sm font-semibold">
                Abierto
              </span>
            </div>
          </div>

          {/* Tasks Checklist */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Tareas del Turno
              <span className="ml-3 text-base text-gray-600 font-normal">
                ({currentShift.tasks?.filter((t: any) => t.completed).length || 0} /{' '}
                {currentShift.tasks?.length || 0})
              </span>
            </h2>
            <div className="space-y-2">
              {currentShift.tasks?.map((task: any, index: number) => {
                const previousTask = index > 0 ? currentShift.tasks[index - 1] : null;
                let timeElapsed = null;

                if (task.completed && task.completed_at) {
                  if (previousTask?.completed_at) {
                    // Calcular tiempo entre esta tarea y la anterior
                    const currentTime = new Date(task.completed_at).getTime();
                    const previousTime = new Date(previousTask.completed_at).getTime();
                    const diffMinutes = Math.round((currentTime - previousTime) / 60000);
                    timeElapsed = diffMinutes;
                  } else if (index === 0) {
                    // Para la primera tarea, calcular desde el inicio del turno
                    const taskTime = new Date(task.completed_at).getTime();
                    const shiftTime = new Date(currentShift.start_time).getTime();
                    const diffMinutes = Math.round((taskTime - shiftTime) / 60000);
                    timeElapsed = diffMinutes;
                  }
                }

                return (
                  <div
                    key={task.id}
                    className={`rounded-lg border-2 transition-all ${
                      task.completed
                        ? 'bg-green-950 border-green-800'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className="flex items-center gap-3 p-4 cursor-pointer"
                      onClick={() => handleToggleTask(task.id, task.completed)}
                    >
                      {task.completed ? (
                        <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                      ) : (
                        <Circle className="w-6 h-6 text-dark-500 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <span
                          className={`${
                            task.completed ? 'line-through text-gray-600' : 'text-gray-900'
                          }`}
                        >
                          {task.task_name}
                        </span>
                      </div>
                      {task.completed && task.completed_at && (
                        <div className="text-right">
                          <div className="text-sm font-semibold text-green-300">
                            {new Date(task.completed_at).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          {timeElapsed !== null && (
                            <div className="text-xs text-gray-600">
                              {timeElapsed > 0 ? `+${timeElapsed}` : timeElapsed} min
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Close Shift Button */}
          <div className="flex justify-center">
            <button
              onClick={handleCloseShift}
              className="flex items-center gap-2 px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
            >
              <XCircle className="w-5 h-5" />
              Cerrar Turno
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center shadow-lg">
          <Clock className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No hay turno abierto</h2>
          <p className="text-gray-600 mb-6">
            Abre un nuevo turno para comenzar a trabajar
          </p>
          <button
            onClick={() => setShowOpenModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors"
          >
            <Clock className="w-5 h-5" />
            Abrir Turno
          </button>
        </div>
      )}

      {showOpenModal && (
        <OpenShiftModal
          onClose={() => setShowOpenModal(false)}
          onSuccess={() => {
            loadCurrentShift();
            setShowOpenModal(false);
          }}
        />
      )}

      {showAuthModal && currentShift && (
        <AuthorizationModal
          pendingTasks={currentShift.tasks?.filter((t: any) => !t.completed) || []}
          onClose={() => setShowAuthModal(false)}
          onAuthorize={() => handleCloseShift(true)}
        />
      )}
    </div>
  );
}

function OpenShiftModal({ onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'AM' as 'AM' | 'PM',
    employee_name: '',
  });
  const [miseEnPlace, setMiseEnPlace] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1: form, 2: mise en place
  const user = useStore((state) => state.user);

  useEffect(() => {
    loadMiseEnPlaceCalculation();
  }, []);

  const loadMiseEnPlaceCalculation = async () => {
    try {
      const response = await fetch('/api/shifts/calculate-mise-en-place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();

      if (response.ok) {
        setMiseEnPlace(data.mise_en_place || []);
      } else {
        console.error('Error calculating mise en place:', data);
      }
    } catch (error) {
      console.error('Error loading mise en place:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_name.trim()) {
      alert('Por favor ingresa el nombre del empleado');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.shifts.create({
        ...formData,
        mise_en_place: miseEnPlace.map(item => ({
          ingredient_id: item.ingredient_id,
          quantity: item.quantity,
          unit: item.unit
        }))
      });
      onSuccess();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const updateMiseQuantity = (index: number, newQuantity: number) => {
    const updated = [...miseEnPlace];
    updated[index].quantity = newQuantity;
    setMiseEnPlace(updated);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <p className="text-gray-900">Calculando mise en place...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-4xl my-8 shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Abrir Nuevo Turno</h2>
          <p className="text-gray-600 mt-1">
            Paso {step} de 2: {step === 1 ? 'Información del Turno' : 'Configurar Mise en Place'}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleNext} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
              <input
                type="date"
                required
                className="w-full bg-white border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-orange-500 transition-colors font-medium"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Turno
              </label>
              <select
                className="w-full bg-white border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-orange-500 transition-colors font-medium"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'AM' | 'PM' })}
              >
                <option value="AM">AM (Preparación)</option>
                <option value="PM">PM (Servicio)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Empleado
              </label>
              <input
                type="text"
                required
                placeholder="Nombre completo"
                className="w-full bg-white border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors font-medium"
                value={formData.employee_name}
                onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                autoComplete="off"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
              >
                Siguiente →
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
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700">
                <strong>Mise en Place calculado para 20 pizzas.</strong> Puedes ajustar las cantidades según tu inventario real.
              </p>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-4">
              {miseEnPlace.map((item, index) => (
                <div key={index} className="flex items-center gap-3 bg-gray-100 p-3 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.ingredient_name}</p>
                    <p className="text-xs text-gray-600">{item.unit}</p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={item.quantity}
                    onChange={(e) => updateMiseQuantity(index, parseFloat(e.target.value) || 0)}
                    className="w-24 bg-white border-2 border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-semibold focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-sm text-gray-600 w-8">{item.unit}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold rounded-lg transition-colors"
              >
                ← Atrás
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
              >
                Abrir Turno
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function AuthorizationModal({ pendingTasks, onClose, onAuthorize }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-50 border-2 border-orange-600 rounded-xl p-6 w-full max-w-md shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-8 h-8 text-orange-500" />
          <h2 className="text-2xl font-bold text-gray-900">Autorización Requerida</h2>
        </div>

        <div className="bg-orange-950 border border-orange-800 rounded-lg p-4 mb-6">
          <p className="text-orange-200 mb-2">
            <strong>Atención:</strong> Hay {pendingTasks.length} tarea(s) pendiente(s) sin completar:
          </p>
          <ul className="space-y-1 mt-3">
            {pendingTasks.map((task: any) => (
              <li key={task.id} className="text-sm text-orange-300 flex items-center gap-2">
                <Circle className="w-3 h-3" />
                {task.task_name}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-gray-700 mb-6 text-sm">
          Como Chef/Admin, puedes autorizar el cierre del turno a pesar de las tareas pendientes.
          ¿Deseas continuar?
        </p>

        <div className="flex gap-3">
          <button
            onClick={onAuthorize}
            className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
          >
            Autorizar y Cerrar
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
