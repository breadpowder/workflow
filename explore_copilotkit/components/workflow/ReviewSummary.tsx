'use client';

import React from 'react';
import { RegistryComponentProps } from '@/lib/ui/component-registry';
import clsx from 'clsx';

/**
 * ReviewSummary Component
 *
 * Displays a summary of all collected inputs from previous workflow steps.
 * Allows user to review and confirm before final submission.
 */
export function ReviewSummary({
  stepId,
  schema,
  inputs,
  onInputChange,
  onSubmit,
  requiredFields,
  isProcessing = false,
  error,
}: RegistryComponentProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const renderValue = (value: any): string => {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value || '-');
  };

  const groupedInputs = Object.entries(inputs).reduce(
    (acc, [key, value]) => {
      // Skip internal fields
      if (key.startsWith('_')) {
        return acc;
      }

      // Group by field prefix (e.g., "contact_" or "business_")
      const prefix = key.split('_')[0];
      if (!acc[prefix]) {
        acc[prefix] = [];
      }
      acc[prefix].push({ key, value });
      return acc;
    },
    {} as Record<string, Array<{ key: string; value: any }>>
  );

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-6">Review Your Information</h2>

      <form onSubmit={handleSubmit}>
        {/* Summary Sections */}
        <div className="space-y-6 mb-6">
          {Object.entries(groupedInputs).map(([group, fields]) => (
            <div key={group} className="border rounded-lg p-4">
              <h3 className="text-lg font-medium mb-3 capitalize">
                {group.replace(/_/g, ' ')}
              </h3>
              <dl className="space-y-2">
                {fields.map(({ key, value }) => (
                  <div
                    key={key}
                    className="flex justify-between py-2 border-b last:border-b-0"
                  >
                    <dt className="text-sm font-medium text-gray-600 capitalize">
                      {key.replace(/_/g, ' ')}:
                    </dt>
                    <dd className="text-sm text-gray-900 text-right max-w-md">
                      {renderValue(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        {/* Confirmation Checkbox */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={inputs._confirmed || false}
              onChange={(e) => onInputChange('_confirmed', e.target.checked)}
              className="mt-1 w-4 h-4 text-primary focus:ring-2 focus:ring-primary rounded"
              disabled={isProcessing}
            />
            <span className="ml-3 text-sm text-gray-700">
              I confirm that the information provided above is accurate and
              complete to the best of my knowledge.
            </span>
          </label>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger rounded-lg">
            <p className="text-danger text-sm">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between">
          <button
            type="button"
            className="px-6 py-2 rounded-lg font-medium border border-gray-300 hover:bg-gray-50"
            disabled={isProcessing}
          >
            Back
          </button>
          <button
            type="submit"
            disabled={isProcessing || !inputs._confirmed}
            className={clsx(
              'px-6 py-2 rounded-lg font-medium',
              'bg-success text-white',
              'hover:bg-success/90 focus:outline-none focus:ring-2 focus:ring-success',
              'disabled:bg-gray-300 disabled:cursor-not-allowed',
              'transition-colors'
            )}
          >
            {isProcessing ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}
