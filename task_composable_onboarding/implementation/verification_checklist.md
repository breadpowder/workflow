# Task 6E - Three-Pane Layout Integration - Verification Checklist

## Overview
Verify the complete integration of three-pane layout into `/onboarding` with real workflow execution.

---

## Pre-Verification Setup

- [ ] Build successful: `npm run build`
- [ ] No TypeScript errors
- [ ] Dev server running: `npm run dev`
- [ ] Navigate to: `http://localhost:3000/`

---

## 1. Root Page Redirect (Phase 2)

**Test**: Visit root page
- [ ] Navigate to `http://localhost:3000/`
- [ ] **Expected**: Instant 307 redirect to `/onboarding`
- [ ] **Expected**: No loading flicker or delay
- [ ] **Expected**: Browser URL shows `/onboarding`

---

## 2. Three-Pane Layout Structure

**Test**: Visual layout rendering
- [ ] **LeftPane** visible on left side (width: 316px)
- [ ] **MiddlePane** visible in center (flex-grow, taking remaining space)
- [ ] **RightPane** visible on right side (width: 476px)
- [ ] All three panes render side-by-side
- [ ] Full viewport height coverage
- [ ] Proper border styling between panes

---

## 3. LeftPane - Client Selector

**Test**: Client type switching
- [ ] Client selector visible at top of LeftPane
- [ ] Two buttons: "Corporate" and "Individual"
- [ ] Corporate button highlighted blue (default selection)
- [ ] Individual button gray (not selected)
- [ ] Icons visible: building icon for Corporate, user icon for Individual

**Interaction**:
- [ ] Click "Individual" button
- [ ] **Expected**: Individual button turns blue
- [ ] **Expected**: Corporate button turns gray
- [ ] **Expected**: System message in chat: "Switched to individual workflow..."
- [ ] **Expected**: Workflow reloads for individual type

**Edge Case**:
- [ ] Click same button twice (should not trigger reload)
- [ ] Buttons disabled during workflow transition

---

## 4. LeftPane - Workflow Step List

**Test**: Step list display
- [ ] Section header: "Workflow Steps"
- [ ] All workflow steps listed (numbered 1, 2, 3...)
- [ ] Current step highlighted in blue with "▸" icon
- [ ] Completed steps show green background with "✓" checkmark
- [ ] Pending steps show gray with "○" circle
- [ ] Step names readable (not truncated unless very long)

**Verification**:
- [ ] First step is marked as current (blue + ▸)
- [ ] No steps marked as complete initially
- [ ] Step order matches workflow definition

---

## 5. MiddlePane - Workflow Progress Component

**Test**: Progress display sections

### Current Step Header:
- [ ] Current step title displayed prominently (h2, large font)
- [ ] Current step description shown below title
- [ ] Step number badge: "Step 1 of X" visible in top-right

### Stage Indicator (if stages defined):
- [ ] "Workflow Stages" section visible
- [ ] Stage indicators rendered (e.g., Info Collection → Compliance → Finalization)
- [ ] Current stage highlighted
- [ ] Completed stages show checkmark

### Overall Progress Bar:
- [ ] "Overall Progress" section visible
- [ ] Progress percentage displayed (e.g., "0%", "33%", "100%")
- [ ] Blue progress bar renders correctly
- [ ] Progress bar width matches percentage

### All Steps List:
- [ ] "All Steps" section visible
- [ ] Each step shows status icon (✓/▸/○)
- [ ] Current step has blue background + "Current" badge
- [ ] Completed steps have green background + "Complete" badge
- [ ] Step descriptions truncated if too long

---

## 6. MiddlePane - Current Task Card

**Test**: Task card functionality

### Task Info:
- [ ] "Current Task" header visible
- [ ] Task description displayed
- [ ] Description text readable and appropriate

### Action Button:
- [ ] "Open Form" button visible and blue
- [ ] Button enabled (not gray/disabled)
- [ ] Hover effect works (darker blue)

### Validation Warnings:
- [ ] No warnings shown initially (form not filled)
- [ ] After attempting to proceed without filling, warning appears
- [ ] Warning shows required fields: "Required fields: field1, field2..."

