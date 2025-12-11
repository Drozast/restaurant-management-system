import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { api } from '../lib/api';
import { useStore } from '../store/useStore';
import { Clock, CheckCircle, Circle, XCircle } from 'lucide-react';

export default function Shifts() {
  const { currentShift, setCurrentShift } = useStore();
  const [loading, setLoading] = useState(true);
  const [showOpenModal, setShowOpenModal] = useState(false);

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

  const handleCloseShift = async () => {
    if (!currentShift) return;

    if (!confirm('¿Estás seguro de cerrar el turno?')) return;

    try {
      await api.shifts.close(currentShift.id);
      loadCurrentShift();
      alert('Turno cerrado exitosamente');
    } catch (error: any) {
      alert(error.message || 'Error al cerrar turno');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Control de Turnos</h1>
        {!currentShift && (
          <Button onClick={() => setShowOpenModal(true)}>
            <Clock className="w-5 h-5 mr-2" />
            Abrir Turno
          </Button>
        )}
      </div>

      {currentShift ? (
        <div className="space-y-6">
          {/* Shift Info */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Turno {currentShift.type} - {currentShift.employee_name}</CardTitle>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                  Abierto
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Fecha</p>
                  <p className="font-medium">{new Date(currentShift.date).toLocaleDateString('es-ES')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Hora de inicio</p>
                  <p className="font-medium">
                    {new Date(currentShift.start_time).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tasks Checklist */}
          <Card>
            <CardHeader>
              <CardTitle>
                Checklist de Tareas
                <span className="ml-3 text-sm text-gray-600">
                  ({currentShift.tasks?.filter((t: any) => t.completed).length || 0} /{' '}
                  {currentShift.tasks?.length || 0})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {currentShift.tasks?.map((task: any) => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors cursor-pointer ${
                      task.completed
                        ? 'bg-green-50 border-green-200'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleToggleTask(task.id, task.completed)}
                  >
                    {task.completed ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-400" />
                    )}
                    <span
                      className={`flex-1 ${
                        task.completed ? 'line-through text-gray-600' : 'text-gray-900'
                      }`}
                    >
                      {task.task_name}
                    </span>
                    {task.completed && task.completed_at && (
                      <span className="text-xs text-gray-500">
                        {new Date(task.completed_at).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Close Shift Button */}
          <div className="flex justify-center">
            <Button variant="danger" onClick={handleCloseShift}>
              <XCircle className="w-5 h-5 mr-2" />
              Cerrar Turno
            </Button>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No hay turno abierto</h2>
            <p className="text-gray-600 mb-4">Abre un nuevo turno para comenzar a trabajar</p>
            <Button onClick={() => setShowOpenModal(true)}>
              <Clock className="w-5 h-5 mr-2" />
              Abrir Turno
            </Button>
          </CardContent>
        </Card>
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
    </div>
  );
}

function OpenShiftModal({ onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'AM' as 'AM' | 'PM',
    employee_name: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.shifts.create(formData);
      onSuccess();
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Abrir Nuevo Turno</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Fecha</label>
            <input
              type="date"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tipo de Turno</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'AM' | 'PM' })}
            >
              <option value="AM">AM (Preparación)</option>
              <option value="PM">PM (Servicio)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Nombre del Empleado</label>
            <input
              type="text"
              required
              placeholder="Nombre completo"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={formData.employee_name}
              onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              Abrir Turno
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
