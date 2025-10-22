'use client';

/**
 * Test page for Task 6A-6C: Three-Pane Layout + Client List + Presentation Layer
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
import { Client } from '@/lib/mock-data/clients';

export default function TestLayoutPage() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

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
        <RightPane>
          <div className="p-4 flex-1 overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Right Pane (476px)
            </h2>
            <div className="space-y-2">
              <div className="p-3 bg-white rounded border border-gray-200">
                Chat/Form Area
              </div>
              <div className="p-3 bg-white rounded border border-gray-200">
                Placeholder Content
              </div>
            </div>
          </div>
        </RightPane>
      }
    />
  );
}
