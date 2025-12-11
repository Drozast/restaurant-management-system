import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useStore } from '../store/useStore';
import { Plus, Trash2, RefreshCw, Shield, User as UserIcon } from 'lucide-react';

export default function Users() {
  const user = useStore((state) => state.user);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await api.auth.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de desactivar este usuario?')) return;

    try {
      await api.auth.deleteUser(id);
      loadUsers();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleResetPassword = async (id: number, rut: string) => {
    if (!confirm(`¿Resetear contraseña a los primeros 4 dígitos del RUT?`)) return;

    try {
      await api.auth.resetPassword(id);
      alert('Contraseña reseteada exitosamente');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleToggleActive = async (id: number, currentActive: number) => {
    try {
      const userData = users.find(u => u.id === id);
      await api.auth.updateUser(id, {
        ...userData,
        active: currentActive ? 0 : 1
      });
      loadUsers();
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (user?.role !== 'chef') {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-gray-600">No tienes permisos para acceder a esta página</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo Usuario
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
        <div className="space-y-3">
          {users.map((u) => (
            <div
              key={u.id}
              className={`flex items-center gap-4 p-4 bg-gray-100 border rounded-lg transition-colors ${
                u.active ? 'border-gray-200' : 'border-gray-300 opacity-60'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {u.role === 'chef' ? (
                    <Shield className="w-5 h-5 text-orange-500" />
                  ) : (
                    <UserIcon className="w-5 h-5 text-blue-500" />
                  )}
                  <h3 className="text-lg font-semibold text-gray-900">{u.name}</h3>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      u.role === 'chef'
                        ? 'bg-orange-900 text-orange-300'
                        : 'bg-blue-900 text-blue-300'
                    }`}
                  >
                    {u.role === 'chef' ? 'Chef/Admin' : 'Empleado'}
                  </span>
                  {!u.active && (
                    <span className="px-2 py-1 bg-red-900 text-red-300 rounded text-xs font-semibold">
                      Inactivo
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>RUT: {u.rut}</span>
                  {u.last_login && (
                    <span>
                      Último acceso: {new Date(u.last_login).toLocaleString('es-ES')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleActive(u.id, u.active)}
                  className={`px-4 py-2 text-sm rounded-lg font-semibold transition-colors ${
                    u.active
                      ? 'bg-yellow-900 hover:bg-yellow-800 text-yellow-300'
                      : 'bg-green-900 hover:bg-green-800 text-green-300'
                  }`}
                  title={u.active ? 'Desactivar' : 'Activar'}
                >
                  {u.active ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => handleResetPassword(u.id, u.rut)}
                  className="flex items-center gap-1 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-blue-300 text-sm rounded-lg transition-colors"
                  title="Resetear contraseña"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset
                </button>
                {u.rut !== '11111111-1' && (
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <CreateUserModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            loadUsers();
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    rut: '',
    name: '',
    role: 'empleado' as 'empleado' | 'chef',
  });

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
    setFormData({ ...formData, rut: formatted });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.auth.createUser(formData);
      onSuccess();
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-md shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Nuevo Usuario</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">RUT</label>
            <input
              type="text"
              required
              placeholder="12345678-9"
              className="w-full bg-white border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors font-medium"
              value={formData.rut}
              onChange={handleRutChange}
              maxLength={10}
              autoComplete="off"
            />
            <p className="text-xs text-gray-600 mt-1">
              La contraseña será los primeros 4 dígitos del RUT
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre Completo
            </label>
            <input
              type="text"
              required
              placeholder="Juan Pérez"
              className="w-full bg-white border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors font-medium"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
            <select
              className="w-full bg-white border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-orange-500 transition-colors font-medium"
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value as 'empleado' | 'chef' })
              }
            >
              <option value="empleado">Empleado</option>
              <option value="chef">Chef/Admin</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
            >
              Crear Usuario
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
