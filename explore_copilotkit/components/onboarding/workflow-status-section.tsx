/**
 * WorkflowStatusSection Component
 *
 * Displays a list of required fields for client onboarding with completion status.
 * Shows checkmarks (☑) for completed fields and empty boxes (☐) for pending fields.
 *
 * Uses color coding:
 * - Green: Completed fields
 * - Yellow: Pending fields
 */

import clsx from 'clsx';

export interface RequiredField {
  name: string;
  label: string;
  completed: boolean;
  description?: string;
}

export interface WorkflowStatusSectionProps {
  fields: RequiredField[];
  className?: string;
}

/**
 * Individual field status component
 */
function FieldStatus({ field }: { field: RequiredField }) {
  return (
    <div className="flex items-start gap-3 py-2">
      {/* Status Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {field.completed ? (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" strokeWidth={2} />
          </svg>
        )}
      </div>

      {/* Field Label and Description */}
      <div className="flex-1 min-w-0">
        <div className={clsx('text-sm font-medium', field.completed ? 'text-gray-900' : 'text-gray-700')}>
          {field.label}
        </div>
        {field.description && (
          <div className="text-xs text-gray-500 mt-0.5">{field.description}</div>
        )}
      </div>

      {/* Status Text */}
      <div className="flex-shrink-0 text-xs font-medium">
        {field.completed ? (
          <span className="text-green-600">Complete</span>
        ) : (
          <span className="text-yellow-600">Pending</span>
        )}
      </div>
    </div>
  );
}

export function WorkflowStatusSection({ fields, className }: WorkflowStatusSectionProps) {
  const completedCount = fields.filter((f) => f.completed).length;
  const totalCount = fields.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className={clsx('p-6 bg-white rounded-lg border border-gray-200 shadow-sm', className)}>
      {/* Header with progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Workflow Status</h3>
          {/* TODO: Future refactor - show step progress, stage info, completion % */}
          <span className="text-sm text-gray-600">
            {completedCount} of {totalCount} fields
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-600 transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Field List */}
      <div className="divide-y divide-gray-100">
        {fields.map((field) => (
          <FieldStatus key={field.name} field={field} />
        ))}
      </div>

      {/* Empty State */}
      {fields.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-sm">No required fields defined</p>
        </div>
      )}
    </div>
  );
}
