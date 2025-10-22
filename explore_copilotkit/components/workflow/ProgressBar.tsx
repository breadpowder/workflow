'use client';

import { clsx } from 'clsx';

export interface ProgressBarProps {
  percentage: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'accent';
}

/**
 * Progress bar component for showing workflow completion
 */
export function ProgressBar({
  percentage,
  label,
  showPercentage = true,
  size = 'md',
  color = 'primary',
}: ProgressBarProps) {
  // Clamp percentage between 0 and 100
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  // Size classes
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  // Color classes
  const colorClasses = {
    primary: 'bg-primary',
    success: 'bg-success',
    accent: 'bg-accent',
  };

  return (
    <div className="w-full">
      {/* Label and percentage */}
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-2 text-sm text-gray-700">
          {label && <span className="font-medium">{label}</span>}
          {showPercentage && (
            <span className="text-gray-500">{Math.round(clampedPercentage)}%</span>
          )}
        </div>
      )}

      {/* Progress bar track */}
      <div className="w-full bg-gray-200 rounded-full overflow-hidden">
        {/* Progress bar fill */}
        <div
          className={clsx(
            'transition-all duration-300 ease-out rounded-full',
            sizeClasses[size],
            colorClasses[color]
          )}
          style={{ width: `${clampedPercentage}%` }}
          role="progressbar"
          aria-valuenow={clampedPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
