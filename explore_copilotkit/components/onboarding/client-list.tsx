/**
 * ClientList Component
 *
 * Main client list component with search functionality.
 * Displays clients grouped by type (Corporate/Individual) in expandable folders.
 */

'use client';

import { useState, useMemo } from 'react';
import { useClientData } from '@/lib/hooks/useClientData';
import type { Client } from '@/lib/mock-data/clients';
import { ClientFolder } from './client-folder';

interface ClientListProps {
  selectedClientId?: string;
  onClientSelect: (client: Client) => void;
}

export function ClientList({
  selectedClientId,
  onClientSelect,
}: ClientListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch client data from file-based storage
  const { clients, loading, error, searchClients: searchFn } = useClientData();

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    const results = searchQuery.trim()
      ? searchFn(searchQuery)
      : clients;

    return {
      corporate: results.filter((c) => c.type === 'corporate'),
      individual: results.filter((c) => c.type === 'individual'),
    };
  }, [searchQuery, clients, searchFn]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading clients...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center text-red-600">
          <svg
            className="w-12 h-12 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="font-semibold mb-1">Error loading clients</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Clients</h2>

        {/* Search Box */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Client Folders */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredClients.corporate.length === 0 && filteredClients.individual.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            <svg
              className="w-12 h-12 mx-auto mb-2 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p>No clients found</p>
            <p className="text-xs mt-1">Try adjusting your search</p>
          </div>
        ) : (
          <>
            {/* Corporate Clients Folder */}
            {filteredClients.corporate.length > 0 && (
              <ClientFolder
                title="Corporate"
                clients={filteredClients.corporate}
                selectedClientId={selectedClientId}
                onClientSelect={onClientSelect}
                defaultExpanded={true}
              />
            )}

            {/* Individual Clients Folder */}
            {filteredClients.individual.length > 0 && (
              <ClientFolder
                title="Individual"
                clients={filteredClients.individual}
                selectedClientId={selectedClientId}
                onClientSelect={onClientSelect}
                defaultExpanded={true}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
