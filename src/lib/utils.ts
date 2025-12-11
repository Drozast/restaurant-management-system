import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getPercentageColor(percentage: number, criticalThreshold: number, warningThreshold: number): string {
  if (percentage <= criticalThreshold) return 'text-red-600';
  if (percentage <= warningThreshold) return 'text-yellow-600';
  return 'text-green-600';
}

export function getPercentageBackground(percentage: number, criticalThreshold: number, warningThreshold: number): string {
  if (percentage <= criticalThreshold) return 'bg-red-100';
  if (percentage <= warningThreshold) return 'bg-yellow-100';
  return 'bg-green-100';
}

export function getCurrentWeekDates(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();

  // Find Tuesday (start of week)
  const daysUntilTuesday = (dayOfWeek + 5) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - daysUntilTuesday);
  start.setHours(0, 0, 0, 0);

  // Saturday (end of week)
  const end = new Date(start);
  end.setDate(start.getDate() + 4);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}
