/**
 * ProfileSection Component
 *
 * Displays client profile information including:
 * - Client name and avatar
 * - Email address
 * - Type (corporate/individual)
 * - Status, risk level, jurisdiction
 * - Entity type (if applicable)
 * - Created date
 */

import { Client } from '@/lib/mock-data/clients';
import clsx from 'clsx';

export interface ProfileSectionProps {
  client: Client;
  className?: string;
}

/**
 * Get background color for status badge
 */
function getStatusColor(status: Client['status']): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'review':
      return 'bg-orange-100 text-orange-800';
    case 'complete':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get background color for risk badge
 */
function getRiskColor(risk: Client['risk']): string {
  switch (risk) {
    case 'low':
      return 'bg-green-100 text-green-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'high':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function ProfileSection({ client, className }: ProfileSectionProps) {
  return (
    <div className={clsx('p-6 bg-white rounded-lg border border-gray-200 shadow-sm', className)}>
      {/* Header: Avatar + Name + Email */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-bold flex-shrink-0">
          {client.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-gray-900 truncate">{client.name}</h2>
          <p className="text-sm text-gray-500 truncate">{client.email}</p>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        {/* Type */}
        <div>
          <span className="text-gray-500">Type:</span>
          <span className="ml-2 font-medium capitalize">{client.type}</span>
        </div>

        {/* Status with badge */}
        <div>
          <span className="text-gray-500">Status:</span>
          <span
            className={clsx(
              'ml-2 px-2 py-0.5 rounded-full text-xs font-medium capitalize',
              getStatusColor(client.status)
            )}
          >
            {client.status}
          </span>
        </div>

        {/* Risk Level with badge */}
        <div>
          <span className="text-gray-500">Risk Level:</span>
          <span
            className={clsx(
              'ml-2 px-2 py-0.5 rounded-full text-xs font-medium capitalize',
              getRiskColor(client.risk)
            )}
          >
            {client.risk}
          </span>
        </div>

        {/* Jurisdiction */}
        <div>
          <span className="text-gray-500">Jurisdiction:</span>
          <span className="ml-2 font-medium">{client.jurisdiction}</span>
        </div>

        {/* Entity Type (corporate only) */}
        {client.entityType && (
          <div>
            <span className="text-gray-500">Entity Type:</span>
            <span className="ml-2 font-medium">{client.entityType}</span>
          </div>
        )}

        {/* Created Date */}
        <div>
          <span className="text-gray-500">Created:</span>
          <span className="ml-2 font-medium">{client.createdAt}</span>
        </div>

        {/* Last Activity */}
        <div className="col-span-2">
          <span className="text-gray-500">Last Activity:</span>
          <span className="ml-2 font-medium">{client.lastActivity}</span>
        </div>
      </div>
    </div>
  );
}
