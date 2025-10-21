# State Machine and Generative UI in CopilotKit

## Table of Contents
1. [Introduction](#introduction)
2. [State Machine Pattern Overview](#state-machine-pattern-overview)
3. [Real Example: Car Sales State Machine](#real-example-car-sales-state-machine)
4. [Generative UI Deep Dive](#generative-ui-deep-dive)
5. [How AI is Applied in the Flow](#how-ai-is-applied-in-the-flow)
6. [Stage Definitions and Transitions](#stage-definitions-and-transitions)
7. [Implementation Patterns](#implementation-patterns)

---

## Introduction

This document provides an in-depth analysis of the **CopilotKit State Machine** pattern using the real-world car sales example from the repository. We'll explore how state machines work, how Generative UI enables interactive AI-driven interfaces, and the complete flow of AI integration.

### What is a State Machine in CopilotKit?

A **state machine** is a pattern for managing multi-step conversational flows where the AI's behavior changes based on the current stage. It's ideal for:

- **Onboarding flows** (multi-step registration)
- **Checkout processes** (cart → payment → confirmation)
- **Complex wizards** (configuration, setup, data collection)
- **Decision trees** with branching logic

### What is Generative UI?

**Generative UI** refers to AI-triggered React components that render based on conversation context. The AI decides **WHEN** to show UI (by calling actions), and developers define **WHAT** UI renders for each action.

---

## State Machine Pattern Overview

### Architecture: Three Layers

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: Global State Management                           │
│ - Manages current stage                                     │
│ - Stores data across stages (contact info, selections, etc)│
│ - Exposes state to AI via useCopilotReadable              │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2: Stage Hooks                                        │
│ - Each stage = custom React hook                           │
│ - Registers instructions, context, actions                 │
│ - Conditionally enabled based on current stage             │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ LAYER 3: UI Components                                      │
│ - Chat orchestrator (calls all stage hooks)                │
│ - State visualizer (React Flow diagram)                    │
│ - Generative UI components (forms, cards, etc)             │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **One Active Stage at a Time**: Only one stage's hooks are "enabled"
2. **Explicit Transitions**: `setStage("nextStage")` controls flow
3. **Conditional Availability**: `available` prop determines what AI sees
4. **Data Persistence**: Global state carries data across stages
5. **Deterministic Flow**: Transitions are explicit, not automatic

---

## Real Example: Car Sales State Machine

### Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root: CopilotKit + GlobalState wrapper
│   └── page.tsx                # Orders & State Visualizer tabs
├── components/
│   ├── car-sales-chat.tsx      # Stage orchestrator
│   ├── state-visualizer.tsx    # React Flow diagram
│   └── generative-ui/          # UI components rendered by AI
│       ├── contact-info.tsx
│       ├── show-car.tsx
│       ├── financing-form.tsx
│       ├── payment-cards.tsx
│       └── confirm-order.tsx
├── lib/
│   ├── stages/
│   │   ├── use-global-state.tsx
│   │   ├── use-stage-get-contact-info.tsx
│   │   ├── use-stage-build-car.tsx
│   │   ├── use-stage-sell-financing.tsx
│   │   ├── use-stage-get-financing-info.tsx
│   │   ├── use-stage-get-payment-info.tsx
│   │   └── use-stage-confirm-order.tsx
│   └── types/
│       ├── cars.ts
│       ├── contact-info.ts
│       └── ...
```

### The 6-Stage Flow

```
┌─────────────────┐
│ getContactInfo  │  Collect customer details
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    buildCar     │  Select car from inventory
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ sellFinancing   │  Offer financing option
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌──────────┐ ┌────────────────┐
│ Payment  │ │ getFinancing   │
│  Info    │ │     Info       │
└────┬─────┘ └────────┬───────┘
     │                │
     └────────┬───────┘
              ▼
      ┌──────────────┐
      │ confirmOrder │
      └──────────────┘
```

---

## Layer 1: Global State Management

**File**: `src/lib/stages/use-global-state.tsx`

### Stage Type Definition

```typescript
export type Stage =
  | "getContactInfo"    // 1. Collect contact info
  | "buildCar"          // 2. Select car
  | "sellFinancing"     // 3. Offer financing
  | "getFinancingInfo"  // 4. Get financing details
  | "getPaymentInfo"    // 5. Get payment details
  | "confirmOrder";     // 6. Finalize order
```

This creates a **finite state machine** - only these 6 states exist!

### Global State Interface

```typescript
interface GlobalState {
  // State machine control
  stage: Stage;
  setStage: React.Dispatch<React.SetStateAction<Stage>>;

  // Data collected across stages
  selectedCar: Car | null;
  setSelectedCar: React.Dispatch<React.SetStateAction<Car | null>>;

  contactInfo: ContactInfo | null;
  setContactInfo: React.Dispatch<React.SetStateAction<ContactInfo | null>>;

  cardInfo: CardInfo | null;
  setCardInfo: React.Dispatch<React.SetStateAction<CardInfo | null>>;

  financingInfo: FinancingInfo | null;
  setFinancingInfo: React.Dispatch<React.SetStateAction<FinancingInfo | null>>;

  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
}
```

### Implementation

```typescript
export function GlobalStateProvider({ children }: { children: ReactNode }) {
  // Initialize state
  const [stage, setStage] = useState<Stage>("getContactInfo");
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [cardInfo, setCardInfo] = useState<CardInfo | null>(null);
  const [orders, setOrders] = useState<Order[]>(defaultOrders);
  const [financingInfo, setFinancingInfo] = useState<FinancingInfo | null>(null);

  // 🔑 KEY: Expose ALL state to AI
  useCopilotReadable({
    description: "Currently Specified Information",
    value: {
      contactInfo,
      selectedCar,
      cardInfo,
      financingInfo,
      orders,
      currentStage: stage,  // AI knows current stage!
    },
  });

  return (
    <GlobalStateContext.Provider value={{
      stage, setStage,
      selectedCar, setSelectedCar,
      contactInfo, setContactInfo,
      cardInfo, setCardInfo,
      orders, setOrders,
      financingInfo, setFinancingInfo
    }}>
      {children}
    </GlobalStateContext.Provider>
  );
}
```

**Key Point**: The AI can always see the current stage via `useCopilotReadable`, which helps it understand context.

---

## Layer 2: Stage Hooks

Each stage is encapsulated in a custom React hook that defines:
1. **Instructions** - What the AI should do in this stage
2. **Context** - What data the AI can read
3. **Actions** - What functions the AI can call

### Pattern: Conditional Availability

**The Secret Sauce:**
```typescript
available: stage === "targetStage" ? "enabled" : "disabled"
```

This ensures AI only sees/uses hooks for the **current stage**.

### Example 1: Contact Info Stage

**File**: `src/lib/stages/use-stage-get-contact-info.tsx`

```typescript
export function useStageGetContactInfo() {
  const { setContactInfo, stage, setStage } = useGlobalState();

  // 1️⃣ CONDITIONAL INSTRUCTIONS
  useCopilotAdditionalInstructions({
    instructions: "CURRENT STATE: You are now getting the contact information of the user.",
    available: stage === "getContactInfo" ? "enabled" : "disabled",
  }, [stage]);

  // 2️⃣ CONDITIONAL ACTION with Generative UI
  useCopilotAction({
    name: "getContactInformation",
    description: "Get the contact information of the user",
    available: stage === "getContactInfo" ? "enabled" : "disabled",

    // 🎨 GENERATIVE UI: AI triggers, we render
    renderAndWaitForResponse: ({ status, respond }) => {
      return (
        <ContactInfo
          status={status}
          onSubmit={(name, email, phone) => {
            // Save data
            setContactInfo({ name, email, phone });

            // Tell AI what happened
            respond?.("User has submitted their contact information.");

            // 🎯 STATE TRANSITION!
            setStage("buildCar");
          }}
        />
      );
    },
  }, [stage]);
}
```

**Flow when stage = "getContactInfo":**
1. AI sees instruction: "Get contact information"
2. AI sees action: `getContactInformation`
3. AI calls action (no parameters needed)
4. `ContactInfo` component renders
5. User fills form and clicks Submit
6. `onSubmit` fires → data saved → stage transitions
7. AI receives: "User has submitted their contact information"

### Example 2: Build Car Stage

**File**: `src/lib/stages/use-stage-build-car.tsx`

```typescript
export function useStageBuildCar() {
  const { setSelectedCar, stage, setStage } = useGlobalState();

  // 1️⃣ INSTRUCTIONS
  useCopilotAdditionalInstructions({
    instructions: "CURRENT STATE: You are now helping the user select a car. " +
                  "Show cars using the 'showCar' or 'showMultipleCars' action.",
    available: stage === "buildCar" ? "enabled" : "disabled",
  }, [stage]);

  // 2️⃣ CONTEXT: Car Inventory
  useCopilotReadable({
    description: "Car Inventory",
    value: cars,  // Array of 7 cars
    available: stage === "buildCar" ? "enabled" : "disabled",
  }, [stage]);

  // 3️⃣ ACTION: Show Single Car
  useCopilotAction({
    name: "showCar",
    description: "Show a single car that you have in mind",
    available: stage === "buildCar" ? "enabled" : "disabled",
    parameters: [
      {
        name: "car",
        type: "object",
        description: "The car to show",
        required: true,
        attributes: [
          { name: "id", type: "number" },
          { name: "make", type: "string" },
          { name: "model", type: "string" },
          { name: "year", type: "number" },
          { name: "color", type: "string" },
          { name: "price", type: "number" },
          // ... image attributes
        ],
      },
    ],
    renderAndWaitForResponse: ({ args, status, respond }) => {
      const { car } = args;
      return (
        <ShowCar
          car={car as Car}
          status={status}
          onSelect={() => {
            setSelectedCar(car as Car);
            respond?.("User has selected a car, moving to next state");
            setStage("sellFinancing");  // 🎯 TRANSITION!
          }}
          onReject={() =>
            respond?.("User wants different car, stay in this state")
          }
        />
      );
    },
  }, [stage]);

  // 4️⃣ ACTION: Show Multiple Cars
  useCopilotAction({
    name: "showMultipleCars",
    description: "Show multiple cars based on user's query",
    parameters: [
      {
        name: "cars",
        type: "object[]",
        required: true,
        attributes: [/* same as above */]
      }
    ],
    renderAndWaitForResponse: ({ args, status, respond }) => {
      return (
        <ShowCars
          cars={args.cars as Car[]}
          status={status}
          onSelect={(car) => {
            setSelectedCar(car);
            respond?.("User selected car, moving to next state");
            setStage("sellFinancing");
          }}
        />
      );
    },
  }, [stage]);
}
```

**AI Decision Process:**

```
User: "Show me green SUVs"
  ↓
AI reads context:
  - Instruction: "Help user select a car"
  - Context: cars = [7 cars with details]
  - Actions: [showCar, showMultipleCars]
  ↓
AI filters cars:
  - Find where color === "Green"
  - Find 4 green cars
  ↓
AI decides:
  - Multiple matches → use "showMultipleCars"
  - Calls: showMultipleCars({ cars: [filtered cars] })
  ↓
CopilotKit executes:
  - renderAndWaitForResponse fires
  - <ShowCars /> component renders
  ↓
User clicks Select on Hyundai Kona
  ↓
onSelect fires:
  - setSelectedCar(Kona)
  - respond("User selected car")
  - setStage("sellFinancing")
```

### Example 3: Sell Financing Stage (Branching Logic)

**File**: `src/lib/stages/use-stage-sell-financing.tsx`

```typescript
export function useStageSellFinancing() {
  const { stage, setStage } = useGlobalState();

  // Instructions
  useCopilotAdditionalInstructions({
    instructions: "CURRENT STATE: You are trying to sell financing. " +
                  "Ask if interested and call selectFinancing or selectNoFinancing.",
    available: stage === "sellFinancing" ? "enabled" : "disabled",
  }, [stage]);

  // Context
  useCopilotReadable({
    description: "Financing Information",
    value: "Current promotion: 0% financing for 60 months",
    available: stage === "sellFinancing" ? "enabled" : "disabled",
  }, [stage]);

  // 🔀 BRANCH A: User wants financing
  useCopilotAction({
    name: "selectFinancing",
    description: "Select the financing option",
    available: stage === "sellFinancing" ? "enabled" : "disabled",
    handler: () => setStage("getFinancingInfo"),  // Go to financing path
  }, [stage]);

  // 🔀 BRANCH B: User pays directly
  useCopilotAction({
    name: "selectNoFinancing",
    description: "Select the no financing option",
    available: stage === "sellFinancing" ? "enabled" : "disabled",
    handler: () => setStage("getPaymentInfo"),  // Skip to payment
  }, [stage]);
}
```

**Branching Flow:**

```
sellFinancing stage
       │
AI asks: "Would you like 0% financing?"
       │
  ┌────┴────┐
  │         │
User: Yes  User: No
  │         │
  ▼         ▼
selectFinancing  selectNoFinancing
  │         │
  ▼         ▼
getFinancingInfo  getPaymentInfo
  │         │
  └────┬────┘
       ▼
  confirmOrder
```

---

## Layer 3: UI Components

### Chat Orchestrator

**File**: `src/components/car-sales-chat.tsx`

```typescript
export function CarSalesChat() {
  const { appendMessage, isLoading } = useCopilotChat();

  // 🎯 ALL STAGES REGISTERED HERE
  // All hooks are ALWAYS called, but only current stage is "enabled"
  useStageGetContactInfo();
  useStageBuildCar();
  useStageSellFinancing();
  useStageGetPaymentInfo();
  useStageGetFinancingInfo();
  useStageConfirmOrder();

  // Initial greeting
  useEffect(() => {
    if (!initialMessageSent && !isLoading) {
      setTimeout(() => {
        appendMessage(new TextMessage({
          content: "Hi, I'm Fio, your AI car salesman. " +
                   "First, let's get your contact information.",
          role: MessageRole.Assistant,
        }));
        setInitialMessageSent(true);
      }, 500);
    }
  }, [initialMessageSent, appendMessage, isLoading]);

  return (
    <CopilotChat
      instructions={systemPrompt}
      UserMessage={UserMessage}
      AssistantMessage={AssistantMessage}
    />
  );
}

const systemPrompt = `
GOAL: Help user purchase a car through stages.

DETAILS:
- Each stage has unique instructions, tools, and data
- Evaluate current stage before responding
- DO NOT skip stages
- Take stages one at a time

NOTICES:
- DO NOT mention "stage" or "state machine"
- DO NOT offer test drives
`;
```

**Important**: All 6 stage hooks are called on every render, but React's dependency system ensures only the current stage's hooks are active.

### State Visualizer

**File**: `src/components/state-visualizer.tsx`

```typescript
export function StateVisualizer() {
  const { stage } = useGlobalState();  // 🎯 Watch global stage

  const activeNodeStyles = "ring-4 ring-pink-400 animate-pulse";
  const inactiveNodeStyles = "border border-gray-200";

  const nodes: Node[] = useMemo(() => [
    {
      id: "getContactInfo",
      data: { label: "Contact Info" },
      position: { x: 250, y: 0 },
      className: stage === "getContactInfo" ? activeNodeStyles : inactiveNodeStyles,
    },
    {
      id: "buildCar",
      data: { label: "Build Car" },
      position: { x: 250, y: 100 },
      className: stage === "buildCar" ? activeNodeStyles : inactiveNodeStyles,
    },
    // ... other nodes
  ], [stage]);

  const edges: Edge[] = [
    {
      id: "getContactInfo-buildCar",
      source: "getContactInfo",
      target: "buildCar",
      className: stage === "getContactInfo"
        ? "stroke-pink-400 stroke-2"  // Active
        : "stroke-gray-200 stroke-1", // Inactive
    },
    // ... other edges
  ];

  return <ReactFlow nodes={nodes} edges={edges} fitView />;
}
```

**Real-time Updates:**
- When `setStage("buildCar")` is called
- Global state updates
- `StateVisualizer` re-renders
- `buildCar` node gets pink ring + pulse
- Edge highlights

---

## Generative UI Deep Dive

### What AI Actually Controls

**AI's ONLY Decision:**
```
"I should call the action named 'showCar'"
```

**Developer's Hardcoded Decision:**
```typescript
useCopilotAction({
  name: "showCar",  // ← AI chooses this name
  renderAndWaitForResponse: () => {
    return <ShowCar />  // ← Developer hardcoded this component
  }
})
```

### The Coupling Architecture

```
AI Decision Layer
      │
      ▼
┌──────────────────┐
│ Action Name      │  ← AI chooses: "showCar"
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Developer-Defined Mapping        │
│ "showCar" → <ShowCar />         │  ← Hardcoded by developer
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────┐
│ React Component  │  ← Renders in UI
└──────────────────┘
```

### Generative UI Component Example

**File**: `src/components/generative-ui/show-car.tsx`

```typescript
interface ShowCarProps {
  car: Car;
  onSelect: () => void;
  onReject?: () => void;
  status: RenderFunctionStatus;  // "executing" | "complete"
}

export function ShowCar({ car, onSelect, onReject, status }: ShowCarProps) {
  return (
    <AnimatedCard status={status}>
      {/* Car Image */}
      <div className="relative aspect-[3/3]">
        <Image
          src={car?.image?.src || ""}
          alt={car?.image?.alt || ""}
          width={300}
          height={250}
        />
      </div>

      {/* Car Details */}
      <div className="space-y-2">
        <div className="text-2xl font-semibold">
          {car.year} {car.make} {car.model}
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Make</span>
          <span>{car.make}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Price</span>
          <span className="font-semibold">
            ${car.price?.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Interactive Buttons (Hidden when complete) */}
      {status !== "complete" && (
        <div className="flex gap-3">
          {onReject && (
            <button onClick={onReject}>
              Other options
            </button>
          )}
          <button onClick={onSelect}>
            Select
          </button>
        </div>
      )}
    </AnimatedCard>
  );
}
```

**Status Property:**
- `"executing"`: Component is active, buttons visible
- `"complete"`: User has interacted, buttons hidden

### Contact Info Component

**File**: `src/components/generative-ui/contact-info.tsx`

```typescript
export function ContactInfo({ onSubmit, status }: ContactInfoProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  return (
    <AnimatedCard status={status}>
      <h1 className="text-2xl font-semibold">Contact Information</h1>

      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={isSubmitted}
      />

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isSubmitted}
      />

      <input
        type="tel"
        placeholder="Phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        disabled={isSubmitted}
      />

      {!isSubmitted && (
        <button
          onClick={() => {
            setIsSubmitted(true);
            onSubmit(name, email, phone);  // Callback to stage hook
          }}
        >
          Submit
        </button>
      )}
    </AnimatedCard>
  );
}
```

---

## How AI is Applied in the Flow

### Complete Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INPUT                              │
│           "Show me a green SUV"                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                COPILOTKIT RUNTIME                           │
│ 1. Receives message                                         │
│ 2. Checks current stage: "buildCar"                        │
│ 3. Gathers context for AI:                                 │
│    - System prompt                                          │
│    - Stage instructions (from useCopilotAdditionalInst)    │
│    - Readable context (car inventory)                      │
│    - Available actions (showCar, showMultipleCars)         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  AI (LLM) REASONING                         │
│ Input to LLM:                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ System: "Help user purchase car through stages..."     │ │
│ │                                                         │ │
│ │ Stage Instructions: "CURRENT STATE: Helping user       │ │
│ │ select a car. Show cars with showCar action..."        │ │
│ │                                                         │ │
│ │ Context (Readable):                                     │ │
│ │ - Car Inventory: [{make: "Hyundai", color: "Green"},   │ │
│ │                   {make: "Kia", color: "Green"}, ...]  │ │
│ │ - Contact Info: {name: "John", email: "..."}          │ │
│ │ - Current Stage: "buildCar"                            │ │
│ │                                                         │ │
│ │ Available Actions:                                      │ │
│ │ - showCar(car: Car)                                     │ │
│ │ - showMultipleCars(cars: Car[])                        │ │
│ │                                                         │ │
│ │ User: "Show me a green SUV"                            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ AI Reasoning:                                               │
│ - User wants green SUVs                                     │
│ - Filter: cars.filter(c => c.color === "Green")           │
│ - Found 4 green cars                                        │
│ - Multiple results → use "showMultipleCars"                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│               ACTION EXECUTION                              │
│ AI returns:                                                 │
│ {                                                           │
│   "type": "action_call",                                   │
│   "action": "showMultipleCars",                            │
│   "parameters": {                                          │
│     "cars": [                                              │
│       {make: "Hyundai", model: "Kona", color: "Green"},   │
│       {make: "Kia", model: "Tasman", color: "Green"},     │
│       ...                                                  │
│     ]                                                      │
│   }                                                        │
│ }                                                           │
│                                                             │
│ CopilotKit executes:                                       │
│ renderAndWaitForResponse({ args, status, respond })        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              GENERATIVE UI RENDER                           │
│ <ShowCars                                                   │
│   cars={[filtered green cars]}                             │
│   status="executing"                                       │
│   onSelect={(car) => {                                     │
│     setSelectedCar(car)                                    │
│     respond("User selected Hyundai Kona")                 │
│     setStage("sellFinancing")                             │
│   }}                                                       │
│ />                                                         │
│                                                             │
│ UI appears in chat:                                         │
│ - 4 car cards in horizontal scroll                         │
│ - Each with image, details, Select button                  │
└────────────────────┬────────────────────────────────────────┘
                     │
              USER CLICKS SELECT
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              USER INTERACTION                               │
│ onSelect fires:                                             │
│ 1. setSelectedCar(Hyundai Kona)                            │
│ 2. respond("User selected Hyundai Kona")                   │
│ 3. setStage("sellFinancing")                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           NEXT STAGE: SELL FINANCING                        │
│ - buildCar hooks disabled                                   │
│ - sellFinancing hooks enabled                               │
│ - AI sees new instructions and actions                      │
│ - AI: "Great choice! Would you like 0% financing?"         │
└─────────────────────────────────────────────────────────────┘
```

### Context Assembly for AI

When AI processes a request, CopilotKit assembles:

```javascript
{
  // System-level instructions
  systemPrompt: "Help user purchase car...",

  // Stage-specific instructions
  additionalInstructions: "CURRENT STATE: Helping user select car...",

  // Readable context (only enabled for current stage)
  context: {
    carInventory: [...],
    contactInfo: {...},
    currentStage: "buildCar"
  },

  // Available tools (only enabled for current stage)
  tools: [
    {
      name: "showCar",
      description: "Show a single car",
      parameters: {...}
    },
    {
      name: "showMultipleCars",
      description: "Show multiple cars",
      parameters: {...}
    }
  ],

  // Conversation history
  messages: [
    { role: "user", content: "Show me a green SUV" }
  ]
}
```

---

## Stage Definitions and Transitions

### How Stages Are Defined

**1. Type Definition** (Finite State Machine)

```typescript
// In use-global-state.tsx
export type Stage =
  | "getContactInfo"
  | "buildCar"
  | "sellFinancing"
  | "getFinancingInfo"
  | "getPaymentInfo"
  | "confirmOrder";
```

Only these 6 states can exist!

**2. Initial State**

```typescript
const [stage, setStage] = useState<Stage>("getContactInfo");
```

**3. Hook Registration**

```typescript
// In car-sales-chat.tsx
useStageGetContactInfo();  // Always called
useStageBuildCar();        // Always called
useStageSellFinancing();   // Always called
// ... etc
```

All hooks are always called, but conditional `available` prop controls activation.

### Transition Mechanisms

#### Mechanism 1: Direct Transition

```typescript
// Simple, deterministic transition
handler: () => {
  setStage("nextStage");
}
```

#### Mechanism 2: Transition After Data Collection

```typescript
onSubmit={(name, email, phone) => {
  // 1. Save data
  setContactInfo({ name, email, phone });

  // 2. Notify AI
  respond?.("User submitted contact info");

  // 3. Transition
  setStage("buildCar");
}
```

#### Mechanism 3: Conditional Branching

```typescript
// In sellFinancing stage

// Branch A
useCopilotAction({
  name: "selectFinancing",
  handler: () => setStage("getFinancingInfo")
});

// Branch B
useCopilotAction({
  name: "selectNoFinancing",
  handler: () => setStage("getPaymentInfo")
});
```

#### Mechanism 4: Human-in-the-Loop Transition

```typescript
renderAndWaitForResponse: ({ args, status, respond }) => (
  <ConfirmationDialog
    onConfirm={() => {
      processData(args);
      respond?.("User confirmed");
      setStage("nextStage");
    }}
    onCancel={() => {
      respond?.("User cancelled, staying in current stage");
      // No transition
    }}
  />
)
```

### Complete Stage Lifecycle Example

```typescript
// ════════════════════════════════════════════════════════════
// STAGE: getContactInfo (initial stage)
// ════════════════════════════════════════════════════════════

stage = "getContactInfo"

Enabled Hooks:
  ✅ useCopilotAdditionalInstructions("Get contact info...")
  ✅ useCopilotAction("getContactInformation")

AI Context:
  - Instructions: "Get contact information"
  - Actions: [getContactInformation]

AI decides: "I should call getContactInformation"

AI executes: getContactInformation()

UI renders: <ContactInfo />

User fills form and clicks Submit

Callback fires:
  → setContactInfo({name, email, phone})
  → respond("User submitted info")
  → setStage("buildCar")  // 🔄 TRANSITION!

// ════════════════════════════════════════════════════════════
// STAGE: buildCar (after transition)
// ════════════════════════════════════════════════════════════

stage = "buildCar"

Disabled Hooks (from previous stage):
  ❌ getContactInfo instructions
  ❌ getContactInformation action

Enabled Hooks (new stage):
  ✅ useCopilotAdditionalInstructions("Help select car...")
  ✅ useCopilotReadable("Car Inventory", cars)
  ✅ useCopilotAction("showCar")
  ✅ useCopilotAction("showMultipleCars")

AI Context:
  - Instructions: "Help user select a car"
  - Context: Car inventory [7 cars]
  - Actions: [showCar, showMultipleCars]
  - Readable: {contactInfo: {name: "John", ...}, currentStage: "buildCar"}

User: "Show me green cars"

AI filters cars → calls showMultipleCars(cars: [...])

UI renders: <ShowCars cars={[...]} />

User clicks Select on car

Callback fires:
  → setSelectedCar(car)
  → respond("User selected car")
  → setStage("sellFinancing")  // 🔄 TRANSITION!

// ... and so on through remaining stages
```

---

## Implementation Patterns

### Pattern 1: Stage Hook Template

```typescript
export function useStage[StageName]() {
  const { /* state getters/setters */, stage, setStage } = useGlobalState();

  // 1. Instructions
  useCopilotAdditionalInstructions({
    instructions: "CURRENT STATE: [Description of what AI should do]",
    available: stage === "[stageName]" ? "enabled" : "disabled",
  }, [stage]);

  // 2. Context (optional)
  useCopilotReadable({
    description: "[What this data represents]",
    value: [data],
    available: stage === "[stageName]" ? "enabled" : "disabled",
  }, [stage]);

  // 3. Actions
  useCopilotAction({
    name: "[actionName]",
    description: "[What this action does]",
    available: stage === "[stageName]" ? "enabled" : "disabled",
    parameters: [/* ... */],
    renderAndWaitForResponse: ({ args, status, respond }) => (
      <Component
        {...args}
        status={status}
        onComplete={(result) => {
          // Save data
          // Tell AI
          respond?.(/* message */);
          // Transition
          setStage("[nextStage]");
        }}
      />
    ),
  }, [stage]);
}
```

### Pattern 2: Generative UI Component Template

```typescript
interface ComponentProps {
  data: any;
  status: RenderFunctionStatus;
  onComplete: (result: any) => void;
}

export function Component({ data, status, onComplete }: ComponentProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);

  return (
    <AnimatedCard status={status}>
      {/* Display data */}

      {/* Interactive elements (hidden when complete) */}
      {!isSubmitted && status !== "complete" && (
        <button
          onClick={() => {
            setIsSubmitted(true);
            onComplete({ /* result data */ });
          }}
        >
          Submit
        </button>
      )}
    </AnimatedCard>
  );
}
```

### Pattern 3: Branching Logic

```typescript
export function useStageBranching() {
  const { stage, setStage } = useGlobalState();

  // Path A
  useCopilotAction({
    name: "choosePathA",
    description: "Choose option A",
    available: stage === "branching" ? "enabled" : "disabled",
    handler: () => setStage("pathA"),
  }, [stage]);

  // Path B
  useCopilotAction({
    name: "choosePathB",
    description: "Choose option B",
    available: stage === "branching" ? "enabled" : "disabled",
    handler: () => setStage("pathB"),
  }, [stage]);
}
```

### Pattern 4: State Validation Before Transition

```typescript
useCopilotAction({
  name: "proceedToCheckout",
  available: stage === "cart" ? "enabled" : "disabled",
  handler: () => {
    // Validate state before transition
    if (cart.items.length === 0) {
      return "Cannot checkout with empty cart";
    }

    if (!user.address) {
      return "Please add a shipping address first";
    }

    // All validations passed
    setStage("checkout");
    return "Proceeding to checkout";
  }
});
```

---

## Summary

### Key Takeaways

1. **State Machine = Finite States + Explicit Transitions**
   - Only predefined stages exist
   - Transitions via `setStage()` calls
   - Conditional `available` prop controls what AI sees

2. **Generative UI = AI-Triggered Components**
   - AI chooses action name
   - Developer maps action → component
   - Component renders via `renderAndWaitForResponse`

3. **Three-Layer Architecture**
   - Layer 1: Global state + Context
   - Layer 2: Stage hooks (conditional)
   - Layer 3: UI orchestration + visualization

4. **AI Application**
   - AI sees only current stage's context/actions
   - AI makes decisions based on available tools
   - AI receives feedback via `respond()` function

5. **Bidirectional Communication**
   - Frontend → AI: `useCopilotReadable`, `useCopilotAction`
   - AI → Frontend: Action calls, state updates
   - UI → AI: `respond()` callbacks

### When to Use State Machines

✅ **Use State Machines For:**
- Multi-step workflows (onboarding, checkout)
- Complex forms requiring validation at each step
- Decision trees with branching logic
- Processes requiring strict ordering
- Flows needing human approval

❌ **Don't Use State Machines For:**
- Simple Q&A chatbots
- Single-step interactions
- Open-ended conversations
- Flexible, non-linear flows

### Best Practices

1. **Keep stages focused** - One clear purpose per stage
2. **Validate before transitions** - Ensure data completeness
3. **Provide clear instructions** - Help AI understand context
4. **Use meaningful names** - Action/stage names should be descriptive
5. **Handle edge cases** - Validate, provide fallbacks
6. **Test transitions** - Ensure all paths work correctly
7. **Visualize flow** - Use diagrams to understand complexity

### Next Steps

- Implement a simple 3-stage flow
- Add branching logic
- Create reusable Generative UI components
- Integrate with LangGraph for complex agents
- Add state persistence across sessions
