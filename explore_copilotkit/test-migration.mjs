import { migrateClientData } from './lib/workflow/migrate-clients.ts';

console.log('Testing idempotent migration...\n');

migrateClientData().then(count => {
  console.log('\n=== Test Complete ===');
  console.log(`Migration count: ${count}`);
  console.log('Expected: 0 (all files already exist, should be skipped)');
}).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
