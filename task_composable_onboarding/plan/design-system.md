# Design System - Composable Onboarding UI

## Overview
This document defines the design system for the composable onboarding UI based on the approved mockup. The system prioritizes clarity, professionalism, and accessibility while maintaining a modern, approachable aesthetic suitable for financial services.

---

## Reference Mockup
- **Source**: `/home/zineng/workspace/explore_copilotkit/onboarding-mockup-with-form.excalidraw`
- **Screenshot**: Provided in planning session
- **Canvas Size**: 1448×900px (Desktop)
- **Layout**: Three-pane (Clients | Presentation | Onboarding Form + Chat)

---

## Color Palette

### Primary Colors (Financial Trust Palette)

**Primary Blue** - Main actions, AI messages, links
```
#0d6efd - Primary Blue
#0a58ca - Primary Blue Dark (hover/active)
#e7f3ff - Primary Blue Light (backgrounds)
#084298 - Primary Blue Darker (text on light backgrounds)
```

**Success Green** - Completed states, positive feedback
```
#28a745 - Success Green
#198754 - Success Green Dark
#d1e7dd - Success Green Light
#0a3622 - Success Green Darker (text)
```

**Warning Yellow** - Pending states, alerts
```
#ffc107 - Warning Yellow
#856404 - Warning Yellow Dark (text)
#fff3cd - Warning Yellow Light
```

**Danger Red** - Required/missing states, errors
```
#dc3545 - Danger Red
```

### Neutral Colors (UI Structure)

**Text Colors**
```
#212529 - Primary Text (headings, labels, high emphasis)
#495057 - Secondary Text (body, medium emphasis)
#6c757d - Muted Text (placeholders, notes, low emphasis)
```

**Background Colors**
```
#ffffff - Pure White (cards, inputs, clean backgrounds)
#f8f9fa - Light Gray (panes, sections, subtle backgrounds)
#e9ecef - Medium Gray (disabled buttons, dividers)
```

**Border Colors**
```
#dee2e6 - Default Border (cards, sections)
#ced4da - Input Border (form fields)
#adb5bd - Placeholder Text
```

---

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
             'Helvetica Neue', Arial, sans-serif;
```

### Type Scale

**Display / Page Titles**
```
font-size: 24px
font-weight: 600
line-height: 1.5
color: #212529
```

**Section Headings (H2)**
```
font-size: 18px
font-weight: 600
line-height: 1.5
color: #212529
```

**Subsection Headings (H3)**
```
font-size: 16px
font-weight: 600
line-height: 1.5
color: #212529
```

**Body Text**
```
font-size: 14px
font-weight: 400
line-height: 1.5
color: #495057
```

**Small Text / Notes**
```
font-size: 12px
font-weight: 400
line-height: 1.5
color: #6c757d
```

**Micro Text / Helper**
```
font-size: 10px
font-weight: 400
line-height: 1.5
color: #6c757d
```

---

## Spacing System (8px Grid)

```
xs:  4px   - Tight spacing, inline elements
sm:  8px   - Small gaps, related items
md:  16px  - Default spacing, component padding
lg:  24px  - Section spacing, card margins
xl:  32px  - Major section gaps
2xl: 48px  - Page-level spacing
```

### Component Padding
```
Pane Padding: 20px
Card Padding: 20px
Form Field Gap: 20px
Button Padding: 12px 24px
```

---

## Component Patterns

### 1. Three-Pane Layout

```tsx
<div className="flex h-screen">
  {/* Left Pane - Clients */}
  <aside className="w-[316px] bg-gray-50 border-r border-gray-200">
    {/* Client list content */}
  </aside>

  {/* Middle Pane - Presentation */}
  <main className="flex-1 bg-white overflow-y-auto">
    {/* Profile, fields, timeline */}
  </main>

  {/* Right Pane - Form + Chat */}
  <aside className="w-[476px] bg-gray-50 border-l border-gray-200 flex flex-col">
    {/* Form section */}
    {/* Chat section */}
  </aside>
</div>
```

### 2. Form Inputs

**Text Input**
```tsx
<div className="space-y-2">
  <label className="text-sm font-medium text-gray-900">
    Field Label *
  </label>
  <input
    type="text"
    placeholder="Placeholder text..."
    className="w-full px-3 py-2 border border-gray-300 rounded-md
               text-sm placeholder-gray-400
               focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
</div>
```

**Textarea**
```tsx
<textarea
  rows={4}
  className="w-full px-3 py-2 border border-gray-300 rounded-md
             text-sm placeholder-gray-400
             focus:outline-none focus:ring-2 focus:ring-blue-500"
/>
```

### 3. Buttons

**Primary Button (Submit)**
```tsx
<button className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium
                   rounded-md hover:bg-blue-700 transition-colors
                   focus:outline-none focus:ring-2 focus:ring-blue-500">
  Submit
</button>
```

**Secondary Button (Save Draft)**
```tsx
<button className="px-6 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium
                   rounded-md border border-gray-400 hover:bg-gray-200
                   transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400">
  Save Draft
</button>
```

### 4. Status Indicators

**Pending/Incomplete**
```tsx
<div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-300 rounded">
  <span className="text-yellow-800">☐</span>
  <span className="text-sm text-yellow-900">Field Name (pending)</span>
</div>
```

**Completed**
```tsx
<div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-300 rounded">
  <span className="text-green-800">☑</span>
  <span className="text-sm text-green-900">Field Name (value)</span>
</div>
```

### 5. Chat Messages

**AI Message**
```tsx
<div className="px-3 py-2 bg-blue-50 border border-blue-500 rounded-md">
  <p className="text-xs text-blue-900 whitespace-pre-wrap">
    AI: {message}
  </p>
