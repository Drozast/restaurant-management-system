import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useStore } from '../store/useStore';
import { BarChart3, Users, Download, Calendar, TrendingUp, Award } from 'lucide-react';

export default function ReportesCompletos() {
  const { user } = useStore();
  const [activeTab, setActiveTab] = useState<'employees' | 'monthly'>('employees');
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [monthlyReport, setMonthlyReport] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [exportingPDF, setExportingPDF] = useState(false);

  const isAdmin = user?.role === 'chef';

  useEffect(() => {
    if (!isAdmin) return;

    if (activeTab === 'employees') {
      loadEmployeesData();
    } else {
      loadMonthlyReport();
    }
  }, [activeTab, selectedYear, selectedMonth, isAdmin]);

  const loadEmployeesData = async () => {
    try {
      setLoading(true);
      const data = await api.reportsExtended.getAllEmployees('chef');
      setEmployees(data);
    } catch (error) {
      console.error('Error cargando empleados:', error);
      alert('Error al cargar datos de empleados');
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyReport = async () => {
    try {
      setLoading(true);
      const data = await api.reportsExtended.getMonthlyReport(selectedYear, selectedMonth, 'chef');
      setMonthlyReport(data);
    } catch (error) {
      console.error('Error cargando reporte mensual:', error);
      alert('Error al cargar reporte mensual');
    } finally {
      setLoading(false);
    }
  };

  const handleExportMonthlyPDF = async () => {
    if (!monthlyReport) return;

    try {
      setExportingPDF(true);
      const blob = await api.reportsExtended.exportPDF('monthly', monthlyReport);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_mensual_${selectedYear}_${selectedMonth}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exportando PDF:', error);
      alert('Error al generar PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 font-semibold">Acceso denegado. Solo administradores.</p>
      </div>
    );
  }

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-orange-600" />
            Reportes Completos
          </h1>
          <p className="text-gray-600 mt-2">
            Vista completa de desempeño de empleados y reportes mensuales
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('employees')}
            className={`pb-4 px-2 font-semibold transition-colors relative ${
              activeTab === 'employees'
                ? 'text-orange-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Empleados
            </span>
            {activeTab === 'employees' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`pb-4 px-2 font-semibold transition-colors relative ${
              activeTab === 'monthly'
                ? 'text-orange-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Reporte Mensual
            </span>
            {activeTab === 'monthly' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600" />
            )}
          </button>
        </div>
      </div>

      {/* Employees Tab */}
      {activeTab === 'employees' && (
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando empleados...</p>
            </div>
          ) : (
            <>
              {/* Top Performers */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Award className="w-6 h-6" />
                  Top 3 Empleados
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {employees
                    .sort((a, b) => b.avg_completion_rate - a.avg_completion_rate)
                    .slice(0, 3)
                    .map((emp, index) => (
                      <div key={emp.employee_name} className="bg-white/10 backdrop-blur rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`text-3xl ${
                            index === 0 ? 'text-yellow-300' :
                            index === 1 ? 'text-gray-300' :
                            'text-orange-300'
                          }`}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                          </div>
                          <div>
                            <p className="font-bold">{emp.employee_name}</p>
                            <p className="text-sm opacity-90">{emp.avg_completion_rate}% completitud</p>
                          </div>
                        </div>
                        <div className="text-xs opacity-75">
                          {emp.total_shifts} turnos · {emp.rewards_earned} premios
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* All Employees Table */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Todos los Empleados</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Empleado</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Turnos</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Completitud</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Semanas</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Premios</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Metas Activas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees
                        .sort((a, b) => b.avg_completion_rate - a.avg_completion_rate)
                        .map((emp) => (
                          <tr key={emp.employee_name} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-semibold text-gray-900">
                              {emp.employee_name}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {emp.total_shifts}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${
                                      emp.avg_completion_rate >= 90 ? 'bg-green-500' :
                                      emp.avg_completion_rate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${emp.avg_completion_rate}%` }}
                                  />
                                </div>
                                <span className="text-sm font-semibold">{emp.avg_completion_rate}%</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {emp.total_weeks}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm font-semibold">
                                {emp.rewards_earned} 🎁
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-semibold">
                                {emp.active_goals}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Monthly Report Tab */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          {/* Month Selector */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Año</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-orange-500"
                >
                  {[2024, 2025, 2026].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mes</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-orange-500"
                >
                  {monthNames.map((name, index) => (
                    <option key={index + 1} value={index + 1}>{name}</option>
                  ))}
                </select>
              </div>
              {monthlyReport && (
                <button
                  onClick={handleExportMonthlyPDF}
                  disabled={exportingPDF}
                  className="ml-auto flex items-center gap-2 px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  <Download className="w-5 h-5" />
                  {exportingPDF ? 'Generando...' : 'Descargar PDF'}
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Generando reporte...</p>
            </div>
          ) : monthlyReport ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-8 h-8 text-blue-500" />
                    <span className="text-3xl font-bold text-gray-900">{monthlyReport.total_sales}</span>
                  </div>
                  <p className="text-gray-600 font-medium">Total de Ventas</p>
                  <p className="text-xs text-gray-500 mt-1">Pizzas y tablas vendidas</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <BarChart3 className="w-8 h-8 text-green-500" />
                    <span className="text-3xl font-bold text-gray-900">{monthlyReport.avg_inventory_level}%</span>
                  </div>
                  <p className="text-gray-600 font-medium">Inventario Promedio</p>
                  <p className="text-xs text-gray-500 mt-1">Nivel general del mes</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-8 h-8 text-purple-500" />
                    <span className="text-3xl font-bold text-gray-900">{monthlyReport.employees_count}</span>
                  </div>
                  <p className="text-gray-600 font-medium">Empleados Activos</p>
                  <p className="text-xs text-gray-500 mt-1">Trabajaron este mes</p>
                </div>
              </div>

              {/* Best Employee */}
              {monthlyReport.best_employee && (
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-6 text-white shadow-lg">
                  <div className="flex items-center gap-4">
                    <Award className="w-12 h-12" />
                    <div>
                      <p className="text-sm opacity-90">Mejor Empleado del Mes</p>
                      <p className="text-2xl font-bold">{monthlyReport.best_employee}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Top Sales */}
              {monthlyReport.report_data?.sales && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Top 10 Productos Vendidos</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Producto</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">Tipo</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">Cantidad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyReport.report_data.sales.slice(0, 10).map((sale: any, index: number) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-semibold text-gray-900">{sale.name}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                sale.type === 'pizza' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'
                              }`}>
                                {sale.type === 'pizza' ? 'Pizza' : 'Tabla'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-gray-900">
                              {sale.total_quantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Employee Performance */}
              {monthlyReport.report_data?.employees_performance && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Desempeño de Empleados</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Empleado</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">Turnos</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">Completitud</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyReport.report_data.employees_performance.map((emp: any, index: number) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-semibold text-gray-900">{emp.employee_name}</td>
                            <td className="py-3 px-4 text-center">{emp.shifts_count || 0}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${
                                      (emp.avg_completion || 0) >= 90 ? 'bg-green-500' :
                                      (emp.avg_completion || 0) >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.round(emp.avg_completion || 0)}%` }}
                                  />
                                </div>
                                <span className="text-sm font-semibold">{Math.round(emp.avg_completion || 0)}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
              <p className="text-gray-600">No hay datos disponibles para este mes</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
