import { cn } from '../lib/utils';

interface ProgressBarProps {
  percentage: number;
  criticalThreshold: number;
  warningThreshold: number;
  showLabel?: boolean;
}

export function ProgressBar({
  percentage,
  criticalThreshold,
  warningThreshold,
  showLabel = true
}: ProgressBarProps) {
  const getColor = () => {
    if (percentage <= criticalThreshold) return 'bg-red-500';
    if (percentage <= warningThreshold) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-1">
        {showLabel && (
          <span className={cn(
            'text-sm font-semibold',
            percentage <= criticalThreshold && 'text-red-600',
            percentage > criticalThreshold && percentage <= warningThreshold && 'text-yellow-600',
            percentage > warningThreshold && 'text-green-600'
          )}>
            {percentage}%
          </span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', getColor())}
          style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
        />
      </div>
    </div>
  );
}
