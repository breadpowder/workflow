'use client';

import React from 'react';
import { RegistryComponentProps } from '@/lib/ui/component-registry';
import clsx from 'clsx';

/**
 * DataTable Component
 *
 * Displays data in a table format with sorting and editing capabilities.
 * Useful for workflow steps that collect structured tabular data.
 */
export function DataTable({
  stepId,
  schema,
  inputs,
  onInputChange,
  onSubmit,
  requiredFields,
  isProcessing = false,
  error,
}: RegistryComponentProps) {
  const rows = inputs.rows || [];

  const addRow = () => {
    const newRow: Record<string, any> = {};
    schema.fields.forEach((field: any) => {
      newRow[field.name] = '';
    });
    onInputChange('rows', [...rows, newRow]);
  };

  const removeRow = (index: number) => {
    const newRows = rows.filter((_: any, i: number) => i !== index);
    onInputChange('rows', newRows);
  };

  const updateCell = (rowIndex: number, fieldName: string, value: any) => {
    const newRows = [...rows];
    newRows[rowIndex][fieldName] = value;
    onInputChange('rows', newRows);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Enter Data</h2>
        <button
          type="button"
          onClick={addRow}
          disabled={isProcessing}
          className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:bg-gray-300"
        >
          + Add Row
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                {schema.fields.map((field: any) => (
                  <th
                    key={field.name}
                    className="px-4 py-3 text-left text-sm font-medium border"
                  >
                    {field.label}
                    {requiredFields.includes(field.name) && (
                      <span className="text-danger ml-1">*</span>
                    )}
                  </th>
                ))}
                <th className="px-4 py-3 text-center border w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={schema.fields.length + 1}
                    className="px-4 py-8 text-center text-gray-500 border"
                  >
                    No data yet. Click "Add Row" to get started.
                  </td>
                </tr>
              ) : (
                rows.map((row: any, rowIndex: number) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    {schema.fields.map((field: any) => (
                      <td key={field.name} className="px-2 py-2 border">
                        {field.type === 'select' ? (
                          <select
                            value={row[field.name] || ''}
                            onChange={(e) =>
                              updateCell(rowIndex, field.name, e.target.value)
                            }
                            disabled={isProcessing}
                            className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="">Select...</option>
                            {field.options?.map((opt: any) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type || 'text'}
                            value={row[field.name] || ''}
                            onChange={(e) =>
                              updateCell(rowIndex, field.name, e.target.value)
                            }
                            placeholder={field.placeholder}
                            disabled={isProcessing}
                            className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        )}
                      </td>
                    ))}
                    <td className="px-2 py-2 border text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(rowIndex)}
                        disabled={isProcessing}
                        className="text-danger hover:text-danger/80 text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger rounded-lg">
            <p className="text-danger text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isProcessing || rows.length === 0}
            className={clsx(
              'px-6 py-2 rounded-lg font-medium',
              'bg-primary text-white',
              'hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary',
              'disabled:bg-gray-300 disabled:cursor-not-allowed',
              'transition-colors'
            )}
          >
            {isProcessing ? 'Processing...' : 'Continue'}
          </button>
        </div>
      </form>
    </div>
  );
}
