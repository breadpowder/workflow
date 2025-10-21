'use client';

import React, { useState } from 'react';
import { useCopilotAction } from '@copilotkit/react-core';
import { getComponent, hasComponent } from '@/lib/ui/component-registry';

/**
 * Workflow state for UI rendering
 */
export interface WorkflowUIState {
  componentId: string | null;
  stepId: string | null;
  schema: any;
  inputs: Record<string, any>;
  requiredFields: string[];
  error: string | null;
}

/**
 * useWorkflowActions Hook
 *
 * Provides CopilotKit actions for workflow UI rendering and state management.
 * Integrates the component registry with AI-driven workflows.
 *
 * @returns Workflow UI state and helper functions
 */
export function useWorkflowActions() {
  const [uiState, setUIState] = useState<WorkflowUIState>({
    componentId: null,
    stepId: null,
    schema: null,
    inputs: {},
    requiredFields: [],
    error: null,
  });

  /**
   * CopilotKit Action: Render UI Component
   *
   * AI can call this action to render a specific component from the registry.
   * The component ID should match a registered component in the registry.
   */
  useCopilotAction({
    name: 'renderUI',
    description:
      'Render a UI component from the component registry for the current workflow step. Use this to display forms, document uploads, data tables, or review screens.',
    parameters: [
      {
        name: 'componentId',
        type: 'string',
        description:
          'ID of the component to render (e.g., "form", "document-upload", "review-summary", "data-table")',
        required: true,
      },
      {
        name: 'stepId',
        type: 'string',
        description: 'Unique identifier for the current workflow step',
        required: true,
      },
      {
        name: 'schema',
        type: 'object',
        description:
          'Schema definition for the component (includes fields array with field definitions)',
        required: true,
      },
      {
        name: 'requiredFields',
        type: 'string[]',
        description: 'Array of field names that are required for this step',
        required: false,
      },
    ],
    handler: async ({ componentId, stepId, schema, requiredFields = [] }) => {
      // Validate component exists in registry
      if (!hasComponent(componentId)) {
        const error = `Component "${componentId}" not found in registry`;
        setUIState({
          componentId: null,
          stepId: null,
          schema: null,
          inputs: {},
          requiredFields: [],
          error,
        });
        return { success: false, error };
      }

      // Update UI state to render the component
      setUIState({
        componentId,
        stepId,
        schema,
        inputs: {},
        requiredFields,
        error: null,
      });

      return {
        success: true,
        message: `Rendering ${componentId} component for step ${stepId}`,
      };
    },
  });

  /**
   * CopilotKit Action: Update Input
   *
   * AI can call this to update input values for the current step.
   */
  useCopilotAction({
    name: 'updateInput',
    description: 'Update an input value for the current workflow step',
    parameters: [
      {
        name: 'fieldName',
        type: 'string',
        description: 'Name of the field to update',
        required: true,
      },
      {
        name: 'value',
        type: 'string',
        description: 'New value for the field',
        required: true,
      },
    ],
    handler: async ({ fieldName, value }) => {
      setUIState((prev) => ({
        ...prev,
        inputs: {
          ...prev.inputs,
          [fieldName]: value,
        },
      }));

      return {
        success: true,
        message: `Updated ${fieldName} to ${value}`,
      };
    },
  });

  /**
   * Helper function to handle input changes from UI components
   */
  const handleInputChange = (fieldName: string, value: any) => {
    setUIState((prev) => ({
      ...prev,
      inputs: {
        ...prev.inputs,
        [fieldName]: value,
      },
    }));
  };

  /**
   * Helper function to handle step submission
   */
  const handleSubmit = () => {
    // Validate required fields
    const missingFields = uiState.requiredFields.filter(
      (field) => !uiState.inputs[field]
    );

    if (missingFields.length > 0) {
      setUIState((prev) => ({
        ...prev,
        error: `Missing required fields: ${missingFields.join(', ')}`,
      }));
      return;
    }

    // Clear error and proceed
    setUIState((prev) => ({ ...prev, error: null }));

    // In a real implementation, this would:
    // 1. Save state to backend
    // 2. Compute next step
    // 3. Transition to next step
    console.log('Step submitted:', {
      stepId: uiState.stepId,
      inputs: uiState.inputs,
    });
  };

  /**
   * Render the current component from registry
   */
  const renderComponent = () => {
    if (!uiState.componentId || !uiState.schema) {
      return null;
    }

    const Component = getComponent(uiState.componentId);
    if (!Component) {
      return (
        <div className="p-4 bg-danger/10 border border-danger rounded-lg">
          <p className="text-danger">
            Component "{uiState.componentId}" not found in registry
          </p>
        </div>
      );
    }

    return (
      <Component
        stepId={uiState.stepId || ''}
        schema={uiState.schema}
        inputs={uiState.inputs}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        requiredFields={uiState.requiredFields}
        error={uiState.error || undefined}
      />
    );
  };

  return {
    uiState,
    renderComponent,
    handleInputChange,
    handleSubmit,
  };
}
