'use client';

import { useCopilotReadable, useCopilotAction } from '@copilotkit/react-core';
import { useState } from 'react';

/**
 * Main onboarding page
 *
 * This is a test page to verify CopilotKit runtime is working.
 * Will be replaced with the full three-pane layout in Task 6.
 */
export default function Home() {
  const [message, setMessage] = useState<string>('');

  // Make state readable to the AI
  useCopilotReadable({
    description: 'Test message state',
    value: message,
  });

  // Register a test action
  useCopilotAction({
    name: 'setTestMessage',
    description: 'Set a test message to verify the AI can call actions',
    parameters: [
      {
        name: 'newMessage',
        type: 'string',
        description: 'The message to display',
        required: true,
      },
    ],
    handler: async ({ newMessage }) => {
      setMessage(newMessage);
      return `Message set to: ${newMessage}`;
    },
  });

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-primary">
          Composable Onboarding POC
        </h1>

        <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">Test Status</h2>
          <p className="text-gray-600 mb-4">
            CopilotKit runtime is configured. Test by asking the AI to set a message.
          </p>
          {message && (
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <p className="text-green-800 font-medium">Message from AI:</p>
              <p className="text-green-900">{message}</p>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">Next Steps</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Task 1: Self-Hosted CopilotKit Runtime ✅</li>
            <li>Task 2: YAML Workflow Loader (Pending)</li>
            <li>Task 3: Component Registry (Pending)</li>
            <li>Task 4: Workflow Engine (Pending)</li>
            <li>Task 5: Schema-Driven UI Components (Pending)</li>
            <li>Task 6: Integration (Pending)</li>
            <li>Task 7: Documentation (Pending)</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