### Navigation Buttons:
- [ ] "← Back" button visible on left
- [ ] "← Back" button disabled initially (no previous steps)
- [ ] "Next →" button visible on right
- [ ] "Next →" button disabled initially (required fields not filled)

---

## 7. MiddlePane - Debug Panel (Development Only)

**Test**: Debug information
- [ ] Debug panel visible at bottom (dark gray/black background)
- [ ] "Debug Info:" header shown
- [ ] Client ID displayed
- [ ] Client Type displayed (corporate/individual)
- [ ] Workflow ID displayed
- [ ] Current Step ID displayed
- [ ] Current Stage displayed (or "N/A")
- [ ] Completed Steps listed
- [ ] Can Proceed: Yes/No
- [ ] Missing Fields listed
- [ ] Overlay Open: Yes/No

---

## 8. RightPane - Chat Section

**Test**: Chat display

### Initial Messages:
- [ ] Two messages visible on load:
  - System message: "Welcome to the onboarding workflow."
  - AI message: "Hello! I'm here to assist you..."
- [ ] Messages have timestamps
- [ ] System message has info badge/styling (blue/gray)
- [ ] AI message has proper avatar/styling

### Chat Input:
- [ ] Message input box visible at bottom
- [ ] "Send" button visible next to input
- [ ] Placeholder text: "Type a message..."

### Chat Interaction:
- [ ] Type message in input box
- [ ] Click "Send" button
- [ ] **Expected**: User message appears in chat with "user" role
- [ ] **Expected**: Input cleared after send
- [ ] **Expected**: AI response appears after ~1 second delay
- [ ] **Expected**: AI says "I understand. Let me help you..."

### Chat Scroll:
- [ ] Chat messages scrollable if many messages
- [ ] Auto-scrolls to bottom on new message

---

## 9. RightPane - Form Overlay Pattern

**Test**: Overlay trigger

### Opening Overlay:
- [ ] Click "Open Form" button in MiddlePane
- [ ] **Expected**: Form overlay slides in from right
- [ ] **Expected**: Backdrop appears (semi-transparent dark overlay)
- [ ] **Expected**: Chat section dims/blurs
- [ ] **Expected**: System message in chat: "Opening form: [Task Name]"
- [ ] **Expected**: Overlay title shows task name
- [ ] **Expected**: Close button (X) visible in top-right of overlay

### Overlay Content:
- [ ] Form component renders inside overlay
- [ ] Form fields visible based on component registry
- [ ] Form fields are interactive (can type, select, etc.)
- [ ] "Submit & Continue" button visible at bottom
- [ ] "Cancel" button visible next to Submit

### Overlay Behavior:
- [ ] Click outside overlay (on backdrop)
- [ ] **Expected**: Overlay closes
- [ ] **Expected**: Chat un-dims
- [ ] **Expected**: System message: "Form closed. You can resume when ready."

- [ ] Re-open overlay
- [ ] Click "Cancel" button
- [ ] **Expected**: Same closing behavior as clicking outside

- [ ] Click "X" close button
- [ ] **Expected**: Same closing behavior

---

## 10. Form Validation & Submission

**Test**: Form workflow

### Fill Form:
- [ ] Open form overlay
- [ ] Leave required fields empty
- [ ] Click "Submit & Continue"
- [ ] **Expected**: System error message: "Please complete required fields: ..."
- [ ] **Expected**: Overlay stays open
- [ ] **Expected**: Warning in MiddlePane shows missing fields

### Complete Form:
- [ ] Fill all required fields
- [ ] Click "Submit & Continue"
- [ ] **Expected**: Overlay closes
- [ ] **Expected**: System success message: "Form submitted successfully!"
- [ ] **Expected**: Workflow progresses to next step
- [ ] **Expected**: Step list updates (previous step marked complete ✓)
- [ ] **Expected**: Current step indicator moves to next step
- [ ] **Expected**: Progress bar increases
- [ ] **Expected**: MiddlePane shows new task card

---

## 11. Navigation Flow

**Test**: Back/Next navigation

