import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PerformanceReport {
  employee_name: string;
  stats: {
    total_shifts: number;
    avg_completion_rate: number;
    rewards_earned: number;
  };
  recent_shifts: any[];
  weekly_achievements: any[];
}

export interface MonthlyReport {
  year: number;
  month: number;
  total_sales: number;
  total_restocks: number;
  avg_inventory_level: number;
  critical_alerts_count: number;
  employees_count: number;
  best_employee: string | null;
  report_data?: {
    sales: any[];
    employees_performance: any[];
  };
}

export function generatePerformancePDF(data: PerformanceReport): Buffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Reporte de Desempeño Personal', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(data.employee_name, pageWidth / 2, 30, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-CL')}`, pageWidth / 2, 36, { align: 'center' });

  // Statistics Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Resumen General', 14, 50);

  const statsData = [
    ['Total de Turnos', data.stats.total_shifts.toString()],
    ['Promedio de Completitud', `${data.stats.avg_completion_rate}%`],
    ['Premios Ganados', data.stats.rewards_earned.toString()]
  ];

  autoTable(doc, {
    startY: 55,
    head: [['Métrica', 'Valor']],
    body: statsData,
    theme: 'grid',
    headStyles: { fillColor: [234, 88, 12] }, // orange-600
    margin: { left: 14, right: 14 }
  });

  // Recent Shifts Section
  const finalY = (doc as any).lastAutoTable.finalY || 90;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Turnos Recientes', 14, finalY + 15);

  const shiftsData = data.recent_shifts.slice(0, 10).map((shift: any) => [
    new Date(shift.start_time).toLocaleDateString('es-CL'),
    shift.type,
    shift.completed_tasks && shift.total_tasks
      ? `${shift.completed_tasks}/${shift.total_tasks} (${Math.round(shift.completion_rate || 0)}%)`
      : 'N/A'
  ]);

  autoTable(doc, {
    startY: finalY + 20,
    head: [['Fecha', 'Turno', 'Completitud']],
    body: shiftsData.length > 0 ? shiftsData : [['No hay turnos registrados', '', '']],
    theme: 'striped',
    headStyles: { fillColor: [234, 88, 12] },
    margin: { left: 14, right: 14 }
  });

  // Weekly Achievements Section
  const shiftsTableY = (doc as any).lastAutoTable.finalY || 150;

  // Check if we need a new page
  if (shiftsTableY > 220) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Logros Semanales', 14, 20);

    const achievementsData = data.weekly_achievements.slice(0, 8).map((achievement: any) => [
      achievement.week_start,
      `${achievement.tasks_completed}/${achievement.total_tasks}`,
      achievement.premio || 'Sin premio'
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['Semana', 'Tareas', 'Premio']],
      body: achievementsData.length > 0 ? achievementsData : [['No hay logros registrados', '', '']],
      theme: 'striped',
      headStyles: { fillColor: [234, 88, 12] },
      margin: { left: 14, right: 14 }
    });
  } else {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Logros Semanales', 14, shiftsTableY + 15);

    const achievementsData = data.weekly_achievements.slice(0, 8).map((achievement: any) => [
      achievement.week_start,
      `${achievement.tasks_completed}/${achievement.total_tasks}`,
      achievement.premio || 'Sin premio'
    ]);

    autoTable(doc, {
      startY: shiftsTableY + 20,
      head: [['Semana', 'Tareas', 'Premio']],
      body: achievementsData.length > 0 ? achievementsData : [['No hay logros registrados', '', '']],
      theme: 'striped',
      headStyles: { fillColor: [234, 88, 12] },
      margin: { left: 14, right: 14 }
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  return Buffer.from(doc.output('arraybuffer'));
}

export function generateMonthlyPDF(data: MonthlyReport): Buffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Reporte Mensual', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`${monthNames[data.month - 1]} ${data.year}`, pageWidth / 2, 30, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-CL')}`, pageWidth / 2, 36, { align: 'center' });

  // Summary Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Resumen del Mes', 14, 50);

  const summaryData = [
    ['Total de Ventas', data.total_sales.toString()],
    ['Reposiciones', data.total_restocks?.toString() || 'N/A'],
    ['Nivel Promedio de Inventario', data.avg_inventory_level ? `${data.avg_inventory_level}%` : 'N/A'],
    ['Alertas Críticas', data.critical_alerts_count?.toString() || 'N/A'],
    ['Empleados Activos', data.employees_count.toString()],
    ['Mejor Empleado', data.best_employee || 'N/A']
  ];

  autoTable(doc, {
    startY: 55,
    head: [['Indicador', 'Valor']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [234, 88, 12] },
    margin: { left: 14, right: 14 }
  });

  // Sales Section (if available in report_data)
  if (data.report_data?.sales) {
    const summaryY = (doc as any).lastAutoTable.finalY || 110;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Ventas por Producto', 14, summaryY + 15);

    const salesData = data.report_data.sales.slice(0, 15).map((sale: any) => [
      sale.name,
      sale.type === 'pizza' ? 'Pizza' : 'Tabla',
      sale.total_quantity.toString()
    ]);

    autoTable(doc, {
      startY: summaryY + 20,
      head: [['Producto', 'Tipo', 'Cantidad']],
      body: salesData,
      theme: 'striped',
      headStyles: { fillColor: [234, 88, 12] },
      margin: { left: 14, right: 14 }
    });
  }

  // Employee Performance Section (if available)
  if (data.report_data?.employees_performance) {
    const salesY = (doc as any).lastAutoTable.finalY || 150;

    // Check if we need a new page
    if (salesY > 220) {
      doc.addPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Desempeño de Empleados', 14, 20);

      const employeesData = data.report_data.employees_performance.map((emp: any) => [
        emp.employee_name,
        emp.shifts_count?.toString() || '0',
        emp.avg_completion ? `${Math.round(emp.avg_completion)}%` : 'N/A'
      ]);

      autoTable(doc, {
        startY: 25,
        head: [['Empleado', 'Turnos', 'Completitud']],
        body: employeesData,
        theme: 'striped',
        headStyles: { fillColor: [234, 88, 12] },
        margin: { left: 14, right: 14 }
      });
    } else {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Desempeño de Empleados', 14, salesY + 15);

      const employeesData = data.report_data.employees_performance.map((emp: any) => [
        emp.employee_name,
        emp.shifts_count?.toString() || '0',
        emp.avg_completion ? `${Math.round(emp.avg_completion)}%` : 'N/A'
      ]);

      autoTable(doc, {
        startY: salesY + 20,
        head: [['Empleado', 'Turnos', 'Completitud']],
        body: employeesData,
        theme: 'striped',
        headStyles: { fillColor: [234, 88, 12] },
        margin: { left: 14, right: 14 }
      });
    }
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  return Buffer.from(doc.output('arraybuffer'));
}
