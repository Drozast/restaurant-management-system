import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Pizza,
  Package,
  ShoppingBag,
  CheckSquare,
  LogOut,
  Users,
  Gift,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { useStore } from '../store/useStore';
import MotivationalCard from './MotivationalCard';
import { useGamificationNotifications } from '../hooks/useGamificationNotifications';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/ventas', icon: ShoppingCart, label: 'Ventas' },
  { path: '/pizzas', icon: Pizza, label: 'Pizzas' },
  { path: '/inventario', icon: Package, label: 'Inventario Real' },
  { path: '/lista-compras', icon: ShoppingBag, label: 'Lista Compras' },
  { path: '/checklist', icon: CheckSquare, label: 'Checklist' },
  { path: '/premios', icon: Gift, label: 'Premios' },
];

export default function LayoutNew() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);

  // Enable gamification notifications
  useGamificationNotifications();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-700">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">
              <span className="text-gray-900">Sistema de</span>{' '}
              <span className="text-orange-600">Mise en Place</span>
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Control de inventario y ventas en tiempo real
              {user && (
                <span className="ml-3">
                  • <span className="text-gray-900">{user.name}</span>
                  {user.role === 'chef' && (
                    <span className="ml-2 px-2 py-0.5 bg-orange-600 text-white text-xs rounded">
                      Admin
                    </span>
                  )}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold transition-all shadow-md hover:shadow-lg"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-6">
          <div className="flex gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                    isActive
                      ? 'border-orange-600 text-orange-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}

            {/* My Performance (for employees) */}
            {user?.role === 'empleado' && (
              <Link
                to="/mi-desempeno"
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  location.pathname === '/mi-desempeno'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Mi Desempeño</span>
              </Link>
            )}

            {/* Admin links (only for chef/admin) */}
            {user?.role === 'chef' && (
              <>
                <Link
                  to="/reportes-completos"
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                    location.pathname === '/reportes-completos'
                      ? 'border-orange-600 text-orange-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm font-medium">Reportes</span>
                </Link>
                <Link
                  to="/usuarios"
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                    location.pathname === '/usuarios'
                      ? 'border-orange-600 text-orange-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">Usuarios</span>
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <Outlet />
      </main>

      {/* Motivational Card - Solo para empleados */}
      {user?.role === 'empleado' && <MotivationalCard />}
    </div>
  );
}
