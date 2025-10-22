/**
 * SystemMessage Component
 *
 * Displays system messages with icons and color-coded backgrounds:
 * - Success (green): Checkmark icon
 * - Error (red): X icon
 * - Info (blue): Info icon
 * - Warning (yellow): Warning icon
 */

import clsx from 'clsx';

export type SystemMessageType = 'success' | 'error' | 'info' | 'warning';

export interface SystemMessageProps {
  type: SystemMessageType;
  content: string;
  timestamp: Date;
}

/**
 * Get icon SVG for message type
 */
function getIcon(type: SystemMessageType) {
  switch (type) {
    case 'success':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      );
    case 'error':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      );
    case 'warning':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      );
    case 'info':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
  }
}

/**
 * Get color classes for message type
 */
function getColorClasses(type: SystemMessageType): string {
  switch (type) {
    case 'success':
      return 'bg-green-50 text-green-800 border-green-200';
    case 'error':
      return 'bg-red-50 text-red-800 border-red-200';
    case 'warning':
      return 'bg-yellow-50 text-yellow-800 border-yellow-200';
    case 'info':
      return 'bg-blue-50 text-blue-800 border-blue-200';
  }
}

export function SystemMessage({ type, content, timestamp }: SystemMessageProps) {
  return (
    <div className="flex w-full mb-4 justify-center">
      <div
        className={clsx(
          'max-w-[90%] rounded-lg px-4 py-3 border',
          getColorClasses(type)
        )}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {getIcon(type)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="text-sm whitespace-pre-wrap break-words">
              {content}
            </div>
            <div className="text-xs mt-1 opacity-75">
              {timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
