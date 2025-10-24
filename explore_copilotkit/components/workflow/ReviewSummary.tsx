'use client';

import React, { useState } from 'react';
import { RegistryComponentProps } from '@/lib/ui/component-registry';
import type { DocumentMetadata } from '@/lib/workflow/schema';
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
  const [documents, setDocuments] = useState<DocumentMetadata[]>(inputs.documents || []);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentMetadata | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  // Handle approve document
  const handleApprove = async (doc: DocumentMetadata) => {
    if (!confirm(`Approve ${doc.filename}?`)) return;

    setActionLoading(doc.type);
    try {
      const response = await fetch('/api/client-state/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: inputs.id || inputs.clientId,
          documentType: doc.type,
          approval_status: 'approved',
          approver_id: 'current-user', // TODO: Get from auth context
        }),
      });

      if (!response.ok) throw new Error('Approval failed');

      const result = await response.json();
      const updatedDocs = documents.map((d) =>
        d.type === doc.type ? result.document : d
      );
      setDocuments(updatedDocs);
      onInputChange('documents', updatedDocs);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle reject click - show modal
  const handleRejectClick = (doc: DocumentMetadata) => {
    setSelectedDocument(doc);
    setShowRejectModal(true);
  };

  // Confirm rejection with reason
  const confirmReject = async () => {
    if (!selectedDocument || !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setActionLoading(selectedDocument.type);
    try {
      const response = await fetch('/api/client-state/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: inputs.id || inputs.clientId,
          documentType: selectedDocument.type,
          approval_status: 'rejected',
          approver_id: 'current-user', // TODO: Get from auth context
          rejection_reason: rejectionReason,
        }),
      });

      if (!response.ok) throw new Error('Rejection failed');

      const result = await response.json();
      const updatedDocs = documents.map((d) =>
        d.type === selectedDocument.type ? result.document : d
      );
      setDocuments(updatedDocs);
      onInputChange('documents', updatedDocs);

      // Close modal
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedDocument(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Rejection failed');
    } finally {
      setActionLoading(null);
    }
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
      // Skip internal fields and documents (handled separately)
      if (key.startsWith('_') || key === 'documents' || key === 'id' || key === 'clientId') {
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

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={clsx(
          'px-2 py-1 text-xs font-medium rounded-full',
          colors[status as keyof typeof colors]
        )}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-6">Review Your Information</h2>

      <form onSubmit={handleSubmit}>
        {/* Contact Information Summary */}
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

        {/* Documents Table */}
        {documents && documents.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Uploaded Documents</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Filename
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Upload Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documents.map((doc) => (
                    <tr key={doc.type}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {doc.type
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {doc.filename}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={doc.approval_status} />
                        {doc.rejection_reason && (
                          <p
                            className="text-xs text-gray-500 mt-1"
                            title={doc.rejection_reason}
                          >
                            Reason: {doc.rejection_reason.substring(0, 30)}
                            {doc.rejection_reason.length > 30 && '...'}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {doc.approval_status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleApprove(doc)}
                              disabled={actionLoading === doc.type}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300"
                            >
                              {actionLoading === doc.type ? 'Loading...' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectClick(doc)}
                              disabled={actionLoading === doc.type}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {doc.approval_status === 'approved' && (
                          <span className="text-green-600 flex items-center">
                            <svg
                              className="h-5 w-5 mr-1"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Approved
                          </span>
                        )}
                        {doc.approval_status === 'rejected' && (
                          <span className="text-red-600">Rejected</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Reject Document</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting{' '}
              <strong>{selectedDocument?.filename}</strong>
            </p>
            <textarea
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              rows={4}
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedDocument(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={!rejectionReason.trim() || actionLoading !== null}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300"
              >
                {actionLoading ? 'Confirming...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
