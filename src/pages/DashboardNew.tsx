import { useEffect, useState } from 'react';
import { TrendingUp, Pizza as PizzaIcon, AlertTriangle, Package, Clock, PlayCircle, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useStore } from '../store/useStore';
import { getSocket } from '../lib/socket';

export default function DashboardNew() {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showResetWeekModal, setShowResetWeekModal] = useState(false);
  const [shiftType, setShiftType] = useState<'AM' | 'PM'>('AM');
  const [resetData, setResetData] = useState({ rut: '', password: '' });
  const [resettingWeek, setResettingWeek] = useState(false);

  const [stats, setStats] = useState({
    totalVentas: 0,
    masasUsadas: 0,
    masasDisponibles: 20,
    alertasActivas: 0,
    alertasCriticas: 0,
    alertasBajas: 0,
    ingredientesActivos: 0,
  });

  const [ventasPorPizza, setVentasPorPizza] = useState<any[]>([]);
  const [ventasPorTamano, setVentasPorTamano] = useState({
    L: { count: 0, disponibles: 10 },
    M: { count: 0, disponibles: 6 },
    S: { count: 0, disponibles: 4 },
  });
  const [miseEnPlace, setMiseEnPlace] = useState<any[]>([]);
  const [loadingMise, setLoadingMise] = useState(true);

  useEffect(() => {
    loadData();
    loadMiseEnPlace();
    loadCurrentShift();

    // Set up socket listeners for real-time updates
    const socket = getSocket();

    socket.on('sale:registered', () => {
      loadData();
      loadMiseEnPlace();
    });

    socket.on('ingredient:updated', () => {
      loadMiseEnPlace();
    });

    socket.on('mise:updated', () => {
      loadMiseEnPlace();
    });

    socket.on('shift:opened', () => {
      loadCurrentShift();
    });

    socket.on('shift:closed', () => {
      loadCurrentShift();
    });

    socket.on('alert:created', () => {
      loadData();
    });

    socket.on('week:reset', (data) => {
      alert(`🔄 La semana ha sido reiniciada por ${data.resetBy}\n\nRecargando página...`);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    });

    // Refresh mise en place every 30 seconds (reduced from 10 since we have real-time updates)
    const interval = setInterval(() => {
      loadMiseEnPlace();
      loadCurrentShift();
    }, 30000);

    return () => {
      socket.off('sale:registered');
      socket.off('ingredient:updated');
      socket.off('mise:updated');
      socket.off('shift:opened');
      socket.off('shift:closed');
      socket.off('alert:created');
      socket.off('week:reset');
      clearInterval(interval);
    };
  }, []);

  const loadData = async () => {
    try {
      const [salesData, alertsData, ingredientsData] = await Promise.all([
        api.sales.getSummary(new Date().toISOString().split('T')[0]),
        api.alerts.getAll(false),
        api.ingredients.getAll(),
      ]);

      const totalVentas = salesData.reduce((sum: number, s: any) => sum + s.total_quantity, 0);
      const alertasCriticas = alertsData.filter((a: any) => a.type === 'critical').length;
      const alertasBajas = alertsData.filter((a: any) => a.type === 'warning').length;

      setStats({
        totalVentas,
        masasUsadas: totalVentas,
        masasDisponibles: 20,
        alertasActivas: alertsData.length,
        alertasCriticas,
        alertasBajas,
        ingredientesActivos: ingredientsData.length,
      });

      setVentasPorPizza(salesData);

      // Simulación de distribución por tamaño
      // En producción, esto vendría de la base de datos
      const masasL = Math.floor(totalVentas * 0.5);
      const masasM = Math.floor(totalVentas * 0.3);
      const masasS = totalVentas - masasL - masasM;

      setVentasPorTamano({
        L: { count: masasL, disponibles: 10 },
        M: { count: masasM, disponibles: 6 },
        S: { count: masasS, disponibles: 4 },
      });
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const loadCurrentShift = async () => {
    try {
      const shift = await api.shifts.getCurrent();
      setCurrentShift(shift);
    } catch (error) {
      console.error('Error loading current shift:', error);
      setCurrentShift(null);
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
    } finally {
      setLoadingMise(false);
    }
  };

  const handleOpenShift = async () => {
    if (!user) return;

    try {
      await api.shifts.create({
        date: new Date().toISOString().split('T')[0],
        type: shiftType,
        employee_name: user.name,
        mise_en_place: []
      });

      setShowOpenShiftModal(false);
      await loadCurrentShift();
      alert(`✅ Turno ${shiftType} abierto exitosamente`);
    } catch (error: any) {
      alert(error.message || 'Error al abrir turno');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-yellow-500';
      case 'orange': return 'bg-orange-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'green': return 'Óptimo';
      case 'yellow': return 'Atención';
      case 'orange': return 'Urgente';
      case 'red': return 'Crítico';
      default: return 'Desconocido';
    }
  };

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
    setResetData({ ...resetData, rut: formatted });
  };

  const handleResetWeek = async () => {
    const confirmed = confirm(
      '⚠️ ADVERTENCIA CRÍTICA ⚠️\n\n' +
      'Vas a REINICIAR TODA LA SEMANA.\n\n' +
      'Esto hará lo siguiente:\n' +
      '• Restaurar todo el inventario al 100%\n' +
      '• Eliminar TODAS las ventas registradas\n' +
      '• Eliminar todas las alertas\n' +
      '• Cerrar todos los turnos abiertos\n' +
      '• Resetear el mise en place\n' +
      '• Borrar los logros semanales\n\n' +
      'Las RECETAS y PIZZAS se mantienen.\n\n' +
      '¿Estás COMPLETAMENTE SEGURO?'
    );

    if (!confirmed) return;

    setShowResetWeekModal(true);
  };

  const confirmResetWeek = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetData.rut || !resetData.password) {
      alert('Debes ingresar RUT y contraseña');
      return;
    }

    setResettingWeek(true);
    try {
      const response = await api.admin.resetWeek(resetData.rut, resetData.password);

      alert(`✅ ${response.message}\n\nReiniciado por: ${response.resetBy}\nFecha: ${new Date(response.timestamp).toLocaleString('es-ES')}`);

      // Reset form and close modal
      setResetData({ rut: '', password: '' });
      setShowResetWeekModal(false);

      // Reload all data
      await loadData();
      await loadMiseEnPlace();
      await loadCurrentShift();

      // Redirect to dashboard to refresh everything
      window.location.reload();
    } catch (error: any) {
      alert('❌ Error: ' + (error.message || 'No se pudo reiniciar la semana'));
    } finally {
      setResettingWeek(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Controls - Only for Chef */}
      {user?.role === 'chef' && (
        <div className="flex justify-end">
          <button
            onClick={handleResetWeek}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-md"
            title="Reiniciar semana (Solo Admin)"
          >
            <RotateCcw className="w-4 h-4" />
            Reiniciar Semana
          </button>
        </div>
      )}

      {/* Shift Status Banner */}
      {!currentShift ? (
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-lg">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">No hay turno abierto</h2>
                <p className="text-orange-100">Abre un turno para comenzar a trabajar y registrar ventas</p>
              </div>
            </div>
            <button
              onClick={() => setShowOpenShiftModal(true)}
              className="flex items-center gap-2 px-8 py-4 bg-white hover:bg-gray-100 text-orange-600 rounded-lg font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              <PlayCircle className="w-6 h-6" />
              Abrir Turno
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-lg">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  Turno {currentShift.type} Activo
                </h2>
                <p className="text-green-100">
                  {currentShift.employee_name} • Inicio: {new Date(currentShift.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/checklist')}
              className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-100 text-green-600 rounded-lg font-semibold transition-all shadow-lg"
            >
              Ver Checklist
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ventas */}
        <div
          onClick={() => navigate('/ventas')}
          className="bg-white border border-gray-200 rounded-xl p-6 cursor-pointer transition-all duration-200 hover:scale-105 hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/20 group"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="text-sm text-gray-600 group-hover:text-orange-400 transition-colors">Total Ventas</div>
            <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-orange-500/10 transition-colors">
              <TrendingUp className="w-5 h-5 text-green-500 group-hover:text-green-400 transition-colors" />
            </div>
          </div>
          <div className="text-4xl font-bold text-gray-900 mb-1">{stats.totalVentas}</div>
          <div className="text-xs text-gray-600 group-hover:text-gray-700 transition-colors">Pizzas vendidas hoy</div>
        </div>

        {/* Masas Usadas */}
        <div
          onClick={() => navigate('/pizzas')}
          className="bg-white border border-gray-200 rounded-xl p-6 cursor-pointer transition-all duration-200 hover:scale-105 hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/20 group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="text-sm text-gray-600 group-hover:text-orange-400 transition-colors">Masas Usadas</div>
            <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-orange-500/10 transition-colors">
              <PizzaIcon className="w-5 h-5 text-orange-500 group-hover:text-orange-400 transition-colors" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {stats.masasUsadas}
          </div>
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>L:</span>
              <span className="font-semibold">{ventasPorTamano.L.count}</span>
            </div>
            <div className="flex justify-between">
              <span>M:</span>
              <span className="font-semibold">{ventasPorTamano.M.count}</span>
            </div>
            <div className="flex justify-between">
              <span>S:</span>
              <span className="font-semibold">{ventasPorTamano.S.count}</span>
            </div>
          </div>
        </div>

        {/* Alertas Activas */}
        <div
          onClick={() => navigate('/lista-compras')}
          className="bg-white border border-gray-200 rounded-xl p-6 cursor-pointer transition-all duration-200 hover:scale-105 hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/20 group"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="text-sm text-gray-600 group-hover:text-orange-400 transition-colors">Alertas Activas</div>
            <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-orange-500/10 transition-colors">
              <AlertTriangle className="w-5 h-5 text-yellow-500 group-hover:text-yellow-400 transition-colors" />
            </div>
          </div>
          <div className="text-4xl font-bold text-gray-900 mb-1">{stats.alertasActivas}</div>
          <div className="text-xs text-gray-600 group-hover:text-gray-700 transition-colors">
            {stats.alertasCriticas} críticos, {stats.alertasBajas} bajos
          </div>
        </div>

        {/* Estado Inventario */}
        <div
          onClick={() => navigate('/inventario')}
          className="bg-white border border-gray-200 rounded-xl p-6 cursor-pointer transition-all duration-200 hover:scale-105 hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/20 group"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="text-sm text-gray-600 group-hover:text-orange-400 transition-colors">Estado Inventario</div>
            <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-orange-500/10 transition-colors">
              <Package className="w-5 h-5 text-blue-500 group-hover:text-blue-400 transition-colors" />
            </div>
          </div>
          <div className="text-4xl font-bold text-gray-900 mb-1">{stats.ingredientesActivos}</div>
          <div className="text-xs text-gray-600 group-hover:text-gray-700 transition-colors">Ingredientes activos</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas por Pizza */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ventas por Pizza</h3>
          <div className="space-y-3">
            {ventasPorPizza.length > 0 ? (
              ventasPorPizza.map((pizza, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-100 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{pizza.name}</p>
                    <p className="text-sm text-gray-600 capitalize">{pizza.type}</p>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{pizza.total_quantity}</div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                No hay ventas registradas
              </div>
            )}
          </div>
        </div>

        {/* Distribución por Tamaño */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Tamaño</h3>
          <div className="space-y-4">
            {/* Tamaño L */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 font-semibold">Tamaño L</span>
                  <span className="text-sm text-gray-600">
                    {ventasPorTamano.L.disponibles} masas disponibles
                  </span>
                </div>
                <span className="text-gray-900 font-bold">{ventasPorTamano.L.count}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-orange-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (ventasPorTamano.L.count / ventasPorTamano.L.disponibles) * 100)}%`,
                  }}
                />
              </div>
              <div className="text-right text-xs text-gray-600 mt-1">
                {Math.round((ventasPorTamano.L.count / ventasPorTamano.L.disponibles) * 100)}%
              </div>
            </div>

            {/* Tamaño M */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 font-semibold">Tamaño M</span>
                  <span className="text-sm text-gray-600">
                    {ventasPorTamano.M.disponibles} masas disponibles
                  </span>
                </div>
                <span className="text-gray-900 font-bold">{ventasPorTamano.M.count}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-orange-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (ventasPorTamano.M.count / ventasPorTamano.M.disponibles) * 100)}%`,
                  }}
                />
              </div>
              <div className="text-right text-xs text-gray-600 mt-1">
                {Math.round((ventasPorTamano.M.count / ventasPorTamano.M.disponibles) * 100)}%
              </div>
            </div>

            {/* Tamaño S */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 font-semibold">Tamaño S</span>
                  <span className="text-sm text-gray-600">
                    {ventasPorTamano.S.disponibles} masas disponibles
                  </span>
                </div>
                <span className="text-gray-900 font-bold">{ventasPorTamano.S.count}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-orange-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (ventasPorTamano.S.count / ventasPorTamano.S.disponibles) * 100)}%`,
                  }}
                />
              </div>
              <div className="text-right text-xs text-gray-600 mt-1">
                {Math.round((ventasPorTamano.S.count / ventasPorTamano.S.disponibles) * 100)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mise en Place en Tiempo Real */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-500" />
          Mise en Place del Turno Actual
          <span className="ml-auto text-xs text-gray-500">
            Actualización automática cada 10s
          </span>
        </h3>

        {loadingMise ? (
          <div className="text-center py-8 text-gray-500">
            Cargando mise en place...
          </div>
        ) : miseEnPlace.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay turno abierto. Abre un turno para ver el mise en place.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {miseEnPlace.map((item: any) => (
              <div
                key={item.id}
                className="bg-gray-100 rounded-lg p-4 border-l-4 transition-all hover:scale-102"
                style={{ borderLeftColor: item.status === 'green' ? '#22c55e' : item.status === 'yellow' ? '#eab308' : item.status === 'orange' ? '#f97316' : '#ef4444' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-sm">
                      {item.ingredient_name}
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">
                      {Math.round(item.current_quantity)} / {Math.round(item.initial_quantity)} {item.unit}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      item.status === 'green' ? 'bg-green-100 text-green-700' :
                      item.status === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                      item.status === 'orange' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {getStatusText(item.status)}
                    </span>
                    <span className="text-xl font-bold text-gray-900">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-gray-300 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getStatusColor(item.status)}`}
                      style={{ width: `${Math.min(100, item.percentage)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Open Shift Modal */}
      {showOpenShiftModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Abrir Turno
            </h2>
            <p className="text-gray-600 mb-6 text-sm">
              Selecciona el tipo de turno que deseas abrir
            </p>

            <div className="space-y-4 mb-6">
              <button
                onClick={() => setShiftType('AM')}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  shiftType === 'AM'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="font-bold text-gray-900">Turno AM (Mañana)</p>
                    <p className="text-sm text-gray-600">Apertura y preparación del día</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 ${
                    shiftType === 'AM'
                      ? 'border-orange-500 bg-orange-500'
                      : 'border-gray-300'
                  }`}>
                    {shiftType === 'AM' && (
                      <div className="w-full h-full flex items-center justify-center text-white text-xs">✓</div>
                    )}
                  </div>
                </div>
              </button>

              <button
                onClick={() => setShiftType('PM')}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  shiftType === 'PM'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="font-bold text-gray-900">Turno PM (Tarde)</p>
                    <p className="text-sm text-gray-600">Servicio de tarde y cierre</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 ${
                    shiftType === 'PM'
                      ? 'border-orange-500 bg-orange-500'
                      : 'border-gray-300'
                  }`}>
                    {shiftType === 'PM' && (
                      <div className="w-full h-full flex items-center justify-center text-white text-xs">✓</div>
                    )}
                  </div>
                </div>
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleOpenShift}
                className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
              >
                Abrir Turno {shiftType}
              </button>
              <button
                onClick={() => setShowOpenShiftModal(false)}
                className="flex-1 px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Week Modal */}
      {showResetWeekModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-50 border-4 border-red-600 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-red-600 mb-4 flex items-center gap-2">
              <RotateCcw className="w-6 h-6" />
              Reiniciar Semana
            </h2>

            <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-sm text-red-800 font-semibold mb-2">
                ⚠️ Esta acción NO se puede deshacer
              </p>
              <ul className="text-xs text-red-700 space-y-1">
                <li>✓ Inventario vuelve al 100%</li>
                <li>✓ Se eliminan todas las ventas</li>
                <li>✓ Se cierran todos los turnos</li>
                <li>✓ Se borran alertas y logros</li>
                <li>✓ Las recetas se mantienen</li>
              </ul>
            </div>

            <form onSubmit={confirmResetWeek} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RUT del Administrador
                </label>
                <input
                  type="text"
                  required
                  placeholder="12345678-9"
                  className="w-full bg-white border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 transition-colors font-medium"
                  value={resetData.rut}
                  onChange={handleRutChange}
                  maxLength={10}
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
                  className="w-full bg-white border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 transition-colors font-medium"
                  value={resetData.password}
                  onChange={(e) => setResetData({ ...resetData, password: e.target.value })}
                  autoComplete="off"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={resettingWeek}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold rounded-lg transition-colors"
                >
                  {resettingWeek ? 'Reiniciando...' : 'Confirmar Reinicio'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetWeekModal(false);
                    setResetData({ rut: '', password: '' });
                  }}
                  disabled={resettingWeek}
                  className="flex-1 px-6 py-3 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-900 font-semibold rounded-lg transition-colors"
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
