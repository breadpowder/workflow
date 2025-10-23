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

import { MOCK_CLIENTS } from '@/lib/mock-data/clients';
import {
  saveClientState,
  clientStateExists,
  type ClientState,
} from './state-store';

/**
 * Migrate all mock clients to file-based storage
 *
 * Creates ClientState files for each mock client with:
 * - Appropriate workflow ID based on client type
 * - Initial workflow state (start step, empty inputs)
 * - Full client profile data in the `data` field
 *
 * Migration is idempotent - existing files are not overwritten.
 *
 * @returns Count of clients migrated
 */
export async function migrateClientData(): Promise<number> {
  console.log('Starting client data migration...');
  console.log(`Found ${MOCK_CLIENTS.length} clients to migrate`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const client of MOCK_CLIENTS) {
    // Check if file already exists (idempotent)
    const exists = await clientStateExists(client.id);
    if (exists) {
      console.log(`⊘ Skip: ${client.id} (${client.name}) - already exists`);
      skippedCount++;
      continue;
    }

    // Determine workflow ID based on client type
    const workflowId =
      client.type === 'corporate'
        ? 'corporate_onboarding_v1'
        : 'individual_onboarding_v1';

    // Create initial ClientState with client data
    const state: ClientState = {
      clientId: client.id,
      workflowId,
      currentStepId: 'start',
      currentStage: undefined,
      collectedInputs: {},
      completedSteps: [],
      completedStages: [],
      lastUpdated: new Date().toISOString(),
      data: client, // Embed full client profile
    };

    // Save using atomic write
    try {
      await saveClientState(client.id, state);
      console.log(`✓ Migrated: ${client.id} (${client.name}) → ${workflowId}`);
      migratedCount++;
    } catch (error) {
      console.error(
        `✗ Failed to migrate ${client.id}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  console.log('\nMigration complete:');
  console.log(`  ✓ Migrated: ${migratedCount} clients`);
  console.log(`  ⊘ Skipped: ${skippedCount} clients (already exist)`);
  console.log(`  Total: ${MOCK_CLIENTS.length} clients`);

  return migratedCount;
}