</div>
```

**User Message**
```tsx
<div className="px-3 py-2 bg-white border border-gray-300 rounded-md">
  <p className="text-xs text-gray-900 whitespace-pre-wrap">
    User: {message}
  </p>
</div>
```

### 6. Cards/Sections

**Profile/Timeline Card**
```tsx
<div className="bg-gray-50 border border-gray-200 rounded-md p-5">
  <h3 className="text-lg font-semibold text-gray-900 mb-4">Section Title</h3>
  {/* Card content */}
</div>
```

**Form Container**
```tsx
<div className="bg-white border border-gray-200 rounded-md p-5">
  {/* Form fields */}
</div>
```

---

## Improved Color Scheme Recommendations

### Option 1: Professional Financial (Recommended)
**Primary**: Deep Blue (#1e40af) → Trust, stability, professionalism
**Accent**: Teal (#14b8a6) → Modern, fresh, approachable
**Success**: Green (#10b981)
**Warning**: Amber (#f59e0b)
**Danger**: Red (#ef4444)

**Tailwind Classes**:
```
Primary: bg-blue-800, text-blue-800
Accent: bg-teal-500, text-teal-500
```

### Option 2: Modern SaaS
**Primary**: Indigo (#6366f1) → Innovation, technology
**Accent**: Purple (#a855f7) → Premium, creative
**Success**: Emerald (#10b981)
**Warning**: Yellow (#eab308)
**Danger**: Rose (#f43f5e)

**Tailwind Classes**:
```
Primary: bg-indigo-500, text-indigo-500
Accent: bg-purple-500, text-purple-500
```

### Option 3: Warm & Approachable
**Primary**: Blue (#3b82f6) → Friendly, trustworthy
**Accent**: Orange (#f97316) → Energy, warmth
**Success**: Green (#22c55e)
**Warning**: Amber (#fbbf24)
**Danger**: Red (#dc2626)

**Tailwind Classes**:
```
Primary: bg-blue-500, text-blue-500
Accent: bg-orange-500, text-orange-500
```

---

## Accessibility Standards

### Contrast Ratios (WCAG 2.1 AA)
- **Normal text**: Minimum 4.5:1
- **Large text** (≥18px): Minimum 3:1
- **UI components**: Minimum 3:1

### Focus States
- All interactive elements must have visible focus rings
- Use `focus:ring-2 focus:ring-{color}-500` for consistent focus indicators

### Color Independence
- Never rely solely on color to convey information
- Use icons, text labels, or patterns alongside color
- Example: ☐/☑ checkmarks + color for status

---

## Responsive Breakpoints

```css
sm: 640px   - Mobile landscape
md: 768px   - Tablet
lg: 1024px  - Desktop
xl: 1280px  - Large desktop
2xl: 1536px - Extra large
```

**Three-pane responsiveness**:
- **< 1024px**: Stack panes vertically, collapsible sidebar
- **≥ 1024px**: Show all three panes side-by-side

---

## Animation & Transitions

**Durations**
```css
transition-fast: 150ms    - Micro-interactions (hover, focus)
transition-base: 200ms    - Standard transitions
transition-slow: 300ms    - Complex state changes
```

**Easing**
```css
ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)  - Default
ease-out: cubic-bezier(0, 0, 0.2, 1)       - Enter animations
ease-in: cubic-bezier(0.4, 0, 1, 1)        - Exit animations
```

---

## Component Library Integration

### Recommended: Tailwind CSS + shadcn/ui
- **Tailwind CSS**: Utility-first styling aligned with mockup
- **shadcn/ui**: High-quality accessible components (optional)
- **Radix UI**: Headless primitives for custom components

### Installation
```bash
npx shadcn-ui@latest init
```

### Core Components Needed
1. Input (text, textarea)
2. Button (primary, secondary)
3. Card
4. Badge/Chip (status indicators)
5. ScrollArea (chat messages)

---

## Implementation Priority

### Phase 1: Core Structure (Task 6)
- Three-pane layout
- Basic typography
- Neutral color palette

### Phase 2: Interactive Elements (Task 7)
- Form inputs with proper styling
- Buttons with hover/focus states
- Status indicators

### Phase 3: Chat Interface (Task 8)
- Message bubbles
- Input box
- Send button

### Phase 4: Polish (Task 9)
- Improved color scheme (select from recommendations)
- Animations/transitions
- Responsive adjustments

---

## Design Tokens (CSS Custom Properties)

```css
:root {
  /* Colors */
  --color-primary: #0d6efd;
  --color-primary-dark: #0a58ca;
  --color-success: #28a745;
  --color-warning: #ffc107;
  --color-danger: #dc3545;

  /* Neutrals */
  --color-gray-50: #f8f9fa;
  --color-gray-100: #e9ecef;
  --color-gray-200: #dee2e6;
  --color-gray-300: #ced4da;
  --color-gray-400: #adb5bd;
  --color-gray-600: #6c757d;
  --color-gray-700: #495057;
  --color-gray-900: #212529;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* Typography */
  --font-size-xs: 10px;
  --font-size-sm: 12px;
  --font-size-base: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 18px;
  --font-size-2xl: 24px;

  /* Borders */
  --border-radius: 6px;
  --border-width: 1px;
}
```

---

## Next Steps

1. **Select Color Scheme**: Choose from Option 1 (Professional Financial - Recommended), Option 2, or Option 3
2. **Set up Tailwind**: Configure with custom color tokens
3. **Build Component Library**: Create reusable UI components following these patterns
4. **Implement Mockup**: Build three-pane layout with improved styling

---

**Created**: 2025-10-21
**Status**: Ready for Implementation
**Reference**: Based on `/home/zineng/workspace/explore_copilotkit/onboarding-mockup-with-form.excalidraw`
