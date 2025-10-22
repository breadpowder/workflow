/**
 * TimelineSection Component
 *
 * Displays workflow events in chronological order with:
 * - Event type icon
 * - Event title and description
 * - Timestamp
 * - Visual timeline connector
 */

import clsx from 'clsx';

export type EventType = 'created' | 'updated' | 'completed' | 'review' | 'comment' | 'system';

export interface TimelineEvent {
  id: string;
  type: EventType;
  title: string;
  description?: string;
  timestamp: string;
  user?: string;
}

export interface TimelineSectionProps {
  events: TimelineEvent[];
  className?: string;
}

/**
 * Get icon for event type
 */
function getEventIcon(type: EventType) {
  switch (type) {
    case 'created':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      );
    case 'updated':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      );
    case 'completed':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case 'review':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      );
    case 'comment':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      );
    case 'system':
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
 * Get color for event type
 */
function getEventColor(type: EventType): string {
  switch (type) {
    case 'created':
      return 'bg-blue-100 text-blue-700';
    case 'updated':
      return 'bg-gray-100 text-gray-700';
    case 'completed':
      return 'bg-green-100 text-green-700';
    case 'review':
      return 'bg-yellow-100 text-yellow-700';
    case 'comment':
      return 'bg-purple-100 text-purple-700';
    case 'system':
      return 'bg-gray-100 text-gray-600';
  }
}

/**
 * Individual timeline event component
 */
function TimelineEventItem({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  return (
    <div className="relative flex gap-3 pb-6">
      {/* Timeline connector line */}
      {!isLast && (
        <div className="absolute left-4 top-9 bottom-0 w-px bg-gray-200" />
      )}

      {/* Event icon */}
      <div className={clsx('flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center', getEventColor(event.type))}>
        {getEventIcon(event.type)}
      </div>

      {/* Event content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="text-sm font-medium text-gray-900">{event.title}</h4>
          <span className="text-xs text-gray-500 whitespace-nowrap">{event.timestamp}</span>
        </div>
        {event.description && (
          <p className="text-sm text-gray-600 mb-1">{event.description}</p>
        )}
        {event.user && (
          <p className="text-xs text-gray-500">by {event.user}</p>
        )}
      </div>
    </div>
  );
}

export function TimelineSection({ events, className }: TimelineSectionProps) {
  return (
    <div className={clsx('p-6 bg-white rounded-lg border border-gray-200 shadow-sm', className)}>
      {/* Header */}
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>

      {/* Events List */}
      {events.length > 0 ? (
        <div className="space-y-0">
          {events.map((event, index) => (
            <TimelineEventItem
              key={event.id}
              event={event}
              isLast={index === events.length - 1}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-8 text-gray-500">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm">No timeline events yet</p>
        </div>
      )}
    </div>
  );
}
