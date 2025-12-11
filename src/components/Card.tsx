import { ReactNode } from 'react';
import { cn } from '../lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn('bg-white border border-border rounded-xl shadow-sm transition-colors', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn('p-6 border-b border-border', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: CardProps) {
  return (
    <h2 className={cn('text-xl font-bold text-text-primary font-heading', className)}>
      {children}
    </h2>
  );
}

export function CardContent({ children, className }: CardProps) {
  return (
    <div className={cn('p-6 text-text-primary', className)}>
      {children}
    </div>
  );
}
