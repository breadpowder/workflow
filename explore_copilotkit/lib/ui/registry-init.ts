/**
 * Component Registry Initialization
 *
 * This file registers all workflow components in the component registry.
 * Import this file in your app layout or root component to ensure
 * all components are available for YAML workflows.
 *
 * Components are registered with IDs that match the `component_id`
 * field in YAML task definitions.
 */

import { registerComponent } from './component-registry';

// Import all workflow components
import { GenericForm } from '@/components/workflow/GenericForm';
import { DocumentUpload } from '@/components/workflow/DocumentUpload';
import { ReviewSummary } from '@/components/workflow/ReviewSummary';
import { DataTable } from '@/components/workflow/DataTable';

/**
 * Initialize the component registry
 *
 * Call this function once at app startup to register all components.
 * This is typically done in the root layout or app entry point.
 */
export function initializeRegistry(): void {
  // Register generic form component
  registerComponent('form', GenericForm);

  // Register document upload component
  registerComponent('document-upload', DocumentUpload);

  // Register review summary component
  registerComponent('review-summary', ReviewSummary);

  // Register data table component
  registerComponent('data-table', DataTable);

  // Add more components as needed
  // registerComponent('custom-component', CustomComponent);
}

/**
 * Auto-initialize registry on module load
 *
 * This ensures the registry is populated as soon as this module is imported.
 */
initializeRegistry();
