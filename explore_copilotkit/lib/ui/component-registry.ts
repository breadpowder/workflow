import React from 'react';

/**
 * Standard props interface for all registry components
 *
 * All components registered in the component registry MUST accept these props.
 * This ensures consistent communication between the workflow engine and UI components.
 */
export interface RegistryComponentProps {
  /**
   * Unique identifier for the workflow step
   */
  stepId: string;

  /**
   * Field schema from the task definition
   * Contains field definitions, validation rules, and UI hints
   */
  schema: {
    fields: Array<{
      name: string;
      label: string;
      type: string;
      required?: boolean;
      placeholder?: string;
      validation?: Record<string, any>;
      options?: Array<{ value: string; label: string }>;
    }>;
  };

  /**
   * Current input values for this step
   * Keys are field names, values are user inputs
   */
  inputs: Record<string, any>;

  /**
   * Callback to update inputs when user interacts with form
   * @param fieldName - Name of the field being updated
   * @param value - New value for the field
   */
  onInputChange: (fieldName: string, value: any) => void;

  /**
   * Callback to submit the step and transition to next step
   * Should validate inputs before calling this
   */
  onSubmit: () => void;

  /**
   * List of required fields that must be filled
   */
  requiredFields: string[];

  /**
   * Whether the step is currently processing/submitting
   */
  isProcessing?: boolean;

  /**
   * Optional error message to display
   */
  error?: string;
}

/**
 * Type definition for registry components
 */
export type RegistryComponent = React.ComponentType<RegistryComponentProps>;

/**
 * Component registry mapping component IDs to React components
 *
 * This registry decouples the workflow engine from UI components.
 * YAML workflows specify `component_id` strings, and the registry
 * resolves them to actual React components at runtime.
 */
const componentRegistry: Map<string, RegistryComponent> = new Map();

/**
 * Register a component in the registry
 *
 * @param componentId - Unique identifier for the component (matches YAML component_id)
 * @param component - React component that implements RegistryComponentProps
 *
 * @example
 * registerComponent('form', FormComponent);
 * registerComponent('document-upload', DocumentUploadComponent);
 */
export function registerComponent(
  componentId: string,
  component: RegistryComponent
): void {
  if (componentRegistry.has(componentId)) {
    console.warn(
      `Component with ID "${componentId}" is already registered. Overwriting...`
    );
  }

  componentRegistry.set(componentId, component);
}

/**
 * Get a component from the registry by ID
 *
 * @param componentId - Unique identifier for the component
 * @returns The registered component, or null if not found
 *
 * @example
 * const FormComponent = getComponent('form');
 * if (FormComponent) {
 *   return <FormComponent {...props} />;
 * }
 */
export function getComponent(componentId: string): RegistryComponent | null {
  return componentRegistry.get(componentId) || null;
}

/**
 * Check if a component is registered
 *
 * @param componentId - Unique identifier for the component
 * @returns True if component is registered, false otherwise
 */
export function hasComponent(componentId: string): boolean {
  return componentRegistry.has(componentId);
}

/**
 * List all registered component IDs
 *
 * @returns Array of all registered component IDs
 */
export function listComponents(): string[] {
  return Array.from(componentRegistry.keys());
}

/**
 * Unregister a component from the registry
 *
 * @param componentId - Unique identifier for the component to remove
 * @returns True if component was removed, false if it didn't exist
 */
export function unregisterComponent(componentId: string): boolean {
  return componentRegistry.delete(componentId);
}

/**
 * Clear all registered components
 *
 * Useful for testing or hot module replacement
 */
export function clearRegistry(): void {
  componentRegistry.clear();
}

/**
 * Get registry size (number of registered components)
 */
export function getRegistrySize(): number {
  return componentRegistry.size;
}
