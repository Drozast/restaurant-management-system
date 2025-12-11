import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { api } from '../lib/api';
import { FileText, Download, ShoppingBag } from 'lucide-react';

export default function Reports() {
  const [shoppingList, setShoppingList] = useState<any[]>([]);
  const [dailyReport, setDailyReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    try {
      const [listData, reportData] = await Promise.all([
        api.reports.getShoppingList(),
        api.reports.getDaily(selectedDate),
      ]);
      setShoppingList(listData);
      setDailyReport(reportData);
    } catch (error) {
      console.error('Error cargando reportes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintShoppingList = () => {
    window.print();
  };

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2"
        />
      </div>

      {/* Shopping List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="w-6 h-6" />
              Lista de Compras
            </CardTitle>
            <Button size="sm" onClick={handlePrintShoppingList}>
              <Download className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {shoppingList.length > 0 ? (
            <div className="space-y-3">
              {shoppingList.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    item.priority === 'high'
                      ? 'bg-red-50 border-red-500'
                      : 'bg-yellow-50 border-yellow-500'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-lg">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        Categoría: {item.category} • Unidad: {item.unit}
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        Stock actual: {item.current_percentage}% • Necesario: {item.needed_percentage}%
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        item.priority === 'high'
                          ? 'bg-red-200 text-red-800'
                          : 'bg-yellow-200 text-yellow-800'
                      }`}
                    >
                      {item.priority === 'high' ? 'URGENTE' : 'Medio'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-600 py-8">
              No hay ingredientes que necesiten reposición
            </p>
          )}
        </CardContent>
      </Card>

      {/* Daily Report */}
      {dailyReport && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Ventas del Día</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyReport.sales?.length > 0 ? (
                <div className="space-y-3">
                  {dailyReport.sales.map((sale: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{sale.name}</p>
                        <p className="text-sm text-gray-600 capitalize">{sale.type}</p>
                      </div>
                      <span className="text-2xl font-bold text-gray-900">
                        {sale.total_quantity}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-600 py-4">No hay ventas registradas</p>
              )}
            </CardContent>
          </Card>

          {/* Shifts Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Turnos del Día</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyReport.shifts?.length > 0 ? (
                <div className="space-y-3">
                  {dailyReport.shifts.map((shift: any) => (
                    <div key={shift.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold">Turno {shift.type}</p>
                          <p className="text-sm text-gray-600">{shift.employee_name}</p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            shift.status === 'closed'
                              ? 'bg-gray-200 text-gray-700'
                              : 'bg-green-100 text-green-700'
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
                <p className="text-center text-gray-600 py-4">No hay turnos registrados</p>
              )}
            </CardContent>
          </Card>

          {/* Alerts Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Alertas del Día</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyReport.alerts?.length > 0 ? (
                <div className="space-y-2">
                  {dailyReport.alerts.map((alert: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg ${
                        alert.type === 'critical'
                          ? 'bg-red-100'
                          : alert.type === 'warning'
                          ? 'bg-yellow-100'
                          : 'bg-blue-100'
                      }`}
                    >
                      <p className="font-medium capitalize">{alert.type}</p>
                      <p className="text-sm">Cantidad: {alert.count}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-600 py-4">No hay alertas</p>
              )}
            </CardContent>
          </Card>

          {/* Low Stock */}
          <Card>
            <CardHeader>
              <CardTitle>Stock Crítico</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyReport.lowStock?.length > 0 ? (
                <div className="space-y-2">
                  {dailyReport.lowStock.map((item: any) => (
                    <div key={item.name} className="p-2 bg-red-50 rounded">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        {item.current_percentage}% • {item.category}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-600 py-4">
                  ¡Todo el stock está en buen nivel!
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
