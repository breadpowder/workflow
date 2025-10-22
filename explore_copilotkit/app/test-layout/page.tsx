'use client';

/**
 * Test page for Task 6A & 6B: Three-Pane Layout + Client List
 *
 * Verifies:
 * - Three panes render side-by-side
 * - Correct widths (316px | flex-1 | 476px)
 * - Full viewport height
 * - Border styling
 * - Client list with search functionality
 * - Client selection state
 */

import { useState } from 'react';
import { ThreePaneLayout } from '@/components/layout/three-pane-layout';
import { LeftPane } from '@/components/layout/left-pane';
import { MiddlePane } from '@/components/layout/middle-pane';
import { RightPane } from '@/components/layout/right-pane';
import { ClientList } from '@/components/onboarding/client-list';
import { Client } from '@/lib/mock-data/clients';

export default function TestLayoutPage() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

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
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Middle Pane - Client Details
            </h1>

            {selectedClient ? (
              <div className="space-y-6">
                {/* Client Info Card */}
                <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-bold">
                      {selectedClient.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">{selectedClient.name}</h2>
                      <p className="text-sm text-gray-500">{selectedClient.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <span className="ml-2 font-medium capitalize">{selectedClient.type}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <span className="ml-2 font-medium capitalize">{selectedClient.status}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Risk Level:</span>
                      <span className="ml-2 font-medium capitalize">{selectedClient.risk}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Jurisdiction:</span>
                      <span className="ml-2 font-medium">{selectedClient.jurisdiction}</span>
                    </div>
                    {selectedClient.entityType && (
                      <div>
                        <span className="text-gray-500">Entity Type:</span>
                        <span className="ml-2 font-medium">{selectedClient.entityType}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <span className="ml-2 font-medium">{selectedClient.createdAt}</span>
                    </div>
                  </div>
                </div>

                {/* Placeholder sections */}
                <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-semibold mb-2">Required Fields</h3>
                  <p className="text-sm text-gray-600">
                    Task 6C will implement the RequiredFieldsSection component here.
                  </p>
                </div>

                <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-semibold mb-2">Timeline</h3>
                  <p className="text-sm text-gray-600">
                    Task 6C will implement the TimelineSection component here.
                  </p>
                </div>
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
