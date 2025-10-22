/**
 * RightPane Component
 *
 * Fixed-width right pane (476px) for forms and chat.
 * Contains chat section and form overlays.
 */

import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface RightPaneProps {
  children: ReactNode;
  className?: string;
}

export function RightPane({ children, className }: RightPaneProps) {
  return (
    <aside
      className={clsx(
        // Fixed width (flex-shrink-0 prevents shrinking)
        'w-[476px] flex-shrink-0',
        // Border
        'border-l border-gray-200',
        // Layout
        'flex flex-col',
        // No scrolling on container (children control their own)
        'overflow-hidden',
        // Background
        'bg-gray-50',
        // Full height
        'h-full',
        className
      )}
    >
      {children}
    </aside>
  );
}
