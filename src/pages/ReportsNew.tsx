import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Download, ShoppingBag, FileSpreadsheet, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { getSocket } from '../lib/socket';
import * as XLSX from 'xlsx';

export default function ReportsNew() {
  const [shoppingList, setShoppingList] = useState<any[]>([]);
  const [dailyReport, setDailyReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadData();

    // Set up socket listeners for real-time updates
    const socket = getSocket();

    // Connection status
    socket.on('connect', () => {
      console.log('✅ Conectado a WebSocket - actualizaciones en tiempo real activas');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('❌ Desconectado de WebSocket');
      setIsConnected(false);
    });

    // Real-time data updates
    socket.on('ingredient:updated', () => {
      console.log('🔄 Ingrediente actualizado - recargando lista');
      loadData();
    });

    socket.on('ingredient:restocked', () => {
      console.log('📦 Ingrediente restockeado - recargando lista');
      loadData();
    });

    socket.on('sale:registered', () => {
      console.log('🍕 Venta registrada - recargando lista');
      loadData();
    });

    socket.on('alert:created', () => {
      console.log('⚠️ Alerta creada - recargando lista');
      loadData();
    });

    // Check initial connection
    setIsConnected(socket.connected);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('ingredient:updated');
      socket.off('ingredient:restocked');
      socket.off('sale:registered');
      socket.off('alert:created');
    };
  }, [selectedDate]);

  const loadData = async () => {
    setIsUpdating(true);
    try {
      const [listData, reportData] = await Promise.all([
        api.reports.getShoppingList(),
        api.reports.getDaily(selectedDate),
      ]);
      console.log('Shopping list data:', listData); // DEBUG
      setShoppingList(listData);
      setDailyReport(reportData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error cargando reportes:', error);
    } finally {
      setLoading(false);
      setIsUpdating(false);
    }
  };

  const handlePrintShoppingList = () => {
    window.print();
  };

  const handleExportToExcel = () => {
    if (shoppingList.length === 0) {
      alert('No hay ingredientes para reponer');
      return;
    }

    // Create data array with explicit headers
    const headers = ['Ingrediente', 'Categoría', 'Unidad', 'Stock Actual (%)', 'Cantidad Actual', 'Cantidad Máxima', 'Cantidad a Reponer', 'Prioridad', 'Umbral Crítico', 'Umbral Advertencia'];

    const dataRows = shoppingList.map(item => [
      item.name || '',
      item.category || '',
      item.unit || '',
      item.current_percentage ?? 0,
      item.current_quantity ?? 0,
      item.total_quantity ?? 0,
      Math.ceil((item.total_quantity || 0) - (item.current_quantity || 0)),
      item.priority === 'high' ? 'URGENTE' : 'Medio',
      item.critical_threshold ?? 0,
      item.warning_threshold ?? 0
    ]);

    // Create worksheet from array of arrays
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, // Ingrediente
      { wch: 15 }, // Categoría
      { wch: 10 }, // Unidad
      { wch: 15 }, // Stock Actual
      { wch: 15 }, // Cantidad Actual
      { wch: 15 }, // Cantidad Máxima
      { wch: 18 }, // Cantidad a Reponer
      { wch: 12 }, // Prioridad
      { wch: 15 }, // Umbral Crítico
      { wch: 18 }  // Umbral Advertencia
    ];

    // Create workbook with single sheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reposición');

    // Generate filename with date
    const date = new Date().toISOString().split('T')[0];
    const filename = `Reposicion_Bodega_${date}.xlsx`;

    XLSX.writeFile(wb, filename);
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Real-time connection status */}
      <div className={`flex items-center justify-between p-3 rounded-lg border ${
        isConnected
          ? 'bg-green-50 border-green-200'
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Wifi className="w-5 h-5 text-green-600" />
              <span className="text-sm font-semibold text-green-800">
                Conexión en Tiempo Real Activa
              </span>
            </>
          ) : (
            <>
              <WifiOff className="w-5 h-5 text-red-600" />
              <span className="text-sm font-semibold text-red-800">
                Sin Conexión - Los datos no se actualizan automáticamente
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isUpdating && (
            <div className="flex items-center gap-2 text-orange-600">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-xs font-medium">Actualizando...</span>
            </div>
          )}
          <span className="text-xs text-gray-600">
            Última actualización: {lastUpdate.toLocaleTimeString('es-ES')}
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lista de Reposición desde Bodega</h1>
          <p className="text-gray-600 mt-2 text-sm max-w-2xl">
            Esta lista muestra los ingredientes que necesitan ser repuestos desde la bodega.
            Los ingredientes críticos (rojos) requieren atención inmediata.
          </p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-orange-500 transition-colors"
        />
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <ShoppingBag className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">¿Cómo funciona?</h3>
            <p className="text-sm text-blue-800">
              El sistema monitorea constantemente el inventario del local. Cuando un ingrediente alcanza el <strong>umbral de advertencia</strong> (amarillo)
              o el <strong>umbral crítico</strong> (rojo), se agrega automáticamente a esta lista para que vayas a la bodega a reponer.
            </p>
          </div>
        </div>
      </div>

      {/* Restock List */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" />
            Items para Reponer
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleExportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </button>
            <button
              onClick={handlePrintShoppingList}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Imprimir
            </button>
          </div>
        </div>

        {shoppingList.length > 0 ? (
          <div className="space-y-3">
            {shoppingList.map((item: any) => (
              <div
                key={item.id}
                className={`p-4 rounded-lg border-l-4 ${
                  item.priority === 'high'
                    ? 'bg-red-50 border-red-500'
                    : 'bg-yellow-50 border-yellow-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-700 mt-1">
                      Categoría: {item.category} • Unidad: {item.unit}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                      Stock actual: {item.current_percentage}% ({item.current_quantity || 0} {item.unit})
                    </p>
                    <p className="text-sm text-gray-700">
                      Reponer: ~{Math.ceil((item.total_quantity || 0) - (item.current_quantity || 0))} {item.unit} desde bodega
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      item.priority === 'high'
                        ? 'bg-red-600 text-white'
                        : 'bg-yellow-600 text-white'
                    }`}
                  >
                    {item.priority === 'high' ? 'URGENTE' : 'Medio'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">
            No hay ingredientes que necesiten reposición
          </p>
        )}
      </div>

      {/* Daily Report */}
      {dailyReport && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Ventas del Día</h2>
            {dailyReport.sales?.length > 0 ? (
              <div className="space-y-3">
                {dailyReport.sales.map((sale: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{sale.name}</p>
                      <p className="text-sm text-gray-600 capitalize">{sale.type}</p>
                    </div>
                    <span className="text-2xl font-bold text-gray-900">{sale.total_quantity}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">No hay ventas registradas</p>
            )}
          </div>

          {/* Shifts Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Turnos del Día</h2>
            {dailyReport.shifts?.length > 0 ? (
              <div className="space-y-3">
                {dailyReport.shifts.map((shift: any) => (
                  <div key={shift.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-gray-900">Turno {shift.type}</p>
                        <p className="text-sm text-gray-600">{shift.employee_name}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          shift.status === 'closed'
                            ? 'bg-gray-200 text-gray-700'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {shift.status === 'closed' ? 'Cerrado' : 'Abierto'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">
                      Tareas: {shift.completed_tasks} / {shift.total_tasks} completadas
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">No hay turnos registrados</p>
            )}
          </div>

          {/* Low Stock */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Stock Crítico</h2>
            {dailyReport.lowStock?.length > 0 ? (
              <div className="space-y-2">
                {dailyReport.lowStock.map((item: any) => (
                  <div key={item.name} className="p-3 bg-red-50 rounded-lg">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-700">
                      {item.current_percentage}% • {item.category}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">
                ¡Todo el stock está en buen nivel!
              </p>
            )}
          </div>

          {/* Alerts Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Alertas del Día</h2>
            {dailyReport.alerts?.length > 0 ? (
              <div className="space-y-2">
                {dailyReport.alerts.map((alert: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg ${
                      alert.type === 'critical'
                        ? 'bg-red-50'
                        : alert.type === 'warning'
                        ? 'bg-yellow-50'
                        : 'bg-blue-50'
                    }`}
                  >
                    <p className="font-medium text-gray-900 capitalize">{alert.type}</p>
                    <p className="text-sm text-gray-700">Cantidad: {alert.count}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">No hay alertas</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
