/**
 * Mock Client Data for POC
 *
 * Provides sample client data for testing the client list component.
 * In production, this would come from a database or API.
 */

export type ClientType = 'corporate' | 'individual';
export type ClientStatus = 'active' | 'pending' | 'review' | 'complete';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  status: ClientStatus;
  email: string;
  risk: RiskLevel;
  entityType?: string;
  jurisdiction?: string;
  createdAt: string;
  lastActivity: string;
}

/**
 * Mock corporate clients
 */
export const MOCK_CORPORATE_CLIENTS: Client[] = [
  {
    id: 'corp-001',
    name: 'Acme Corp',
    type: 'corporate',
    status: 'active',
    email: 'admin@acmecorp.com',
    risk: 'low',
    entityType: 'LLC',
    jurisdiction: 'US',
    createdAt: '2025-10-15',
    lastActivity: '2025-10-22',
  },
  {
    id: 'corp-002',
    name: 'GreenTech Industries',
    type: 'corporate',
    status: 'pending',
    email: 'contact@greentech.com',
    risk: 'medium',
    entityType: 'Corporation',
    jurisdiction: 'UK',
    createdAt: '2025-10-18',
    lastActivity: '2025-10-21',
  },
  {
    id: 'corp-003',
    name: 'TechStart Ventures',
    type: 'corporate',
    status: 'review',
    email: 'info@techstart.io',
    risk: 'high',
    entityType: 'Partnership',
    jurisdiction: 'SG',
    createdAt: '2025-10-20',
    lastActivity: '2025-10-22',
  },
];

/**
 * Mock individual clients
 */
export const MOCK_INDIVIDUAL_CLIENTS: Client[] = [
  {
    id: 'ind-001',
    name: 'John Smith',
    type: 'individual',
    status: 'active',
    email: 'john.smith@email.com',
    risk: 'low',
    jurisdiction: 'US',
    createdAt: '2025-10-10',
    lastActivity: '2025-10-20',
  },
  {
    id: 'ind-002',
    name: 'Sarah Johnson',
    type: 'individual',
    status: 'complete',
    email: 'sarah.j@email.com',
    risk: 'low',
    jurisdiction: 'CA',
    createdAt: '2025-10-12',
    lastActivity: '2025-10-19',
  },
];

/**
 * All mock clients combined
 */
export const MOCK_CLIENTS: Client[] = [
  ...MOCK_CORPORATE_CLIENTS,
  ...MOCK_INDIVIDUAL_CLIENTS,
];

/**
 * Get clients by type
 */
export function getClientsByType(type: ClientType): Client[] {
  return MOCK_CLIENTS.filter((client) => client.type === type);
}

/**
 * Get client by ID
 */
export function getClientById(id: string): Client | undefined {
  return MOCK_CLIENTS.find((client) => client.id === id);
}

/**
 * Filter clients by search query
 */
export function searchClients(query: string): Client[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return MOCK_CLIENTS;

  return MOCK_CLIENTS.filter((client) =>
    client.name.toLowerCase().includes(lowerQuery) ||
    client.email.toLowerCase().includes(lowerQuery) ||
    client.id.toLowerCase().includes(lowerQuery)
  );
}
