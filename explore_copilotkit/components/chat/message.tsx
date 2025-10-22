/**
 * Message Component
 *
 * Displays individual chat messages with support for:
 * - User messages (right-aligned, blue background)
 * - AI messages (left-aligned, gray background)
 * - Timestamp display
 */

import clsx from 'clsx';

export interface MessageProps {
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export function Message({ role, content, timestamp }: MessageProps) {
  const isUser = role === 'user';

  return (
    <div
      className={clsx(
        'flex w-full mb-4',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={clsx(
          'max-w-[80%] rounded-lg px-4 py-3',
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-900'
        )}
      >
        {/* Message content */}
        <div className="text-sm whitespace-pre-wrap break-words">
          {content}
        </div>

        {/* Timestamp */}
        <div
          className={clsx(
            'text-xs mt-1',
            isUser ? 'text-blue-100' : 'text-gray-500'
          )}
        >
          {timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
