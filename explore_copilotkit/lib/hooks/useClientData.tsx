'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Client, ClientType } from '@/lib/mock-data/clients';

/**
 * Return type for useClientData hook
 */
export interface UseClientDataReturn {
  clients: Client[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  searchClients: (query: string) => Client[];
  getClientsByType: (type: ClientType) => Client[];
  getClientById: (id: string) => Client | undefined;
}

/**
 * React hook for accessing file-based client data
 *
 * Fetches clients from /api/client-state endpoint and provides
 * filtering and search functions. Replaces mock data functions
 * from lib/mock-data/clients.ts.
 *
 * @returns {UseClientDataReturn} Client data and utility functions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { clients, loading, error, searchClients } = useClientData();
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *
 *   const results = searchClients('Acme');
 *   return <div>{results.length} clients found</div>;
 * }
 * ```
 */
export function useClientData(): UseClientDataReturn {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch clients from API endpoint
   * Memoized to prevent unnecessary re-fetches
   */
  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/client-state');

      if (!response.ok) {
        throw new Error(`Failed to fetch clients: ${response.statusText}`);
      }

      const data = await response.json();
      setClients(data.clients || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Auto-fetch on mount
   */
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  /**
   * Search clients by name, email, or ID (case-insensitive)
   * Memoized to prevent unnecessary recomputation
   */
  const searchClients = useCallback((query: string): Client[] => {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return clients;

    return clients.filter((client) =>
      client.name.toLowerCase().includes(lowerQuery) ||
      client.email.toLowerCase().includes(lowerQuery) ||
      client.id.toLowerCase().includes(lowerQuery)
    );
  }, [clients]);

  /**
   * Filter clients by type (corporate/individual)
   * Memoized to prevent unnecessary recomputation
   */
  const getClientsByType = useCallback((type: ClientType): Client[] => {
    return clients.filter((client) => client.type === type);
  }, [clients]);

  /**
   * Get a single client by ID
   * Memoized to prevent unnecessary recomputation
   */
  const getClientById = useCallback((id: string): Client | undefined => {
    return clients.find((client) => client.id === id);
  }, [clients]);

  return {
    clients,
    loading,
    error,
    refetch: fetchClients,
    searchClients,
    getClientsByType,
    getClientById,
  };
}
