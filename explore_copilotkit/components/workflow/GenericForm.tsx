'use client';

import React from 'react';
import { RegistryComponentProps } from '@/lib/ui/component-registry';
import clsx from 'clsx';

/**
 * GenericForm Component
 *
 * Renders a form based on the schema definition from YAML task files.
 * Supports text, email, number, tel, select, textarea, and checkbox field types.
 */
export function GenericForm({
  stepId,
  schema,
  inputs,
  onInputChange,
  onSubmit,
  requiredFields = [],
  isProcessing = false,
  error,
}: RegistryComponentProps) {
  // Handle missing or invalid schema
  if (!schema || !schema.fields || !Array.isArray(schema.fields)) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <p className="text-danger">Invalid form schema</p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const isFieldRequired = (fieldName: string) => {
    return requiredFields && requiredFields.includes(fieldName);
  };

  const renderField = (field: any) => {
    const {
      name,
      label,
      type,
      placeholder,
      options,
      required: fieldRequired,
    } = field;
    const value = inputs[name] || '';
    const isRequired = isFieldRequired(name);

    const baseInputClasses = clsx(
      'w-full px-4 py-2 border rounded-lg',
      'focus:outline-none focus:ring-2 focus:ring-primary',
      'disabled:bg-gray-100 disabled:cursor-not-allowed'
    );

    switch (type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <div key={name} className="mb-4">
            <label htmlFor={name} className="block text-sm font-medium mb-2">
              {label}
              {isRequired && <span className="text-danger ml-1">*</span>}
            </label>
            <input
              type={type}
              id={name}
              name={name}
              value={value}
              onChange={(e) => onInputChange(name, e.target.value)}
              placeholder={placeholder}
              required={isRequired}
              disabled={isProcessing}
              className={baseInputClasses}
            />
          </div>
        );

      case 'tel':
        return (
          <div key={name} className="mb-4">
            <label htmlFor={name} className="block text-sm font-medium mb-2">
              {label}
              {isRequired && <span className="text-danger ml-1">*</span>}
            </label>
            <input
              type="tel"
              id={name}
              name={name}
              value={value}
              onChange={(e) => onInputChange(name, e.target.value)}
              placeholder={placeholder}
              pattern={field.validation?.pattern}
              required={isRequired}
              disabled={isProcessing}
              className={baseInputClasses}
            />
            {field.helpText && (
              <p className="text-sm text-gray-500 mt-1">{field.helpText}</p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={name} className="mb-4">
            <label htmlFor={name} className="block text-sm font-medium mb-2">
              {label}
              {isRequired && <span className="text-danger ml-1">*</span>}
            </label>
            <textarea
              id={name}
              name={name}
              value={value}
              onChange={(e) => onInputChange(name, e.target.value)}
              placeholder={placeholder}
              required={isRequired}
              disabled={isProcessing}
              rows={4}
              className={baseInputClasses}
            />
          </div>
        );

      case 'select':
        return (
          <div key={name} className="mb-4">
            <label htmlFor={name} className="block text-sm font-medium mb-2">
              {label}
              {isRequired && <span className="text-danger ml-1">*</span>}
            </label>
            <select
              id={name}
              name={name}
              value={value}
              onChange={(e) => onInputChange(name, e.target.value)}
              required={isRequired}
              disabled={isProcessing}
              className={baseInputClasses}
            >
              <option value="">Select an option...</option>
              {options?.map((opt: any) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );

      case 'checkbox':
        return (
          <div key={name} className="mb-4 flex items-center">
            <input
              type="checkbox"
              id={name}
              name={name}
              checked={!!value}
              onChange={(e) => onInputChange(name, e.target.checked)}
              disabled={isProcessing}
              className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary rounded"
            />
            <label htmlFor={name} className="ml-2 text-sm">
              {label}
              {isRequired && <span className="text-danger ml-1">*</span>}
            </label>
          </div>
        );

      default:
        return (
          <div key={name} className="mb-4">
            <p className="text-warning text-sm">
              Unsupported field type: {type}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <form onSubmit={handleSubmit}>
        {schema.fields.map((field) => renderField(field))}

        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger rounded-lg">
            <p className="text-danger text-sm">{error}</p>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            type="submit"
            disabled={isProcessing}
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
