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
        // Flexible width
        'flex-1',
        // Scrolling
        'overflow-y-auto',
        // Background
        'bg-white',
        className
      )}
    >
      {children}
    </main>
  );
}
