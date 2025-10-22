/**
 * ChatSection Component
 *
 * Main chat interface with:
 * - Scrollable message list (user, AI, system messages)
 * - Auto-scroll to latest message
 * - Input box fixed at bottom
 * - Send button
 * - Support for dimmed state when overlay is active
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { Message } from './message';
import { SystemMessage, SystemMessageType } from './system-message';

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  type?: SystemMessageType; // Only for system messages
}

export interface ChatSectionProps {
  messages: ChatMessage[];
  onSendMessage?: (message: string) => void;
  className?: string;
  dimmed?: boolean; // True when overlay is active
}

export function ChatSection({
  messages,
  onSendMessage,
  className,
  dimmed = false,
}: ChatSectionProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && onSendMessage) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div
      className={clsx(
        'flex flex-col h-full',
        dimmed && 'opacity-50 pointer-events-none',
        className
      )}
    >
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-900">Chat</h2>
        <p className="text-sm text-gray-500">Ask questions about the onboarding process</p>
      </div>

      {/* Messages List */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50"
      >
        {messages.length === 0 ? (
          /* Empty State */
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <svg
                className="w-16 h-16 mx-auto mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Start a conversation below</p>
            </div>
          </div>
        ) : (
          /* Messages */
          <>
            {messages.map((msg) => {
              if (msg.role === 'system') {
                return (
                  <SystemMessage
                    key={msg.id}
                    type={msg.type || 'info'}
                    content={msg.content}
                    timestamp={msg.timestamp}
                  />
                );
              } else {
                return (
                  <Message
                    key={msg.id}
                    role={msg.role}
                    content={msg.content}
                    timestamp={msg.timestamp}
                  />
                );
              }
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Box */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={dimmed}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || dimmed}
            className={clsx(
              'px-6 py-2 rounded-lg text-sm font-medium transition-colors',
              inputValue.trim() && !dimmed
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            )}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