### Forward Navigation:
- [ ] Complete first step form
- [ ] Step 2 becomes current
- [ ] "← Back" button now enabled
- [ ] Complete step 2
- [ ] Continue to step 3
- [ ] Progress bar shows 66% or appropriate percentage

### Backward Navigation:
- [ ] From step 3, click "← Back" button
- [ ] **Expected**: Return to step 2
- [ ] **Expected**: Step 2 marked as current (blue)
- [ ] **Expected**: Step 3 reverts to pending (○)
- [ ] **Expected**: Progress bar decreases
- [ ] **Expected**: Previous inputs preserved (form data retained)

### Direct Navigation (if implemented):
- [ ] Click on a previous step in LeftPane step list
- [ ] **Expected**: Navigate to that step OR disabled (depending on implementation)

---

## 12. Client Type Switching Mid-Workflow

**Test**: Switch client type during workflow

### Switch During Progress:
- [ ] Complete 1-2 steps in Corporate workflow
- [ ] Click "Individual" in ClientSelector
- [ ] **Expected**: Warning system message
- [ ] **Expected**: Workflow reloads
- [ ] **Expected**: Different workflow definition loads
- [ ] **Expected**: Step list changes to Individual steps
- [ ] **Expected**: Progress resets or adjusts appropriately

---

## 13. Workflow Completion

**Test**: Complete all steps

### Final Step:
- [ ] Progress through all workflow steps
- [ ] Complete final step
- [ ] **Expected**: Completion screen appears
- [ ] **Expected**: Green checkmark icon visible
- [ ] **Expected**: "Onboarding Complete!" message
- [ ] **Expected**: "Your information has been submitted successfully."
- [ ] **Expected**: Two buttons: "Start Over" and "Go to Home"

### Completion Actions:
- [ ] Click "Start Over"
- [ ] **Expected**: Workflow resets to first step
- [ ] **Expected**: All progress cleared
- [ ] **Expected**: Back to step 1

- [ ] Click "Go to Home"
- [ ] **Expected**: Navigate to `/` (which redirects to `/onboarding`)

---

## 14. Error Handling

**Test**: Error states

### Component Not Found:
- [ ] If component_id is invalid in YAML
- [ ] **Expected**: Error overlay appears
- [ ] **Expected**: Message: "Component not found: [component_id]"
- [ ] **Expected**: List of available components shown

### Workflow Load Error:
- [ ] Simulate network failure (if applicable)
- [ ] **Expected**: Error screen with reload button
- [ ] **Expected**: Clear error message
- [ ] **Expected**: Reload button works

---

## 15. Responsive Behavior

**Test**: Window resizing (if time permits)
- [ ] Resize browser window to narrow width
- [ ] **Expected**: Layout adapts OR horizontal scroll appears
- [ ] **Expected**: No broken UI elements
- [ ] **Expected**: Text remains readable

---

## 16. Performance Checks

**Test**: Performance metrics
- [ ] Page loads in < 3 seconds
- [ ] Form overlay animation smooth (no jank)
- [ ] Step transitions instantaneous
- [ ] No console errors in browser DevTools
- [ ] No console warnings (check browser console)

---

## Summary Checklist

**Core Functionality**:
- [ ] Root redirect works
- [ ] Three-pane layout renders correctly
- [ ] Client selector switches workflows
- [ ] Workflow progression works end-to-end
- [ ] Form overlay opens/closes properly
- [ ] Chat displays messages correctly
- [ ] Validation prevents progression without required fields
- [ ] Back/Next navigation functional
- [ ] Workflow completion screen appears

**Quality Checks**:
- [ ] No TypeScript errors in build
- [ ] No runtime errors in console
- [ ] Visual design matches three-pane spec
- [ ] All interactive elements respond to clicks
- [ ] System messages appear at appropriate times
- [ ] Debug panel shows accurate information

---

## Notes Section

**Issues Found**:
- [List any bugs or issues discovered]

**Browser Tested**:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari

**Pass/Fail**:
- [ ] PASS - All critical tests passed
- [ ] PARTIAL - Some issues found (document above)
- [ ] FAIL - Major issues blocking usage
