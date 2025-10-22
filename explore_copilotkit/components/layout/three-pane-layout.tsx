/**
 * ThreePaneLayout Component
 *
 * Main layout wrapper for the three-pane interface.
 * Structure: LeftPane (316px) | MiddlePane (flex-1) | RightPane (476px)
 *
 * Responsive behavior:
 * - Desktop (>= 1024px): All three panes visible
 * - Mobile/Tablet (< 1024px): Only middle pane visible (collapsible side panes)
 */

import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface ThreePaneLayoutProps {
  left?: ReactNode;
  middle: ReactNode;
  right?: ReactNode;
  className?: string;
}

export function ThreePaneLayout({
  left,
  middle,
  right,
  className,
}: ThreePaneLayoutProps) {
  return (
    <div
      className={clsx(
        // Horizontal flex layout
        'flex',
        // Full viewport height
        'h-screen',
        // Prevent overflow
        'overflow-hidden',
        className
      )}
    >
      {left}
      {middle}
      {right}
    </div>
  );
}
