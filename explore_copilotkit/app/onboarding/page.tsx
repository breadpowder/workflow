"use client";

/**
 * Test page for Task 6A-6D: Three-Pane Layout Complete
 *
 * Verifies:
 * - Three panes render side-by-side
 * - Correct widths (316px | flex-1 | 476px)
 * - Full viewport height
 * - Border styling
 * - Client list with search functionality
 * - Client selection state
 * - ProfileSection displays client info
 * - RequiredFieldsSection shows field status
 * - TimelineSection displays events
 * - ChatSection with message display and input
 * - FormOverlay slides in from right with backdrop
 * - Chat dimmed when overlay active
 */

import "@/lib/ui/registry-init"; // Initialize component registry
import { useState, useMemo, useRef, useEffect } from "react";
import { ThreePaneLayout } from "@/components/layout/three-pane-layout";
import { LeftPane } from "@/components/layout/left-pane";
import { MiddlePane } from "@/components/layout/middle-pane";
import { RightPane } from "@/components/layout/right-pane";
import { ClientList } from "@/components/onboarding/client-list";
import { ProfileSection } from "@/components/onboarding/profile-section";
import {
  RequiredFieldsSection,
  RequiredField,
} from "@/components/onboarding/required-fields-section";
import {
  TimelineSection,
  TimelineEvent,
} from "@/components/onboarding/timeline-section";
import { ChatSection, ChatMessage } from "@/components/chat/chat-section";
import { FormOverlay } from "@/components/onboarding/form-overlay";
import type { Client } from "@/lib/mock-data/clients";
import { useWorkflowState } from "@/lib/hooks/useWorkflowState";
import { getComponent } from "@/lib/ui/component-registry";

