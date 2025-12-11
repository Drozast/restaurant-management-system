import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';
import { Pizza, Lock, User } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const setUser = useStore((state) => state.setUser);
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const formatRut = (value: string) => {
    // Eliminar todo excepto números y K
    const cleaned = value.replace(/[^0-9kK]/g, '');

    // Limitar a 9 caracteres (8 dígitos + 1 dígito verificador)
    const limited = cleaned.slice(0, 9);

    // Formatear con guión antes del último dígito si tiene más de 1 carácter
    if (limited.length > 1) {
      return limited.slice(0, -1) + '-' + limited.slice(-1);
    }

    return limited;
  };

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRut(e.target.value);
    setRut(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.auth.login(rut, password);
      setUser(response.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-600 rounded-full mb-4">
            <Pizza className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            <span className="text-orange-500">Mise en Place</span>
          </h1>
          <p className="text-gray-600">Control de inventario y ventas en tiempo real</p>
        </div>

        {/* Login Form */}
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Iniciar Sesión</h2>

          {error && (
            <div className="mb-4 p-4 bg-red-950 border border-red-800 rounded-lg">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">RUT</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="12345678-9"
                  className="w-full bg-gray-50 border-2 border-gray-300 rounded-lg pl-12 pr-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors font-medium"
                  value={rut}
                  onChange={handleRutChange}
                  maxLength={10}
                  autoComplete="off"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Ingresa tu RUT sin puntos</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="4 primeros dígitos de tu RUT"
                  className="w-full bg-gray-50 border-2 border-gray-300 rounded-lg pl-12 pr-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={4}
                  autoComplete="off"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Los primeros 4 dígitos de tu RUT
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Usuario de prueba:
              <br />
              <span className="text-gray-900 font-mono">11111111-1</span> •{' '}
              <span className="text-gray-900 font-mono">1111</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Sistema de gestión de pizzería v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
