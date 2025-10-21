'use client';

import React, { useState } from 'react';
import { RegistryComponentProps } from '@/lib/ui/component-registry';
import clsx from 'clsx';

/**
 * DocumentUpload Component
 *
 * Handles file uploads for workflow steps requiring document submission.
 * Supports multiple file uploads with preview and validation.
 */
export function DocumentUpload({
  stepId,
  schema,
  inputs,
  onInputChange,
  onSubmit,
  requiredFields,
  isProcessing = false,
  error,
}: RegistryComponentProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (fileList: FileList) => {
    const files = Array.from(fileList);
    const existingFiles = inputs.files || [];
    const newFiles = [...existingFiles, ...files.map((f) => f.name)];
    onInputChange('files', newFiles);
  };

  const removeFile = (index: number) => {
    const files = inputs.files || [];
    const newFiles = files.filter((_: any, i: number) => i !== index);
    onInputChange('files', newFiles);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const uploadedFiles = inputs.files || [];
  const hasRequiredFiles = uploadedFiles.length > 0;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-4">Upload Documents</h2>

      <form onSubmit={handleSubmit}>
        {/* File Upload Area */}
        <div
          className={clsx(
            'border-2 border-dashed rounded-lg p-8 text-center mb-6',
            'transition-colors cursor-pointer',
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-gray-300 hover:border-primary',
            isProcessing && 'pointer-events-none opacity-50'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('fileInput')?.click()}
        >
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            <span className="font-medium text-primary">Click to upload</span> or
            drag and drop
          </p>
          <p className="text-xs text-gray-500">
            PDF, DOC, DOCX, JPG, PNG up to 10MB
          </p>
          <input
            id="fileInput"
            type="file"
            multiple
            onChange={handleFileInput}
            className="hidden"
            disabled={isProcessing}
          />
        </div>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2">Uploaded Files:</h3>
            <ul className="space-y-2">
              {uploadedFiles.map((file: string, index: number) => (
                <li
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <svg
                      className="h-5 w-5 text-primary mr-2"
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
                    <span className="text-sm">{file}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="text-danger hover:text-danger/80 text-sm"
                    disabled={isProcessing}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger rounded-lg">
            <p className="text-danger text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isProcessing || !hasRequiredFiles}
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
