'use client';

/**
 * Client Selector Component
 *
 * Allows switching between client types (corporate vs individual)
 * for workflow selection.
 *
 * Features:
 * - Toggle between Corporate and Individual
 * - Visual indication of current selection
 * - Callback on selection change
 */

interface ClientSelectorProps {
  currentType: 'corporate' | 'individual';
  onTypeChange: (type: 'corporate' | 'individual') => void;
  disabled?: boolean;
}

export function ClientSelector({
  currentType,
  onTypeChange,
  disabled = false,
}: ClientSelectorProps) {
  const buttonClass = (type: 'corporate' | 'individual') => {
    const isSelected = currentType === type;
    return `
      flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors
      ${
        isSelected
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `.trim();
  };

  return (
    <div className="p-4 border-b border-gray-200 bg-gray-50">
      <label className="block text-xs font-medium text-gray-600 mb-2">
        Client Type
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => !disabled && onTypeChange('corporate')}
          disabled={disabled}
          className={buttonClass('corporate')}
        >
          <div className="flex items-center justify-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <span>Corporate</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => !disabled && onTypeChange('individual')}
          disabled={disabled}
          className={buttonClass('individual')}
        >
          <div className="flex items-center justify-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span>Individual</span>
          </div>
        </button>
      </div>
    </div>
  );
}
