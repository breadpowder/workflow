/**
 * LeftPane Component
 *
 * Fixed-width left pane (316px) for client list and navigation.
 * Contains client folders, search, and selection state.
 */

import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface LeftPaneProps {
  children: ReactNode;
  className?: string;
}

export function LeftPane({ children, className }: LeftPaneProps) {
  return (
    <aside
      className={clsx(
        // Fixed width (flex-shrink-0 prevents shrinking)
        'w-[316px] flex-shrink-0',
        // Border
        'border-r border-gray-200',
        // Scrolling
        'overflow-y-auto',
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
