import { useState, useEffect } from 'react';
import { Clock, Check, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

interface ChecklistItem {
  id: number;
  task_name: string;
  completed: number;
  completed_at?: string;
}

interface ChecklistSection {
  title: string;
  items: ChecklistItem[];
}

export default function ChecklistNew() {
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [sections, setSections] = useState<ChecklistSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signForm, setSignForm] = useState({ rut: '', password: '' });
  const [signError, setSignError] = useState('');
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    loadCurrentShift();
  }, []);

  const loadCurrentShift = async () => {
    try {
      const shift = await api.shifts.getCurrent();

      if (!shift) {
        setCurrentShift(null);
        setSections([]);
        return;
      }

      setCurrentShift(shift);

      // Group tasks into sections
      const tasks = shift.tasks || [];
      const grouped: ChecklistSection[] = [
        { title: 'Apertura', items: tasks.slice(0, 4) },
        { title: 'Preparación', items: tasks.slice(4, 12) },
        { title: 'Limpieza', items: tasks.slice(12, 16) },
        { title: 'Seguridad e Higiene', items: tasks.slice(16, 20) },
        { title: 'Organización', items: tasks.slice(20, 22) },
      ];

      setSections(grouped);
    } catch (error) {
      console.error('Error loading shift:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (taskId: number, currentStatus: number) => {
    if (!currentShift || currentShift.checklist_signed) return;

    try {
      await fetch(`/api/shifts/${currentShift.id}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !currentStatus }),
      });

      // Reload shift to get updated data
      await loadCurrentShift();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleSignClick = () => {
    setShowSignModal(true);
    setSignError('');
    setSignForm({ rut: '', password: '' });
  };

  const handleSignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigning(true);
    setSignError('');

    try {
      const response = await fetch(`/api/shifts/${currentShift.id}/sign-checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signForm),
      });

      const data = await response.json();

      if (!response.ok) {
        setSignError(data.error || 'Error al firmar checklist');
        setSigning(false);
        return;
      }

      // Success!
      setShowSignModal(false);
      await loadCurrentShift();
      alert(`✅ ${data.message}`);
    } catch (error) {
      setSignError('Error de conexión al firmar checklist');
      setSigning(false);
    }
  };

  const totalTasks = sections.reduce((sum, section) => sum + section.items.length, 0);
  const completedTasks = sections.reduce(
    (sum, section) => sum + section.items.filter((item) => item.completed === 1).length,
    0
  );
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const allCompleted = completedTasks === totalTasks && totalTasks > 0;
  const isSigned = currentShift?.checklist_signed === 1;

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Cargando...</div>;
  }

  if (!currentShift) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-20 h-20 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          No hay turno abierto
        </h2>
        <p className="text-gray-600 mb-6">
          Debes abrir un turno para ver el checklist
        </p>
        <button
          onClick={() => window.location.href = '/'}
          className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors"
        >
          Ir al Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-orange-100 p-2 rounded-lg">
                <Check className="w-6 h-6 text-orange-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Checklist</h1>
            </div>
            <p className="text-gray-600">Protocolo de cocina - Pizzería Di Lauvice</p>
            {isSigned && (
              <p className="text-green-600 text-sm font-semibold mt-2">
                ✓ Firmado por {currentShift.checklist_signed_by} el{' '}
                {new Date(currentShift.checklist_signed_at).toLocaleString('es-ES')}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-orange-600 mb-1">
              {completedTasks}/{totalTasks}
            </div>
            <div className="text-sm text-gray-600">Tareas completadas</div>
          </div>
        </div>

        {/* Turno Selector */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4 flex items-center justify-center gap-2">
          <Clock className="w-5 h-5 text-orange-600" />
          <span className="text-orange-600 font-semibold">
            Turno {currentShift.type} - {currentShift.employee_name}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-orange-600 via-yellow-500 to-green-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="text-center text-gray-900 font-semibold mt-2">
            {progressPercentage}% completado
          </div>
        </div>

        {/* Firmar Button */}
        {allCompleted && !isSigned && (
          <button
            onClick={handleSignClick}
            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            Firmar Checklist Completado
          </button>
        )}

        {isSigned && (
          <div className="w-full py-4 bg-green-100 border-2 border-green-500 text-green-800 font-bold rounded-lg flex items-center justify-center gap-2">
            <Check className="w-5 h-5" />
            Checklist Firmado y Completado
          </div>
        )}
      </div>

      {/* Checklist Sections */}
      <div className="space-y-6">
        {sections.map((section, sectionIndex) => {
          const sectionCompleted = section.items.filter((item) => item.completed === 1).length;
          const sectionTotal = section.items.length;
          const sectionProgress = sectionTotal > 0 ? Math.round((sectionCompleted / sectionTotal) * 100) : 0;

          return (
            <div
              key={section.title}
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-orange-600">{section.title}</h2>
                <span className="text-gray-900 font-semibold">
                  {sectionCompleted}/{sectionTotal}
                </span>
              </div>

              {/* Section Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
                <div
                  className="h-full rounded-full bg-orange-600 transition-all duration-300"
                  style={{ width: `${sectionProgress}%` }}
                />
              </div>

              {/* Items */}
              <div className="space-y-3">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggleTask(item.id, item.completed)}
                    disabled={isSigned}
                    className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all ${
                      item.completed
                        ? 'bg-green-50 border-green-300 text-gray-500'
                        : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-orange-500'
                    } ${isSigned ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                  >
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        item.completed
                          ? 'border-green-500 bg-green-500'
                          : 'border-gray-300'
                      }`}
                    >
                      {item.completed ? <Check className="w-4 h-4 text-white" /> : null}
                    </div>
                    <span className="flex-1 text-left font-medium">{item.task_name}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sign Modal */}
      {showSignModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Firmar Checklist
            </h2>
            <p className="text-gray-600 mb-6 text-sm">
              Solo el Chef o Administrador puede firmar el checklist completado.
            </p>

            {signError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg text-red-800 text-sm">
                {signError}
              </div>
            )}

            <form onSubmit={handleSignSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RUT del Chef/Admin
                </label>
                <input
                  type="text"
                  required
                  placeholder="11111111-1"
                  className="w-full bg-white border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-orange-500 transition-colors"
                  value={signForm.rut}
                  onChange={(e) => setSignForm({ ...signForm, rut: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••"
                  className="w-full bg-white border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-orange-500 transition-colors"
                  value={signForm.password}
                  onChange={(e) => setSignForm({ ...signForm, password: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={signing}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg transition-colors"
                >
                  {signing ? 'Firmando...' : 'Firmar Checklist'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSignModal(false)}
                  disabled={signing}
                  className="flex-1 px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
