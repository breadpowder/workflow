'use client';

import React, { useState, useRef } from 'react';
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

      case 'file':
        return (
          <FileUploadField
            key={name}
            field={field}
            value={value}
            onChange={(val) => onInputChange(name, val)}
            isRequired={isRequired}
            isProcessing={isProcessing}
            clientId={inputs.clientId || inputs.id || 'unknown'}
          />
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
            {isProcessing ? 'Processing...' : (schema as any).submitLabel || 'Continue'}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * File Upload Field Component
 * Supports drag-drop and file picker for document uploads
 */
interface FileUploadFieldProps {
  field: any;
  value: any;
  onChange: (value: any) => void;
  isRequired: boolean;
  isProcessing: boolean;
  clientId: string;
}

function FileUploadField({
  field,
  value,
  onChange,
  isRequired,
  isProcessing,
  clientId,
}: FileUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadedDocument = value;

  // Validate file
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const allowedTypes = field.validation?.accept || [];
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Only ${allowedTypes.map((t: string) => t.split('/')[1].toUpperCase()).join(', ')} files are allowed`,
      };
    }

    const maxSize = field.validation?.maxSize || Infinity;
    if (file.size > maxSize) {
      const maxMB = (maxSize / 1024 / 1024).toFixed(0);
      return {
        valid: false,
        error: `File size exceeds ${maxMB}MB limit`,
      };
    }

    return { valid: true };
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    setError(null);

    // Client-side validation
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('clientId', clientId);
      formData.append('documentType', field.name);
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const result = await response.json();
      onChange(result.document);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // File picker handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // Click to open file picker
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {field.label}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
      </label>

      {field.helpText && (
        <p className="text-sm text-gray-500 mb-2">{field.helpText}</p>
      )}

      {!uploadedDocument && (
        <div
          className={clsx(
            'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-200',
            isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400',
            (uploading || isProcessing) && 'opacity-50 pointer-events-none'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          {uploading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-2" />
              <p className="text-sm text-gray-600">Uploading...</p>
            </div>
          ) : (
            <div>
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                {field.placeholder || 'Drag file here or click to upload'}
              </p>
              {field.validation?.accept && (
                <p className="mt-1 text-xs text-gray-500">
                  {field.validation.accept.map((t: string) => t.split('/')[1].toUpperCase()).join(', ')}
                  {field.validation.maxSize && ` • Max ${(field.validation.maxSize / 1024 / 1024).toFixed(0)}MB`}
                </p>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={field.validation?.accept?.join(',')}
            onChange={handleFileChange}
          />
        </div>
      )}

      {uploadedDocument && (
        <div className="border border-green-300 bg-green-50 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <svg className="h-8 w-8 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-900">{uploadedDocument.filename}</p>
              <p className="text-xs text-gray-500">
                {(uploadedDocument.fileSize / 1024 / 1024).toFixed(2)} MB • Uploaded {new Date(uploadedDocument.uploadedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="text-sm text-blue-600 hover:text-blue-700"
            onClick={() => onChange(null)}
          >
            Replace
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