export default function TestLayoutPage() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const previousStepIdRef = useRef<string>('');

  // Real workflow state integration
  const workflow = useWorkflowState({
    clientId: selectedClient?.id || "demo_client",
    client_type: selectedClient?.type || "corporate",
    jurisdiction: "US",
    autoSave: true,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "system",
      content:
        "Welcome to the onboarding chat. I can help you with client onboarding tasks.",
      timestamp: new Date(Date.now() - 60000),
      type: "info",
    },
    {
      id: "2",
      role: "ai",
      content: "Hello! How can I assist you with the onboarding process today?",
      timestamp: new Date(Date.now() - 30000),
    },
  ]);

  // Real required fields from workflow
  const requiredFields: RequiredField[] = useMemo(() => {
    if (!selectedClient || !workflow.currentStep) return [];

    return (workflow.currentStep.required_fields || []).map((fieldName) => ({
      name: fieldName,
      label: fieldName
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
      completed:
        !!workflow.inputs[fieldName] && workflow.inputs[fieldName] !== "",
      description: workflow.currentStep?.schema?.fields?.find(
        (f: { name: string }) => f.name === fieldName,
      )?.label,
    }));
  }, [selectedClient, workflow.currentStep, workflow.inputs]);

  // Real timeline from workflow events
  const timelineEvents: TimelineEvent[] = useMemo(() => {
    if (!selectedClient) return [];

    const events: TimelineEvent[] = [
      {
        id: "1",
        type: "created",
        title: "Client Created",
        description: `${selectedClient.name} was added to the system`,
        timestamp: selectedClient.createdAt,
        user: "System",
      },
    ];

    // Add events for completed steps
    workflow.completedSteps.forEach((stepId, index) => {
      const step = workflow.machine?.stepIndexById?.get(stepId);
      if (step) {
        events.push({
          id: `step_${index}`,
          type: "updated",
          title: "Step Completed",
          description: `Completed: ${step.task_definition?.name || stepId}`,
          timestamp: new Date().toISOString(), // In real app, would track completion time
          user: "User",
        });
      }
    });

    // Add current step as in-progress
    if (workflow.currentStep && !workflow.isComplete) {
      events.push({
        id: "current",
        type: "review",
        title: "Current Step",
        description: `Working on: ${workflow.currentStep.task_definition?.name || workflow.currentStepId}`,
        timestamp: new Date().toISOString(),
        user: "User",
      });
    }

    // Add completion event if done
    if (workflow.isComplete) {
      events.push({
        id: "complete",
        type: "completed",
        title: "Onboarding Complete",
        description: "All required steps verified",
        timestamp: new Date().toISOString(),
        user: "System",
      });
    }

    return events;
  }, [
    selectedClient,
    workflow.completedSteps,
    workflow.currentStep,
    workflow.currentStepId,
    workflow.isComplete,
    workflow.machine,
  ]);

  // Handle sending a message
  const handleSendMessage = (content: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Simulate AI response after a delay
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: `I received your message: "${content}". This is a demo response. Try clicking "Open Form Overlay" to see the form overlay feature!`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);
  };

  // Handle opening overlay
  const handleOpenOverlay = () => {
    setOverlayOpen(true);
    const systemMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "system",
      content: `Opening form: ${workflow.currentStep?.task_definition?.name || "form"}...`,
      timestamp: new Date(),
      type: "info",
    };
    setMessages((prev) => [...prev, systemMessage]);
  };

  // Handle closing overlay
  const handleCloseOverlay = () => {
    setOverlayOpen(false);
    const systemMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "system",
      content: "Form closed. You can resume the conversation.",
      timestamp: new Date(),
      type: "warning",
    };
    setMessages((prev) => [...prev, systemMessage]);
  };

  // Auto-close overlay when workflow progresses to next step
  useEffect(() => {
    if (overlayOpen && !workflow.isTransitioning && workflow.currentStepId &&
        workflow.currentStepId !== previousStepIdRef.current) {
      previousStepIdRef.current = workflow.currentStepId;
      handleCloseOverlay();
    }
  }, [workflow.currentStepId, workflow.isTransitioning, overlayOpen]);

  // Show loading spinner while workflow loads
  if (workflow.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workflow...</p>
        </div>
      </div>
    );
  }

  // Show error if workflow failed to load
  if (workflow.error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-red-600">
          <p className="font-semibold mb-2">Error loading workflow</p>
          <p className="text-sm">{workflow.error}</p>
        </div>
      </div>
    );
  }

  // Show completion screen when workflow is done
  if (workflow.isComplete) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-green-600 text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Onboarding Complete!
          </h2>
          <p className="text-gray-600 mb-4">
            All required steps have been completed.
          </p>
          <button
            onClick={() => workflow.resetWorkflow()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Start New Workflow
          </button>
        </div>
      </div>
    );
  }

  return (
    <ThreePaneLayout
      left={
        <LeftPane>
          <ClientList
            selectedClientId={selectedClient?.id}
            onClientSelect={setSelectedClient}
          />
        </LeftPane>
      }
      middle={
        <MiddlePane>
          <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Client Details
            </h1>

            {selectedClient ? (
              <div className="space-y-6">
                {/* Profile Section */}
                <ProfileSection client={selectedClient} />

                {/* Required Fields Section */}
                <RequiredFieldsSection fields={requiredFields} />

                {/* Timeline Section */}
                <TimelineSection events={timelineEvents} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <p>Select a client from the left panel</p>
                  <p className="text-sm mt-1">
                    to view their details and workflow status
                  </p>
                </div>
              </div>
            )}
          </div>
        </MiddlePane>
      }
      right={
        <RightPane className="relative">
          {/* Chat Section */}
          <ChatSection
            messages={messages}
            onSendMessage={handleSendMessage}
            dimmed={overlayOpen}
          />

          {/* Form Overlay */}
          <FormOverlay
            isOpen={overlayOpen}
            onClose={handleCloseOverlay}
            title={workflow.currentStep?.task_definition?.name || "Form"}
          >
            {workflow.currentStep ? (
              (() => {
                const FormComponent = getComponent(
                  workflow.currentStep.component_id || "form",
                );

                if (!FormComponent) {
                  return (
                    <div className="text-red-600">
                      <p>
                        Error: Component "{workflow.currentStep.component_id}"
                        not found in registry
                      </p>
                    </div>
                  );
                }

                return (
                  <FormComponent
                    stepId={workflow.currentStepId}
                    schema={workflow.currentStep.schema || { fields: [] }}
                    inputs={workflow.inputs}
                    onInputChange={(fieldName, value) => {
                      workflow.updateInput(fieldName, value);
                    }}
                    onSubmit={async () => {
                      // Check if can proceed
                      if (!workflow.canProceed) {
                        const errorMessage: ChatMessage = {
                          id: Date.now().toString(),
                          role: "system",
                          content: `Missing required fields: ${workflow.missingFields.join(", ")}`,
                          timestamp: new Date(),
                          type: "error",
                        };
                        setMessages((prev) => [...prev, errorMessage]);
                        return;
                      }

                      // Progress workflow
                      try {
                        await workflow.goToNextStep();

                        const successMessage: ChatMessage = {
                          id: Date.now().toString(),
                          role: "system",
                          content:
                            "Form submitted successfully! Moving to next step...",
                          timestamp: new Date(),
                          type: "success",
                        };
                        setMessages((prev) => [...prev, successMessage]);
                        handleCloseOverlay();
                      } catch (error) {
                        const errorMessage: ChatMessage = {
                          id: Date.now().toString(),
                          role: "system",
                          content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
                          timestamp: new Date(),
                          type: "error",
                        };
                        setMessages((prev) => [...prev, errorMessage]);
                      }
                    }}
                    requiredFields={workflow.currentStep.required_fields || []}
                    isProcessing={workflow.isTransitioning}
                    error={workflow.error || undefined}
                  />
                );
              })()
            ) : (
              <div className="text-gray-600">
                <p>No current step available. Workflow may be complete.</p>
              </div>
            )}
          </FormOverlay>

          {/* Demo Button to Trigger Overlay (Floating) */}
          {!overlayOpen && workflow.currentStep && (
            <button
              onClick={handleOpenOverlay}
              className="absolute bottom-24 right-8 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors z-10"
            >
              Open Current Step Form
            </button>
          )}
        </RightPane>
      }
    />
  );
}
