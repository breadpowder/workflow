/**
 * Client state persistence (POC)
 *
 * File-based key-value storage for client workflow state.
 * Each client's state is stored in a JSON file.
 *
 * Production migration path: Replace with database adapter (PostgreSQL, MongoDB, etc.)
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Client workflow state
 */
export interface ClientState {
  clientId: string;
  workflowId: string;
  currentStepId: string;
  currentStage?: string;
  collectedInputs: Record<string, any>;
  completedSteps: string[];
  completedStages?: string[];
  lastUpdated: string;  // ISO 8601 timestamp
}

/**
 * Directory for client state files
 */
const STATE_DIR = path.join(process.cwd(), 'data', 'client_state');

/**
 * Save client state with atomic write operation
 *
 * Uses temp file + rename pattern to ensure atomicity:
 * 1. Write to {path}.tmp
 * 2. Rename to final path (atomic operation)
 *
 * @param clientId - Unique client identifier
 * @param state - Client workflow state
 */
export async function saveClientState(
  clientId: string,
  state: ClientState
): Promise<void> {
  // Ensure directory exists
  await fs.mkdir(STATE_DIR, { recursive: true });

  const filePath = path.join(STATE_DIR, `${clientId}.json`);
  const tempPath = `${filePath}.tmp`;

  // Validate state
  if (!state.clientId || !state.workflowId || !state.currentStepId) {
    throw new Error('Invalid client state: missing required fields');
  }

  // Update timestamp
  state.lastUpdated = new Date().toISOString();

  try {
    // Step 1: Write to temp file
    await fs.writeFile(
      tempPath,
      JSON.stringify(state, null, 2),
      'utf8'
    );

    // Step 2: Atomic rename (overwrites existing file)
    await fs.rename(tempPath, filePath);
  } catch (error) {
    // Clean up temp file if rename failed
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Load client state from file
 *
 * @param clientId - Unique client identifier
 * @returns Client state or null if not found
 */
export async function loadClientState(
  clientId: string
): Promise<ClientState | null> {
  const filePath = path.join(STATE_DIR, `${clientId}.json`);

  try {
    const content = await fs.readFile(filePath, 'utf8');
    const state = JSON.parse(content) as ClientState;

    // Validate loaded state
    if (!state.clientId || !state.workflowId || !state.currentStepId) {
      console.warn(`Invalid state file for client ${clientId}, returning null`);
      return null;
    }

    return state;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // File doesn't exist - this is expected for new clients
      return null;
    }

    // Log other errors but return null (don't crash)
    console.error(`Error loading client state for ${clientId}:`, error);
    return null;
  }
}

/**
 * List all client IDs with saved state
 *
 * @returns Array of client IDs
 */
export async function listClients(): Promise<string[]> {
  try {
    await fs.mkdir(STATE_DIR, { recursive: true });
    const files = await fs.readdir(STATE_DIR);

    return files
      .filter(f => f.endsWith('.json') && !f.endsWith('.tmp'))
      .map(f => f.replace('.json', ''));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // Directory doesn't exist yet
      return [];
    }
    throw error;
  }
}

/**
 * Delete client state
 *
 * @param clientId - Unique client identifier
 */
export async function deleteClientState(clientId: string): Promise<void> {
  const filePath = path.join(STATE_DIR, `${clientId}.json`);

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // File doesn't exist - nothing to delete
      return;
    }
    throw error;
  }
}

/**
 * Check if client state exists
 *
 * @param clientId - Unique client identifier
 * @returns True if state file exists
 */
export async function clientStateExists(clientId: string): Promise<boolean> {
  const filePath = path.join(STATE_DIR, `${clientId}.json`);

  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Update specific fields in client state
 *
 * Loads existing state, merges updates, and saves atomically
 *
 * @param clientId - Unique client identifier
 * @param updates - Partial state updates
 */
export async function updateClientState(
  clientId: string,
  updates: Partial<Omit<ClientState, 'clientId' | 'lastUpdated'>>
): Promise<void> {
  // Load existing state
  const existingState = await loadClientState(clientId);

  if (!existingState) {
    throw new Error(`Cannot update state: client ${clientId} not found`);
  }

  // Merge updates
  const updatedState: ClientState = {
    ...existingState,
    ...updates,
    clientId, // Ensure clientId doesn't change
  };

  // Save with atomic write
  await saveClientState(clientId, updatedState);
}

/**
 * Initialize new client state
 *
 * Creates initial state for a new client
 *
 * @param clientId - Unique client identifier
 * @param workflowId - Workflow to start
 * @param initialStepId - Initial step in workflow
 * @returns Created client state
 */
export async function initializeClientState(
  clientId: string,
  workflowId: string,
  initialStepId: string
): Promise<ClientState> {
  // Check if state already exists
  const exists = await clientStateExists(clientId);
  if (exists) {
    throw new Error(`Client state already exists for ${clientId}`);
  }

  // Create initial state
  const initialState: ClientState = {
    clientId,
    workflowId,
    currentStepId: initialStepId,
    currentStage: undefined,
    collectedInputs: {},
    completedSteps: [],
    completedStages: [],
    lastUpdated: new Date().toISOString(),
  };

  // Save
  await saveClientState(clientId, initialState);

  return initialState;
}
