/**
 * MiddlePane Component
 *
 * Flexible middle pane (flex-1) for presentation layer.
 * Displays profile, required fields, and timeline sections.
 */

import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface MiddlePaneProps {
  children: ReactNode;
  className?: string;
}

export function MiddlePane({ children, className }: MiddlePaneProps) {
  return (
    <main
      className={clsx(
        // Flexible width (grows to fill remaining space)
        'flex-1',
        // Prevent shrinking
        'flex-shrink-0',
        // Scrolling
        'overflow-y-auto',
        // Background
        'bg-white',
        // Full height
        'h-full',
        className
      )}
    >
      {children}
    </main>
  );
}
