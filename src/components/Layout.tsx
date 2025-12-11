import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Pizza,
  Clock,
  ShoppingCart,
  FileText,
  Trophy,
  Monitor,
  Bell
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useEffect } from 'react';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/ingredients', icon: Package, label: 'Ingredientes' },
  { path: '/recipes', icon: Pizza, label: 'Recetas' },
  { path: '/shifts', icon: Clock, label: 'Turnos' },
  { path: '/sales', icon: ShoppingCart, label: 'Ventas' },
  { path: '/reports', icon: FileText, label: 'Reportes' },
  { path: '/gamification', icon: Trophy, label: 'Gamificación' },
];

export default function Layout() {
  const location = useLocation();
  const { alerts, setAlerts, addAlert, updateIngredient } = useStore();

  useEffect(() => {
    // Load initial alerts
    api.alerts.getAll(false).then(setAlerts);

    // Setup socket listeners
    const socket = getSocket();

    socket.on('alert:created', (alert) => {
      addAlert(alert);
    });

    socket.on('ingredient:updated', (ingredient) => {
      updateIngredient(ingredient);
    });

    return () => {
      socket.off('alert:created');
      socket.off('ingredient:updated');
    };
  }, []);

  const unresolvedAlerts = alerts.filter(a => a.resolved === 0);
  const criticalAlerts = unresolvedAlerts.filter(a => a.type === 'critical');

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Pizza className="w-6 h-6 text-red-500" />
            Mise en Place
          </h1>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-red-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <Link
            to="/kitchen"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Monitor className="w-5 h-5" />
            Pantalla Cocina
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar with alerts */}
        {unresolvedAlerts.length > 0 && (
          <div className={`p-3 ${criticalAlerts.length > 0 ? 'bg-red-100 border-b-2 border-red-500' : 'bg-yellow-100 border-b-2 border-yellow-500'}`}>
            <div className="container mx-auto flex items-center gap-2">
              <Bell className={`w-5 h-5 ${criticalAlerts.length > 0 ? 'text-red-600' : 'text-yellow-600'}`} />
              <span className="font-semibold">
                {criticalAlerts.length > 0
                  ? `¡${criticalAlerts.length} alerta${criticalAlerts.length > 1 ? 's' : ''} crítica${criticalAlerts.length > 1 ? 's' : ''}!`
                  : `${unresolvedAlerts.length} alerta${unresolvedAlerts.length > 1 ? 's' : ''} pendiente${unresolvedAlerts.length > 1 ? 's' : ''}`
                }
              </span>
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
