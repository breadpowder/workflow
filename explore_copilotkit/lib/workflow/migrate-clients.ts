/**
 * Client Data Migration Utility
 *
 * Migrates mock client data to file-based JSON storage.
 * This is a one-time migration tool that converts MOCK_CLIENTS
 * into individual ClientState JSON files.
 *
 * Usage:
 *   node -e "import('./lib/workflow/migrate-clients.js').then(m => m.migrateClientData())"
 */

import { MOCK_CLIENTS, type Client } from '@/lib/mock-data/clients';
import {
  saveClientState,
  clientStateExists,
  type ClientState,
} from './state-store';

/**
 * Migrate a single client to file-based storage
 *
 * Fetches workflow from API to get correct workflow IDs and initial step.
 *
 * @param client - Client to migrate
 */
async function migrateClient(client: Client): Promise<void> {
  // Check if file already exists (idempotent)
  const exists = await clientStateExists(client.id);
  if (exists) {
    console.log(`⊘ Skip: ${client.id} - already exists`);
    return;
  }

  // Fetch actual workflow to get correct IDs
  const params = new URLSearchParams({ client_type: client.type });
  if (client.jurisdiction) {
    params.append('jurisdiction', client.jurisdiction);
  }

  // Use environment variable or default port 3009
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3009';
  const workflowResponse = await fetch(
    `${baseUrl}/api/workflows?${params.toString()}`
  );

  if (!workflowResponse.ok) {
    throw new Error(
      `Failed to fetch workflow for ${client.type}: ${workflowResponse.statusText}`
    );
  }

  const workflow = await workflowResponse.json();

  // Create ClientState with correct IDs from API
  const state: ClientState = {
    clientId: client.id,
    workflowId: workflow.id, // ✓ From API (will be null or workflow ID)
    currentStepId: workflow.initialStepId, // ✓ From API (e.g., 'collectContactInfo')
    currentStage: undefined,
    collectedInputs: {},
    completedSteps: [],
    completedStages: [],
    lastUpdated: new Date().toISOString(),
    data: client,
  };

  await saveClientState(client.id, state);
  console.log(
    `✓ Migrated: ${client.id} (${client.name}) → workflow.id=${workflow.id}, initialStep=${workflow.initialStepId}`
  );
}

/**
 * Migrate all mock clients to file-based storage
 *
 * Creates ClientState files for each mock client with:
 * - Correct workflow ID fetched from API
 * - Correct initial step ID from API
 * - Full client profile data in the `data` field
 *
 * Migration is idempotent - existing files are not overwritten.
 *
 * @returns Count of clients migrated
 */
export async function migrateClientData(): Promise<number> {
  console.log('🔄 Starting client data migration...\n');

  let migratedCount = 0;
  let skippedCount = 0;

  for (const client of MOCK_CLIENTS) {
    try {
      await migrateClient(client);
      migratedCount++;
    } catch (error) {
      console.error(
        `✗ Failed to migrate ${client.id}:`,
        error instanceof Error ? error.message : error
      );
      skippedCount++;
    }
  }

  console.log(`\n✓ Migration complete: ${migratedCount} migrated, ${skippedCount} skipped`);
  return migratedCount;
}
