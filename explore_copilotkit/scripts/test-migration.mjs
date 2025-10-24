/**
 * Test script for client data migration
 *
 * Run with: node scripts/test-migration.mjs
 */

import { migrateClientData } from '../.next/server/app/api/client-state/route.js';

console.log('Testing migration function...\n');

try {
  // Note: This will use the compiled JS from .next build output
  // In production, you'd import from the source
  console.log('Migration will be tested via API endpoint in dev server');
  console.log('Run: npm run dev');
  console.log('Then: curl http://localhost:3009/api/client-state');
} catch (error) {
  console.error('Error:', error.message);
}
