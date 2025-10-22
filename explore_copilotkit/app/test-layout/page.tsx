'use client';

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

import { useState, useMemo } from 'react';
import { ThreePaneLayout } from '@/components/layout/three-pane-layout';
import { LeftPane } from '@/components/layout/left-pane';
import { MiddlePane } from '@/components/layout/middle-pane';
import { RightPane } from '@/components/layout/right-pane';
import { ClientList } from '@/components/onboarding/client-list';
import { ProfileSection } from '@/components/onboarding/profile-section';
import { RequiredFieldsSection, RequiredField } from '@/components/onboarding/required-fields-section';
import { TimelineSection, TimelineEvent } from '@/components/onboarding/timeline-section';
import { ChatSection, ChatMessage } from '@/components/chat/chat-section';
import { FormOverlay } from '@/components/onboarding/form-overlay';
import { Client } from '@/lib/mock-data/clients';

export default function TestLayoutPage() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'system',
      content: 'Welcome to the onboarding chat. I can help you with client onboarding tasks.',
      timestamp: new Date(Date.now() - 60000),
      type: 'info',
    },
    {
      id: '2',
      role: 'ai',
      content: 'Hello! How can I assist you with the onboarding process today?',
      timestamp: new Date(Date.now() - 30000),
    },
  ]);

  // Mock required fields data (for POC demonstration)
  const requiredFields: RequiredField[] = useMemo(() => {
    if (!selectedClient) return [];

    // Different fields based on client type
    if (selectedClient.type === 'corporate') {
      return [
        { name: 'company_name', label: 'Company Name', completed: true, description: 'Legal entity name' },
        { name: 'registration_number', label: 'Registration Number', completed: true },
        { name: 'incorporation_date', label: 'Incorporation Date', completed: false },
        { name: 'registered_address', label: 'Registered Address', completed: false },
        { name: 'beneficial_owners', label: 'Beneficial Owners', completed: false, description: 'UBO declaration required' },
        { name: 'financial_statements', label: 'Financial Statements', completed: false },
        { name: 'tax_id', label: 'Tax Identification Number', completed: true },
      ];
    } else {
      return [
        { name: 'full_name', label: 'Full Legal Name', completed: true },
        { name: 'date_of_birth', label: 'Date of Birth', completed: true },
        { name: 'id_document', label: 'ID Document', completed: false, description: 'Passport or national ID' },
        { name: 'residential_address', label: 'Residential Address', completed: false },
        { name: 'proof_of_address', label: 'Proof of Address', completed: false },
        { name: 'source_of_funds', label: 'Source of Funds', completed: false },
      ];
    }
  }, [selectedClient]);

  // Mock timeline events data (for POC demonstration)
  const timelineEvents: TimelineEvent[] = useMemo(() => {
    if (!selectedClient) return [];

    return [
      {
        id: '1',
        type: 'created',
        title: 'Client Created',
        description: `${selectedClient.name} was added to the system`,
        timestamp: selectedClient.createdAt,
        user: 'System',
      },
      {
        id: '2',
        type: 'updated',
        title: 'Profile Updated',
        description: 'Contact information verified',
        timestamp: selectedClient.lastActivity,
        user: 'John Compliance',
      },
      {
        id: '3',
        type: 'review',
        title: 'Risk Assessment',
        description: `Risk level set to ${selectedClient.risk}`,
        timestamp: selectedClient.lastActivity,
        user: 'Risk Team',
      },
      ...(selectedClient.status === 'complete'
        ? [
            {
              id: '4',
              type: 'completed' as const,
              title: 'Onboarding Complete',
              description: 'All required documents verified',
              timestamp: selectedClient.lastActivity,
              user: 'Compliance Team',
            },
          ]
        : []),
    ];
  }, [selectedClient]);

  // Handle sending a message
  const handleSendMessage = (content: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Simulate AI response after a delay
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: `I received your message: "${content}". This is a demo response. Try clicking "Open Form Overlay" to see the form overlay feature!`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);
  };

  // Handle opening overlay
  const handleOpenOverlay = () => {
    setOverlayOpen(true);
    // Add system message
    const systemMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'system',
      content: 'Opening contact information form...',
      timestamp: new Date(),
      type: 'info',
    };
    setMessages((prev) => [...prev, systemMessage]);
  };

  // Handle closing overlay
  const handleCloseOverlay = () => {
    setOverlayOpen(false);
    const systemMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'system',
      content: 'Form closed. You can resume the conversation.',
      timestamp: new Date(),
      type: 'warning',
    };
    setMessages((prev) => [...prev, systemMessage]);
  };

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
              Middle Pane - Client Details
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
                  <p className="text-sm mt-1">to view their details and workflow status</p>
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
            title="Contact Information Form"
          >
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                This is a demo form overlay. In the real implementation, this would render
                a form component from the component registry.
              </p>

              {/* Demo Form Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter phone"
                />
              </div>

              {/* Demo Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    const successMessage: ChatMessage = {
                      id: Date.now().toString(),
                      role: 'system',
                      content: 'Form submitted successfully!',
                      timestamp: new Date(),
                      type: 'success',
                    };
                    setMessages((prev) => [...prev, successMessage]);
                    handleCloseOverlay();
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Submit
                </button>
                <button
                  onClick={handleCloseOverlay}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>

              {/* Demo Trigger for System Messages */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Demo: Test system messages</p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      const msg: ChatMessage = {
                        id: Date.now().toString(),
                        role: 'system',
                        content: 'This is an error message example.',
                        timestamp: new Date(),
                        type: 'error',
                      };
                      setMessages((prev) => [...prev, msg]);
                    }}
                    className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded"
                  >
                    Error
                  </button>
                  <button
                    onClick={() => {
                      const msg: ChatMessage = {
                        id: Date.now().toString(),
                        role: 'system',
                        content: 'This is a success message example.',
                        timestamp: new Date(),
                        type: 'success',
                      };
                      setMessages((prev) => [...prev, msg]);
                    }}
                    className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded"
                  >
                    Success
                  </button>
                </div>
              </div>
            </div>
          </FormOverlay>

          {/* Demo Button to Trigger Overlay (Floating) */}
          {!overlayOpen && (
            <button
              onClick={handleOpenOverlay}
              className="absolute bottom-24 right-8 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors z-10"
            >
              Open Form Overlay
            </button>
          )}
        </RightPane>
      }
    />
  );
}
