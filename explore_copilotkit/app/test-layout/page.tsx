'use client';

/**
 * Test page for Task 6A: Three-Pane Layout Foundation
 *
 * Verifies:
 * - Three panes render side-by-side
 * - Correct widths (316px | flex-1 | 476px)
 * - Full viewport height
 * - Border styling
 * - Responsive behavior
 */

import { ThreePaneLayout } from '@/components/layout/three-pane-layout';
import { LeftPane } from '@/components/layout/left-pane';
import { MiddlePane } from '@/components/layout/middle-pane';
import { RightPane } from '@/components/layout/right-pane';

export default function TestLayoutPage() {
  return (
    <ThreePaneLayout
      left={
        <LeftPane>
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Left Pane (316px)
            </h2>
            <div className="space-y-2">
              <div className="p-3 bg-white rounded border border-gray-200">
                Placeholder Content 1
              </div>
              <div className="p-3 bg-white rounded border border-gray-200">
                Placeholder Content 2
              </div>
              <div className="p-3 bg-white rounded border border-gray-200">
                Placeholder Content 3
              </div>
            </div>
          </div>
        </LeftPane>
      }
      middle={
        <MiddlePane>
          <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Middle Pane (flex-1)
            </h1>
            <div className="space-y-4">
              <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold mb-2">Section 1</h3>
                <p className="text-gray-600">
                  This is the middle pane. It should take up all remaining space
                  between the left and right panes.
                </p>
              </div>
              <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold mb-2">Section 2</h3>
                <p className="text-gray-600">
                  The middle pane should be scrollable if content exceeds viewport
                  height.
                </p>
              </div>
              <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold mb-2">Section 3</h3>
                <p className="text-gray-600">
                  Test scrolling by adding more content here...
                </p>
              </div>
            </div>
          </div>
        </MiddlePane>
      }
      right={
        <RightPane>
          <div className="p-4 flex-1 overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Right Pane (476px)
            </h2>
            <div className="space-y-2">
              <div className="p-3 bg-white rounded border border-gray-200">
                Chat/Form Area
              </div>
              <div className="p-3 bg-white rounded border border-gray-200">
                Placeholder Content
              </div>
            </div>
          </div>
        </RightPane>
      }
    />
  );
}
