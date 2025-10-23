/**
 * ClientFolder Component
 *
 * Expandable folder for grouping clients by type (Corporate/Individual).
 * Supports expand/collapse functionality and displays client count.
 */

'use client';

import { useState } from 'react';
import type { Client } from '@/lib/mock-data/clients';
import { clsx } from 'clsx';

interface ClientFolderProps {
  title: string;
  clients: Client[];
  selectedClientId?: string;
  onClientSelect: (client: Client) => void;
  defaultExpanded?: boolean;
}

export function ClientFolder({
  title,
  clients,
  selectedClientId,
  onClientSelect,
  defaultExpanded = true,
}: ClientFolderProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="mb-2">
      {/* Folder Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors"
      >
        {/* Expand/Collapse Icon */}
        <svg
          className={clsx(
            'w-4 h-4 transition-transform',
            isExpanded ? 'rotate-90' : ''
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>

        {/* Folder Icon */}
        <svg
          className="w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>

        {/* Folder Title */}
        <span>{title}</span>

        {/* Client Count */}
        <span className="ml-auto text-xs text-gray-500">
          ({clients.length})
        </span>
      </button>

      {/* Client List */}
      {isExpanded && (
        <div className="mt-1 ml-4 space-y-1">
          {clients.map((client) => (
            <button
              key={client.id}
              onClick={() => onClientSelect(client)}
              className={clsx(
                'w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors',
                selectedClientId === client.id
                  ? 'bg-blue-50 text-blue-900 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              {/* Client Icon */}
              <div
                className={clsx(
                  'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                  client.type === 'corporate'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-green-100 text-green-700'
                )}
              >
                {client.name.charAt(0)}
              </div>

              {/* Client Info */}
              <div className="flex-1 text-left min-w-0">
                <div className="truncate">{client.name}</div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {/* Status Badge */}
                  <span
                    className={clsx(
                      'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
                      client.status === 'active' && 'bg-green-100 text-green-700',
                      client.status === 'pending' && 'bg-yellow-100 text-yellow-700',
                      client.status === 'review' && 'bg-orange-100 text-orange-700',
                      client.status === 'complete' && 'bg-gray-100 text-gray-700'
                    )}
                  >
                    {client.status}
                  </span>

                  {/* Risk Indicator */}
                  {client.risk !== 'low' && (
                    <span
                      className={clsx(
                        'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
                        client.risk === 'medium' && 'bg-yellow-100 text-yellow-700',
                        client.risk === 'high' && 'bg-red-100 text-red-700'
                      )}
                    >
                      {client.risk} risk
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
