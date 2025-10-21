# CopilotKit Overview: Architecture, Use Cases, and API Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Core Concepts](#core-concepts)
3. [Architecture Overview](#architecture-overview)
4. [Common Use Cases](#common-use-cases)
5. [Control Flow and User Integration](#control-flow-and-user-integration)
6. [Common API Usage](#common-api-usage)
7. [Integration Endpoints](#integration-endpoints)

---

## Introduction

**CopilotKit** is an open-source framework for building AI assistants and agents directly into React applications. It provides production-ready UI components, seamless LLM integration, and powerful state management capabilities.

### Key Features

- **Quick Integration**: Production-ready UI components (chat, sidebar, textarea)
- **Built-in Security**: Safe interactions with user data
- **Context-Aware AI**: AI understands app state and can execute actions
- **Framework Support**: Integrates with LangGraph, Mastra, Agno, Pydantic AI
- **Real-time State Streaming**: Bidirectional sync between app and agent
- **Generative UI**: AI can trigger interactive React components

### Installation

```bash
npm install @copilotkit/react-core @copilotkit/react-ui
```

---

## Core Concepts

### 1. CoAgents (Agentic Copilots)

**CoAgents** are AI agents with full orchestration capabilities for complex, multi-step workflows.

**Capabilities:**
- Precise state management across agent interactions
- Sophisticated multi-step reasoning
- Seamless orchestration of multiple AI tools
- Interactive human-AI collaboration
- Real-time state updates and progress streaming

**When to Use CoAgents:**
- Multi-step workflows (onboarding, checkout, complex forms)
- Applications requiring tight control over agent behavior
- Scenarios needing human approval at checkpoints
- Complex decision trees with branching logic

### 2. Core Packages

```typescript
// Essential packages
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
```

**Package Breakdown:**
- **`@copilotkit/react-core`**: Core functionality and hooks
- **`@copilotkit/react-ui`**: Pre-built UI components
- **`@copilotkit/runtime`**: Backend runtime for LLM interactions
- **`@copilotkit/runtime-client-gql`**: GraphQL client for runtime communication

### 3. Essential Hooks

#### `useCopilotAction`
Define custom actions the AI can execute.

```typescript
import { useCopilotAction } from "@copilotkit/react-core";

useCopilotAction({
  name: "updateUserProfile",
  description: "Update the user's profile information",
  parameters: [
    { name: "name", type: "string", required: true },
    { name: "email", type: "string", required: true }
  ],
  handler: async ({ name, email }) => {
    await updateProfile({ name, email });
    return "Profile updated successfully";
  }
});
```

#### `useCopilotReadable`
Expose app state to the AI.

```typescript
import { useCopilotReadable } from "@copilotkit/react-core";

useCopilotReadable({
  description: "User's current shopping cart",
  value: shoppingCart,
});
```

#### `useCoAgent`
Manage agent state (for CoAgents with LangGraph/Mastra/etc).

```typescript
import { useCoAgent } from "@copilotkit/react-core";

const { state, setState, run } = useCoAgent<AgentState>({
  name: "travel_agent",
  initialState: { destination: "", trips: [] }
});
```

#### `useCoAgentStateRender`
Render agent state in the UI.

```typescript
import { useCoAgentStateRender } from "@copilotkit/react-core";

useCoAgentStateRender<AgentState>({
  name: "research_agent",
  render: ({ state }) => (
    <div>
      {state.searches?.map((search, idx) => (
        <div key={idx}>
          {search.done ? "✅" : "⏳"} {search.query}
        </div>
      ))}
    </div>
  )
});
```

#### `useCopilotChatSuggestions`
Generate contextual suggestions.

```typescript
import { useCopilotChatSuggestions } from "@copilotkit/react-core";

useCopilotChatSuggestions({
  instructions: "Suggest helpful next steps based on current page",
  minSuggestions: 2,
  maxSuggestions: 4
});
```

### 4. Integration Frameworks

CopilotKit integrates with multiple agent frameworks:

| Framework | Language | Use Case |
|-----------|----------|----------|
| **LangGraph** | Python/TypeScript | Complex agent workflows, state machines |
| **Mastra** | TypeScript | Mastra agent integration |
| **Agno** | TypeScript | Agno agent orchestration |
| **Pydantic AI** | Python | Type-safe Python agents |
| **Direct-to-LLM** | TypeScript | Simple implementations without frameworks |

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Application                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              CopilotKit Provider                       │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │         Application Components                   │  │ │
│  │  │  - useCopilotAction() hooks                     │  │ │
│  │  │  - useCopilotReadable() hooks                   │  │ │
│  │  │  - useCoAgent() hooks                           │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │         CopilotChat Component                    │  │ │
│  │  │  - Message display                               │  │ │
│  │  │  - User input                                    │  │ │
│  │  │  - Generative UI rendering                       │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────┬───────────────────────────────────────┘
                      │ WebSocket/HTTP
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              CopilotKit Runtime (Backend)                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           LLM Integration Layer                        │ │
│  │  - OpenAI, Anthropic, Google, etc.                    │ │
│  │  - Context assembly                                   │ │
│  │  - Action/tool binding                                │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │        Agent Framework Integration                     │ │
│  │  - LangGraph graphs                                   │ │
│  │  - Mastra/Agno agents                                 │ │
│  │  - State persistence                                  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Input** → CopilotChat component
2. **Message Sent** → CopilotKit Runtime via API
3. **Context Gathering** → Runtime collects:
   - System instructions
   - Readable context (useCopilotReadable)
   - Available actions (useCopilotAction)
   - Agent state (useCoAgent)
4. **LLM Invocation** → Runtime sends to LLM with context
5. **Response Processing** → Runtime parses LLM response:
   - Text response → Display in chat
   - Action call → Execute handler
   - State update → Stream to frontend
6. **UI Update** → React components re-render with new state

---

## Common Use Cases

### Use Case 1: Basic Chat Assistant

**Scenario**: Add an AI assistant to help users navigate your app.

```typescript
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

function App() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <YourApp />
      <CopilotChat
        instructions="You are a helpful assistant for our e-commerce platform."
        labels={{
          title: "Shopping Assistant",
          initial: "Hi! How can I help you today?"
        }}
      />
    </CopilotKit>
  );
}
```

### Use Case 2: Context-Aware Assistant

**Scenario**: AI needs to know about current page/state.

```typescript
function ProductPage({ product }) {
  // Expose product data to AI
  useCopilotReadable({
    description: "Currently viewed product",
    value: product
  });

  // Allow AI to add to cart
  useCopilotAction({
    name: "addToCart",
    description: "Add the current product to cart",
    parameters: [
      { name: "quantity", type: "number", required: true }
    ],
    handler: async ({ quantity }) => {
      await addToCart(product.id, quantity);
      return `Added ${quantity} ${product.name} to cart`;
    }
  });

  return <div>...</div>;
}
```

### Use Case 3: Multi-Step Workflow (State Machine)

**Scenario**: Guide users through onboarding, checkout, or complex forms.

```typescript
function OnboardingFlow() {
  const [step, setStep] = useState("welcome");

  // Step 1: Welcome
  useCopilotAction({
    name: "startOnboarding",
    description: "Begin the onboarding process",
    available: step === "welcome" ? "enabled" : "disabled",
    handler: () => setStep("profile")
  });

  // Step 2: Profile
  useCopilotAction({
    name: "saveProfile",
    description: "Save user profile information",
    available: step === "profile" ? "enabled" : "disabled",
    parameters: [
      { name: "name", type: "string" },
      { name: "company", type: "string" }
    ],
    handler: ({ name, company }) => {
      saveProfile({ name, company });
      setStep("preferences");
    }
  });

  // Step 3: Preferences
  useCopilotAction({
    name: "savePreferences",
    description: "Save user preferences",
    available: step === "preferences" ? "enabled" : "disabled",
    handler: ({ preferences }) => {
      savePreferences(preferences);
      setStep("complete");
    }
  });

  return <CopilotChat instructions={getInstructions(step)} />;
}
```

### Use Case 4: Agent-Powered Application (LangGraph)

**Scenario**: Complex research or data processing workflow.

**Backend (Python):**
```python
from langgraph.graph import StateGraph, START, END
from copilotkit import CopilotKitState
from copilotkit.langgraph import copilotkit_emit_state

class ResearchState(CopilotKitState):
    query: str
    sources: list[dict]
    report: str

async def research_node(state: ResearchState, config):
    # Perform research
    sources = await search_web(state.query)

    # Emit progress to frontend
    await copilotkit_emit_state(config, {
        "sources": sources
    })

    # Generate report
    report = await generate_report(sources)

    return {
        "sources": sources,
        "report": report
    }

# Build graph
builder = StateGraph(ResearchState)
builder.add_node("research", research_node)
builder.add_edge(START, "research")
builder.add_edge("research", END)
graph = builder.compile()
```

**Frontend (React):**
```typescript
function ResearchApp() {
  const { state } = useCoAgent<ResearchState>({
    name: "research_agent",
    initialState: { query: "", sources: [], report: "" }
  });

  // Render agent state in real-time
  useCoAgentStateRender({
    name: "research_agent",
    render: ({ state }) => (
      <div>
        <h3>Research Progress</h3>
        <div>Sources found: {state.sources?.length || 0}</div>
        {state.sources?.map((source, idx) => (
          <div key={idx}>{source.title}</div>
        ))}
      </div>
    )
  });

  return <CopilotChat instructions="Help user conduct research" />;
}
```

---

## Control Flow and User Integration

### Request Flow Diagram

```
User types message
       │
       ▼
┌─────────────────┐
│  CopilotChat    │
│  Component      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ useCopilotChat  │
│ hook            │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ CopilotKit Context                      │
│ - Gather all useCopilotReadable values  │
│ - Gather all useCopilotAction defs      │
│ - Gather agent state from useCoAgent    │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Send to Runtime API                     │
│ POST /api/copilotkit                    │
│ {                                       │
│   messages: [...],                      │
│   context: {...},                       │
│   actions: [...],                       │
│   agentName: "...",                     │
│ }                                       │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ CopilotKit Runtime (Backend)            │
│ 1. Parse request                        │
│ 2. Build LLM context                    │
│ 3. Invoke LLM with tools                │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ LLM Response                            │
│ - Text message OR                       │
│ - Tool/action call OR                   │
│ - State update                          │
└────────┬────────────────────────────────┘
         │
    ┌────┴─────┐
    │          │
    ▼          ▼
┌────────┐ ┌──────────────┐
│ Text   │ │ Action Call  │
│ Reply  │ │              │
└───┬────┘ └──────┬───────┘
    │             │
    │             ▼
    │      ┌──────────────────────┐
    │      │ Execute handler      │
    │      │ OR                   │
    │      │ renderAndWait...     │
    │      └──────┬───────────────┘
    │             │
    │             ▼
    │      ┌──────────────────────┐
    │      │ Render UI component  │
    │      │ Wait for user input  │
    │      └──────┬───────────────┘
    │             │
    └─────────────┴─────────────┐
                                │
                                ▼
                    ┌─────────────────────┐
                    │ Update UI           │
                    │ - Show message      │
                    │ - Render component  │
                    │ - Update state      │
                    └─────────────────────┘
```

### Integration Points

#### 1. Provider Setup

```typescript
// app/layout.tsx
import { CopilotKit } from "@copilotkit/react-core";

export default function RootLayout({ children }) {
  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      publicApiKey={process.env.NEXT_PUBLIC_CPK_PUBLIC_API_KEY}
    >
      {children}
    </CopilotKit>
  );
}
```

#### 2. Backend Endpoint (Next.js)

```typescript
// app/api/copilotkit/route.ts
import { CopilotRuntime, OpenAIAdapter } from "@copilotkit/runtime";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const runtime = new CopilotRuntime();

  const { handleRequest } = runtime.streamHttpServerResponse({
    request: req,
    runtime: new OpenAIAdapter({
      model: "gpt-4"
    })
  });

  return handleRequest();
}
```

#### 3. LangGraph Integration (Python)

```python
# agent.py
from fastapi import FastAPI
from copilotkit import LangGraphAGUIAgent
from ag_ui_langgraph import add_langgraph_fastapi_endpoint

app = FastAPI()

add_langgraph_fastapi_endpoint(
    app=app,
    agent=LangGraphAGUIAgent(
        name="research_agent",
        description="Research assistant",
        graph=graph,
    ),
    path="/agent/research"
)
```

---

## Common API Usage

### 1. Basic Action Definition

```typescript
useCopilotAction({
  name: "searchProducts",
  description: "Search for products in the catalog",
  parameters: [
    {
      name: "query",
      type: "string",
      description: "Search query",
      required: true
    },
    {
      name: "category",
      type: "string",
      description: "Product category filter",
      required: false
    }
  ],
  handler: async ({ query, category }) => {
    const results = await searchAPI(query, category);
    return `Found ${results.length} products`;
  }
});
```

### 2. Generative UI with Human-in-the-Loop

```typescript
useCopilotAction({
  name: "confirmPurchase",
  description: "Confirm purchase with user",
  parameters: [
    { name: "items", type: "array" },
    { name: "total", type: "number" }
  ],
  renderAndWaitForResponse: ({ args, status, respond }) => {
    return (
      <PurchaseConfirmation
        items={args.items}
        total={args.total}
        onConfirm={() => {
          processPurchase(args.items);
          respond?.("User confirmed purchase");
        }}
        onCancel={() => {
          respond?.("User cancelled purchase");
        }}
      />
    );
  }
});
```

### 3. Conditional Actions (State Machine)

```typescript
const [stage, setStage] = useState<"select" | "confirm" | "complete">("select");

// Only available in "select" stage
useCopilotAction({
  name: "selectProduct",
  available: stage === "select" ? "enabled" : "disabled",
  handler: ({ productId }) => {
    setSelectedProduct(productId);
    setStage("confirm");
  }
}, [stage]);

// Only available in "confirm" stage
useCopilotAction({
  name: "confirmSelection",
  available: stage === "confirm" ? "enabled" : "disabled",
  handler: () => {
    processOrder();
    setStage("complete");
  }
}, [stage]);
```

### 4. Complex Object Parameters

```typescript
useCopilotAction({
  name: "updateUserProfile",
  parameters: [
    {
      name: "profile",
      type: "object",
      description: "User profile data",
      attributes: [
        { name: "name", type: "string", required: true },
        { name: "email", type: "string", required: true },
        {
          name: "address",
          type: "object",
          attributes: [
            { name: "street", type: "string" },
            { name: "city", type: "string" },
            { name: "zipCode", type: "string" }
          ]
        }
      ]
    }
  ],
  handler: async ({ profile }) => {
    await updateProfile(profile);
    return "Profile updated";
  }
});
```

### 5. State Updates and Streaming

**Frontend:**
```typescript
const { state, setState } = useCoAgent<TravelState>({
  name: "travel_agent",
  initialState: {
    destination: "",
    trips: []
  }
});

// Update state from UI
const updateDestination = (dest: string) => {
  setState({ destination: dest });
};

// Render state updates
useCoAgentStateRender({
  name: "travel_agent",
  render: ({ state }) => (
    <div>
      <h3>Destination: {state.destination}</h3>
      <div>Trips: {state.trips?.length || 0}</div>
    </div>
  )
});
```

**Backend (Python):**
```python
from copilotkit.langgraph import copilotkit_emit_state

async def plan_trips_node(state: TravelState, config):
    # Update state incrementally
    for i in range(3):
        trip = await generate_trip(state.destination, i)
        state["trips"].append(trip)

        # Stream state update to frontend
        await copilotkit_emit_state(config, state)

    return state
```

### 6. Custom Instructions per Context

```typescript
const [activeTab, setActiveTab] = useState("products");

useCopilotAdditionalInstructions({
  instructions: activeTab === "products"
    ? "Help user browse and search products"
    : "Help user manage their shopping cart",
  available: "enabled"
}, [activeTab]);
```

---

## Integration Endpoints

### Cloud Integration (Managed)

**Use CopilotKit Cloud for hosted infrastructure:**

```typescript
import { CopilotKit } from "@copilotkit/react-core";

<CopilotKit
  publicApiKey={process.env.NEXT_PUBLIC_CPK_PUBLIC_API_KEY}
  // No runtimeUrl needed - uses CopilotKit Cloud
>
  <App />
</CopilotKit>
```

**Get API key**: https://cloud.copilotkit.ai

### Self-Hosted Runtime

**Next.js API Route:**

```typescript
// app/api/copilotkit/route.ts
import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import OpenAI from "openai";
import { NextRequest } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const copilotKit = new CopilotRuntime();

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime: copilotKit,
    serviceAdapter: new OpenAIAdapter({ openai }),
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
```

**Express.js:**

```typescript
import express from "express";
import { CopilotRuntime, OpenAIAdapter } from "@copilotkit/runtime";

const app = express();
const runtime = new CopilotRuntime();

app.post("/api/copilotkit", async (req, res) => {
  const { handleRequest } = runtime.streamHttpServerResponse({
    request: req,
    runtime: new OpenAIAdapter({ model: "gpt-4" })
  });

  return handleRequest();
});

app.listen(3000);
```

**LangGraph Agent Endpoint:**

```python
from fastapi import FastAPI
from copilotkit import LangGraphAGUIAgent
from ag_ui_langgraph import add_langgraph_fastapi_endpoint
from your_agent import graph

app = FastAPI()

add_langgraph_fastapi_endpoint(
    app=app,
    agent=LangGraphAGUIAgent(
        name="your_agent",
        description="Agent description",
        graph=graph,
    ),
    path="/agent/your_agent"
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

**Frontend Configuration:**

```typescript
<CopilotKit runtimeUrl="http://localhost:8000/agent/your_agent">
  <App />
</CopilotKit>
```

---

## Summary

### Key Takeaways

1. **CopilotKit = React UI + Agent Infrastructure** for building in-app AI assistants
2. **Core hooks** (`useCopilotAction`, `useCopilotReadable`, `useCoAgent`) provide the API surface
3. **Flexible integration** with LangGraph, Mastra, Agno, Pydantic AI, or direct LLM calls
4. **State management** is bidirectional - app ↔ agent sync
5. **Generative UI** via `renderAndWaitForResponse` enables Human-in-the-Loop workflows
6. **Conditional availability** enables state machine patterns

### Next Steps

- **Basic Integration**: Start with `CopilotChat` + `useCopilotAction`
- **Add Context**: Use `useCopilotReadable` to expose app state
- **Complex Workflows**: Implement state machines with conditional actions
- **Agent Integration**: Connect LangGraph/Mastra agents for advanced orchestration
- **Generative UI**: Add interactive components with `renderAndWaitForResponse`

### Resources

- **Documentation**: https://docs.copilotkit.ai
- **CopilotKit Cloud**: https://cloud.copilotkit.ai
- **GitHub**: https://github.com/CopilotKit/CopilotKit
- **Examples**: https://github.com/CopilotKit/CopilotKit/tree/main/examples
