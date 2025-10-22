'use client';

import { clsx } from 'clsx';

export interface Stage {
  id: string;
  name: string;
  description?: string;
}

export interface StageProgress {
  stageId: string;
  stageName: string;
  total: number;
  completed: number;
  percentage: number;
}

export interface StageIndicatorProps {
  stages: Stage[];
  currentStageId?: string;
  stageProgress?: StageProgress[];
}

/**
 * Stage indicator component showing workflow stages
 * Displays stages with completion status
 */
export function StageIndicator({
  stages,
  currentStageId,
  stageProgress = [],
}: StageIndicatorProps) {
  // Handle undefined or empty stages
  if (!stages || stages.length === 0) {
    return null;
  }

  // Create a map for quick progress lookup
  const progressMap = new Map(
    stageProgress.map((sp) => [sp.stageId, sp])
  );

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {stages.map((stage, index) => {
          const progress = progressMap.get(stage.id);
          const isCurrent = stage.id === currentStageId;
          const isCompleted = progress ? progress.percentage === 100 : false;
          const isActive = progress ? progress.completed > 0 : false;

          return (
            <div key={stage.id} className="flex items-center flex-1">
              {/* Stage circle and label */}
              <div className="flex flex-col items-center flex-1">
                {/* Circle */}
                <div
                  className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200',
                    {
                      // Completed
                      'bg-success border-success text-white': isCompleted,
                      // Current/Active
                      'bg-primary border-primary text-white': isCurrent && !isCompleted,
                      // Started but not current
                      'bg-accent/20 border-accent text-accent': isActive && !isCurrent && !isCompleted,
                      // Not started
                      'bg-gray-100 border-gray-300 text-gray-500': !isActive && !isCurrent && !isCompleted,
                    }
                  )}
                >
                  {isCompleted ? (
                    // Checkmark for completed
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    // Step number
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>

                {/* Stage name */}
                <div className="mt-2 text-center">
                  <div
                    className={clsx(
                      'text-sm font-medium transition-colors duration-200',
                      {
                        'text-primary': isCurrent,
                        'text-success': isCompleted && !isCurrent,
                        'text-gray-900': isActive && !isCurrent && !isCompleted,
                        'text-gray-500': !isActive && !isCurrent && !isCompleted,
                      }
                    )}
                  >
                    {stage.name}
                  </div>
                  {stage.description && (
                    <div className="text-xs text-gray-500 mt-1 hidden sm:block">
                      {stage.description}
                    </div>
                  )}
                  {progress && progress.percentage > 0 && progress.percentage < 100 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {progress.completed}/{progress.total}
                    </div>
                  )}
                </div>
              </div>

              {/* Connector line (not for last stage) */}
              {index < stages.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 -mt-12">
                  <div
                    className={clsx('h-full transition-colors duration-200', {
                      'bg-success': isCompleted,
                      'bg-primary': isCurrent,
                      'bg-gray-300': !isActive && !isCurrent,
                    })}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
