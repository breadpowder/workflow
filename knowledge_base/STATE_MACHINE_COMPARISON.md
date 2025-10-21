# State Machine Implementation: Vercel AI SDK vs CopilotKit

## Executive Summary

This document provides a comprehensive comparison of state machine implementations for multi-step workflows with AI chat interfaces. It covers **manual** implementation using Vercel AI SDK and **native** implementation using CopilotKit, with complete working examples for both approaches.

---

## Table of Contents

1. [Definitions: Manual vs Native](#definitions-manual-vs-native)
2. [Vercel AI SDK: Manual State Machine](#vercel-ai-sdk-manual-state-machine)
3. [CopilotKit: Native State Machine](#copilotkit-native-state-machine)
4. [Side-by-Side Comparison](#side-by-side-comparison)
5. [Complete Working Examples](#complete-working-examples)
6. [Pros and Cons](#pros-and-cons)
7. [Decision Guide](#decision-guide)

---

## Definitions: Manual vs Native

### Manual State Machine Implementation

**Definition**: Building a state machine from scratch using basic primitives provided by the framework. You implement all state management logic, transitions, and conditional behavior yourself.

**Key Characteristics**:
- **State tracking**: You manage the current state/stage using React state (`useState`)
- **Transition logic**: You write explicit code to move between states
- **Conditional rendering**: You manually check the current state and render appropriate UI
- **Tool availability**: You control which AI tools are available based on state
- **No framework support**: The framework doesn't know about your state machine pattern

**Example flow**:
```typescript
const [stage, setStage] = useState('welcome');

// Manually check state and conditionally render
if (stage === 'welcome') {
  // Show welcome UI and enable welcome tools
} else if (stage === 'collectInfo') {
  // Show info collection UI and enable collection tools
}

// Manually transition
function moveToNextStage() {
  setStage('collectInfo');
}
```

### Native State Machine Implementation

**Definition**: Using framework-provided features specifically designed to support state machine patterns. The framework understands your state machine and provides specialized APIs for it.

**Key Characteristics**:
- **Declarative stages**: You declare stages and their properties
- **Built-in availability control**: Framework-level support for enabling/disabling features per stage
- **Automatic management**: Framework handles state-aware behavior automatically
- **Stage hooks**: Specialized hooks that encapsulate stage logic
- **First-class support**: The framework is designed with state machines in mind

**Example flow**:
```typescript
// Framework provides availability control per stage
useCopilotAction({
  name: "collectInfo",
  available: stage === "collectInfo" ? "enabled" : "disabled",
  handler: () => setStage("review")
});

// Each stage is a self-contained hook with its own instructions and tools
function useStageCollectInfo() {
  useCopilotAdditionalInstructions({
    instructions: "Collect user information",
    available: stage === "collectInfo" ? "enabled" : "disabled"
  });
}
```

---

## Vercel AI SDK: Manual State Machine

### Overview

Vercel AI SDK provides powerful streaming and generative UI primitives but **does not have native state machine support**. You must build state management from scratch using React state and conditional logic.

### Core Concepts

1. **streamUI**: Server action that streams React components
2. **createStreamableUI**: Manual control over UI streaming
3. **createAI**: Setup AI context with actions
4. **State management**: Pure React (`useState`, context)
5. **Conditional logic**: Manual checks throughout code

### Architecture Pattern

```
┌─────────────────────────────────────────────────────┐
│              Manual State Machine                    │
│                                                      │
│  ┌────────────────────────────────────────────┐   │
│  │         React State (useState)              │   │
│  │    stage: "welcome" | "info" | "review"     │   │
│  └────────────────────────────────────────────┘   │
│                      ↓                              │
│  ┌────────────────────────────────────────────┐   │
│  │    Manual Conditional Checks               │   │
│  │    if (stage === "welcome") { ... }        │   │
│  │    if (stage === "info") { ... }           │   │
│  └────────────────────────────────────────────┘   │
│                      ↓                              │
│  ┌────────────────────────────────────────────┐   │
│  │    streamUI with Conditional Tools         │   │
│  │    tools: stage === "info" ? {...} : null  │   │
│  └────────────────────────────────────────────┘   │
│                      ↓                              │
│  ┌────────────────────────────────────────────┐   │
│  │    Manual State Transitions                │   │
│  │    setStage("nextStage")                   │   │
│  └────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Implementation Steps

#### Step 1: Define State Types

```typescript
// types.ts
export type OnboardingStage =
  | "welcome"
  | "collectInfo"
  | "preferences"
  | "confirmation"
  | "complete";

export interface UserInfo {
  name: string;
  email: string;
  phone?: string;
}

export interface UserPreferences {
  theme: "light" | "dark";
  notifications: boolean;
  newsletter: boolean;
}

export interface OnboardingState {
  stage: OnboardingStage;
  userInfo: UserInfo | null;
  preferences: UserPreferences | null;
}
```

#### Step 2: Create State Context

```typescript
// context.tsx
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface OnboardingContextType {
  stage: OnboardingStage;
  setStage: (stage: OnboardingStage) => void;
  userInfo: UserInfo | null;
  setUserInfo: (info: UserInfo) => void;
  preferences: UserPreferences | null;
  setPreferences: (prefs: UserPreferences) => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<OnboardingStage>("welcome");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  return (
    <OnboardingContext.Provider
      value={{
        stage,
        setStage,
        userInfo,
        setUserInfo,
        preferences,
        setPreferences,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}
```

#### Step 3: Create Server Actions with Manual State Checks

```typescript
// actions.tsx
'use server';

import { streamUI } from '@ai-sdk/rsc';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { ReactNode } from 'react';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  display: ReactNode;
}

export async function continueConversation(
  messages: Message[],
  stage: OnboardingStage,
  context: OnboardingState
): Promise<UIMessage> {
  'use server';

  // MANUAL: Build system prompt based on current stage
  let systemPrompt = 'You are a helpful onboarding assistant.';

  // MANUAL: Conditional logic for each stage
  if (stage === 'welcome') {
    systemPrompt += ' Welcome the user and explain the onboarding process. Tell them you will collect their information.';
  } else if (stage === 'collectInfo') {
    systemPrompt += ' Collect the user\'s name, email, and optionally phone number. Be friendly and explain why you need this information.';
  } else if (stage === 'preferences') {
    systemPrompt += ' Ask about their preferences for theme (light/dark), notifications, and newsletter subscription.';
  } else if (stage === 'confirmation') {
    systemPrompt += ' Show a summary of their information and preferences. Ask them to confirm everything is correct.';
  } else if (stage === 'complete') {
    systemPrompt += ' Thank them for completing onboarding and explain what happens next.';
  }

  // MANUAL: Conditionally define tools based on stage
  const tools: any = {};

  if (stage === 'collectInfo') {
    tools.submitUserInfo = {
      description: 'Submit user information (name, email, phone)',
      inputSchema: z.object({
        name: z.string().describe('User full name'),
        email: z.string().email().describe('User email address'),
        phone: z.string().optional().describe('User phone number (optional)'),
      }),
      generate: async function* ({ name, email, phone }) {
        yield <div className="p-4 bg-blue-50 rounded">Saving your information...</div>;
        await new Promise(resolve => setTimeout(resolve, 1000));
        return (
          <div className="p-4 bg-green-50 rounded border border-green-200">
            <h3 className="font-bold text-green-800">Information Saved!</h3>
            <p className="text-green-700">Name: {name}</p>
            <p className="text-green-700">Email: {email}</p>
            {phone && <p className="text-green-700">Phone: {phone}</p>}
          </div>
        );
      },
    };
  }

  if (stage === 'preferences') {
    tools.submitPreferences = {
      description: 'Submit user preferences (theme, notifications, newsletter)',
      inputSchema: z.object({
        theme: z.enum(['light', 'dark']).describe('UI theme preference'),
        notifications: z.boolean().describe('Enable notifications'),
        newsletter: z.boolean().describe('Subscribe to newsletter'),
      }),
      generate: async function* ({ theme, notifications, newsletter }) {
        yield <div className="p-4 bg-blue-50 rounded">Saving preferences...</div>;
        await new Promise(resolve => setTimeout(resolve, 1000));
        return (
          <div className="p-4 bg-green-50 rounded border border-green-200">
            <h3 className="font-bold text-green-800">Preferences Saved!</h3>
            <p className="text-green-700">Theme: {theme}</p>
            <p className="text-green-700">Notifications: {notifications ? 'Enabled' : 'Disabled'}</p>
            <p className="text-green-700">Newsletter: {newsletter ? 'Subscribed' : 'Not subscribed'}</p>
          </div>
        );
      },
    };
  }

  if (stage === 'confirmation') {
    tools.confirmOnboarding = {
      description: 'Confirm all onboarding information is correct',
      inputSchema: z.object({
        confirmed: z.boolean().describe('User confirmed everything is correct'),
      }),
      generate: async function* ({ confirmed }) {
        if (confirmed) {
          yield <div className="p-4 bg-blue-50 rounded">Finalizing onboarding...</div>;
          await new Promise(resolve => setTimeout(resolve, 1500));
          return (
            <div className="p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border-2 border-green-300">
              <h2 className="text-2xl font-bold text-green-800 mb-2">🎉 Onboarding Complete!</h2>
              <p className="text-gray-700">Welcome aboard! You're all set to get started.</p>
            </div>
          );
        } else {
          return (
            <div className="p-4 bg-yellow-50 rounded border border-yellow-200">
              <p className="text-yellow-800">Let's review your information again.</p>
            </div>
          );
        }
      },
    };
  }

  const result = await streamUI({
    model: openai('gpt-4o'),
    system: systemPrompt,
    messages,
    text: ({ content }) => <div className="prose">{content}</div>,
    tools: Object.keys(tools).length > 0 ? tools : undefined,
  });

  return {
    id: Date.now().toString(),
    role: 'assistant',
    display: result.value,
  };
}
```

#### Step 4: Create Client Component with Manual Transitions

```typescript
// onboarding-chat.tsx
'use client';

import { useState } from 'react';
import { useOnboarding } from './context';
import { continueConversation, Message, UIMessage } from './actions';

export function OnboardingChat() {
  const { stage, setStage, userInfo, setUserInfo, preferences, setPreferences } = useOnboarding();
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: UIMessage = {
      id: Date.now().toString(),
      role: 'user',
      display: <div className="text-gray-800">{input}</div>,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // MANUAL: Pass current state to server action
      const response = await continueConversation(
        [...messages.map(m => ({ role: m.role, content: String(m.display) })),
         { role: 'user', content: input }],
        stage,
        { stage, userInfo, preferences }
      );

      setMessages(prev => [...prev, response]);

      // MANUAL: Determine if we should transition stages
      // This logic must be duplicated here or passed from server
      const lowerInput = input.toLowerCase();

      if (stage === 'welcome' && (lowerInput.includes('yes') || lowerInput.includes('start') || lowerInput.includes('begin'))) {
        setTimeout(() => setStage('collectInfo'), 1000);
      } else if (stage === 'collectInfo' && userInfo !== null) {
        setTimeout(() => setStage('preferences'), 1000);
      } else if (stage === 'preferences' && preferences !== null) {
        setTimeout(() => setStage('confirmation'), 1000);
      } else if (stage === 'confirmation') {
        setTimeout(() => setStage('complete'), 1000);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Stage Indicator - MANUAL */}
      <div className="bg-gray-100 p-4 border-b">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Current Stage:</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            stage === 'welcome' ? 'bg-blue-100 text-blue-800' :
            stage === 'collectInfo' ? 'bg-purple-100 text-purple-800' :
            stage === 'preferences' ? 'bg-orange-100 text-orange-800' :
            stage === 'confirmation' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            {stage}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] rounded-lg p-4 ${
              message.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {message.display}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading || stage === 'complete'}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || stage === 'complete'}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
```

#### Step 5: Main Page Component

```typescript
// page.tsx
'use client';

import { OnboardingProvider } from './context';
import { OnboardingChat } from './onboarding-chat';

export default function OnboardingPage() {
  return (
    <OnboardingProvider>
      <div className="h-screen flex flex-col">
        <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <h1 className="text-3xl font-bold">User Onboarding</h1>
          <p className="text-blue-100 mt-2">Let's get you set up with your account</p>
        </header>
        <main className="flex-1 overflow-hidden">
          <OnboardingChat />
        </main>
      </div>
    </OnboardingProvider>
  );
}
```

### Key Challenges with Manual Implementation

1. **Repetitive conditional logic**: Must check `stage === "X"` throughout code
2. **State synchronization**: Must manually sync state between client and server
3. **Tool management**: Must manually include/exclude tools based on stage
4. **Transition logic**: Must implement transition rules in multiple places
5. **Debugging complexity**: Hard to trace state flow through application
6. **Maintenance burden**: Changes to state machine require updates in many files

---

## CopilotKit: Native State Machine

### Overview

CopilotKit provides **first-class support for state machines** through its availability control system. The framework is designed with multi-stage workflows in mind.

### Core Concepts

1. **useCopilotAction**: Define actions with `available` prop for stage control
2. **useCopilotReadable**: Provide context with `available` prop for stage control
3. **useCopilotAdditionalInstructions**: Add stage-specific instructions
4. **Stage hooks**: Each stage is a self-contained hook
5. **Declarative availability**: Framework handles conditional logic

### Architecture Pattern

```
┌─────────────────────────────────────────────────────┐
│           Native State Machine (CopilotKit)         │
│                                                      │
│  ┌────────────────────────────────────────────┐   │
│  │         React State (useState)              │   │
│  │    stage: "welcome" | "info" | "review"     │   │
│  └────────────────────────────────────────────┘   │
│                      ↓                              │
│  ┌────────────────────────────────────────────┐   │
│  │        Stage Hook (useStageWelcome)        │   │
│  │  useCopilotAdditionalInstructions({        │   │
│  │    available: stage === "welcome"          │   │
│  │  })                                         │   │
│  └────────────────────────────────────────────┘   │
│                      ↓                              │
│  ┌────────────────────────────────────────────┐   │
│  │     Stage Hook (useStageCollectInfo)       │   │
│  │  useCopilotAction({                        │   │
│  │    available: stage === "collectInfo"      │   │
│  │    handler: () => setStage("review")       │   │
│  │  })                                         │   │
│  └────────────────────────────────────────────┘   │
│                      ↓                              │
│  │  Framework automatically manages            │   │
│  │  - Tool availability                        │   │
│  │  - Context visibility                       │   │
│  │  - Instructions per stage                   │   │
│  └────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Implementation Steps

#### Step 1: Define Global State Context (Same as Manual)

```typescript
// lib/stages/use-global-state.tsx
'use client';

import { createContext, useContext, ReactNode, useState } from "react";
import { useCopilotReadable } from "@copilotkit/react-core";

export type Stage =
  | "welcome"
  | "collectInfo"
  | "preferences"
  | "confirmation"
  | "complete";

interface UserInfo {
  name: string;
  email: string;
  phone?: string;
}

interface UserPreferences {
  theme: "light" | "dark";
  notifications: boolean;
  newsletter: boolean;
}

interface GlobalState {
  stage: Stage;
  setStage: React.Dispatch<React.SetStateAction<Stage>>;
  userInfo: UserInfo | null;
  setUserInfo: React.Dispatch<React.SetStateAction<UserInfo | null>>;
  preferences: UserPreferences | null;
  setPreferences: React.Dispatch<React.SetStateAction<UserPreferences | null>>;
}

export const GlobalStateContext = createContext<GlobalState | null>(null);

export function useGlobalState() {
  const context = useContext(GlobalStateContext);
  if (!context) {
    throw new Error("useGlobalState must be used within GlobalStateProvider");
  }
  return context;
}

export function GlobalStateProvider({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<Stage>("welcome");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  // Make all state readable to the AI across all stages
  useCopilotReadable({
    description: "Current onboarding state",
    value: {
      currentStage: stage,
      userInfo,
      preferences,
    },
  });

  return (
    <GlobalStateContext.Provider
      value={{
        stage,
        setStage,
        userInfo,
        setUserInfo,
        preferences,
        setPreferences,
      }}
    >
      {children}
    </GlobalStateContext.Provider>
  );
}
```

#### Step 2: Define Stage Hooks (One per Stage)

```typescript
// lib/stages/use-stage-welcome.tsx
import { useCopilotAdditionalInstructions, useCopilotAction } from "@copilotkit/react-core";
import { useGlobalState } from "./use-global-state";

/**
 * useStageWelcome: Welcome stage that greets the user and explains onboarding
 */
export function useStageWelcome() {
  const { stage, setStage } = useGlobalState();

  // Stage-specific instructions - ONLY available in this stage
  useCopilotAdditionalInstructions(
    {
      instructions: `
        CURRENT STAGE: Welcome
        - Greet the user warmly
        - Explain that you'll be helping them through a quick onboarding process
        - Tell them you'll collect some basic information
        - Ask if they're ready to begin
        - When they say yes, call the 'startOnboarding' action
      `,
      available: stage === "welcome" ? "enabled" : "disabled",
    },
    [stage]
  );

  // Stage transition action
  useCopilotAction(
    {
      name: "startOnboarding",
      description: "Begin the onboarding process",
      available: stage === "welcome" ? "enabled" : "disabled",
      handler: async () => {
        setStage("collectInfo");
      },
    },
    [stage]
  );
}
```

```typescript
// lib/stages/use-stage-collect-info.tsx
import { useCopilotAdditionalInstructions, useCopilotAction } from "@copilotkit/react-core";
import { useGlobalState } from "./use-global-state";

/**
 * useStageCollectInfo: Collect user's basic information
 */
export function useStageCollectInfo() {
  const { stage, setStage, setUserInfo } = useGlobalState();

  useCopilotAdditionalInstructions(
    {
      instructions: `
        CURRENT STAGE: Collect Information
        - Ask for the user's full name
        - Ask for their email address
        - Optionally ask for their phone number (make it clear it's optional)
        - Be friendly and explain you need this to create their account
        - Once you have the information, call 'submitUserInfo'
      `,
      available: stage === "collectInfo" ? "enabled" : "disabled",
    },
    [stage]
  );

  useCopilotAction(
    {
      name: "submitUserInfo",
      description: "Submit user's basic information (name, email, optional phone)",
      available: stage === "collectInfo" ? "enabled" : "disabled",
      parameters: [
        { name: "name", type: "string", description: "User's full name", required: true },
        { name: "email", type: "string", description: "User's email address", required: true },
        { name: "phone", type: "string", description: "User's phone number (optional)", required: false },
      ],
      renderAndWaitForResponse: ({ args, status, respond }) => {
        if (status === "executing") {
          return (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-blue-800">Saving your information...</span>
              </div>
            </div>
          );
        }

        return (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
            <h3 className="font-bold text-gray-800">Please confirm your information:</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Name:</span> {args.name}</p>
              <p><span className="font-medium">Email:</span> {args.email}</p>
              {args.phone && <p><span className="font-medium">Phone:</span> {args.phone}</p>}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setUserInfo({
                    name: args.name as string,
                    email: args.email as string,
                    phone: args.phone as string | undefined,
                  });
                  respond?.("User confirmed their information. Move to preferences stage.");
                  setStage("preferences");
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Confirm
              </button>
              <button
                onClick={() => respond?.("User wants to re-enter information. Please ask again.")}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Edit
              </button>
            </div>
          </div>
        );
      },
    },
    [stage]
  );
}
```

```typescript
// lib/stages/use-stage-preferences.tsx
import { useCopilotAdditionalInstructions, useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { useGlobalState } from "./use-global-state";

/**
 * useStagePreferences: Collect user preferences
 */
export function useStagePreferences() {
  const { stage, setStage, setPreferences } = useGlobalState();

  useCopilotAdditionalInstructions(
    {
      instructions: `
        CURRENT STAGE: Preferences
        - Ask about their UI theme preference (light or dark)
        - Ask if they want to enable notifications
        - Ask if they want to subscribe to the newsletter
        - Explain what each preference means
        - Once you have all preferences, call 'submitPreferences'
      `,
      available: stage === "preferences" ? "enabled" : "disabled",
    },
    [stage]
  );

  // Provide additional context for this stage
  useCopilotReadable(
    {
      description: "Available preference options",
      value: {
        themes: ["light", "dark"],
        notificationInfo: "Notifications include important account updates and security alerts",
        newsletterInfo: "Newsletter includes product updates, tips, and special offers (sent weekly)",
      },
      available: stage === "preferences" ? "enabled" : "disabled",
    },
    [stage]
  );

  useCopilotAction(
    {
      name: "submitPreferences",
      description: "Submit user preferences for theme, notifications, and newsletter",
      available: stage === "preferences" ? "enabled" : "disabled",
      parameters: [
        {
          name: "theme",
          type: "string",
          description: "UI theme: 'light' or 'dark'",
          required: true
        },
        {
          name: "notifications",
          type: "boolean",
          description: "Enable notifications",
          required: true
        },
        {
          name: "newsletter",
          type: "boolean",
          description: "Subscribe to newsletter",
          required: true
        },
      ],
      renderAndWaitForResponse: ({ args, status, respond }) => {
        if (status === "executing") {
          return (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-blue-800">Saving your preferences...</span>
              </div>
            </div>
          );
        }

        return (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
            <h3 className="font-bold text-gray-800">Please confirm your preferences:</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">Theme:</span>
                <span className={`px-2 py-1 rounded ${
                  args.theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800 border'
                }`}>
                  {args.theme}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Notifications:</span>
                <span className={`px-2 py-1 rounded ${
                  args.notifications ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {args.notifications ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Newsletter:</span>
                <span className={`px-2 py-1 rounded ${
                  args.newsletter ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {args.newsletter ? 'Subscribed' : 'Not subscribed'}
                </span>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setPreferences({
                    theme: args.theme as "light" | "dark",
                    notifications: args.notifications as boolean,
                    newsletter: args.newsletter as boolean,
                  });
                  respond?.("User confirmed preferences. Move to confirmation stage.");
                  setStage("confirmation");
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Confirm
              </button>
              <button
                onClick={() => respond?.("User wants to change preferences. Please ask again.")}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Change
              </button>
            </div>
          </div>
        );
      },
    },
    [stage]
  );
}
```

```typescript
// lib/stages/use-stage-confirmation.tsx
import { useCopilotAdditionalInstructions, useCopilotAction } from "@copilotkit/react-core";
import { useGlobalState } from "./use-global-state";

/**
 * useStageConfirmation: Final confirmation before completing onboarding
 */
export function useStageConfirmation() {
  const { stage, setStage, userInfo, preferences } = useGlobalState();

  useCopilotAdditionalInstructions(
    {
      instructions: `
        CURRENT STAGE: Confirmation
        - Show a complete summary of all collected information and preferences
        - Ask the user to review everything carefully
        - Ask if everything looks correct
        - If they confirm, call 'confirmOnboarding' with confirmed: true
        - If they want to make changes, offer to go back to specific stages
      `,
      available: stage === "confirmation" ? "enabled" : "disabled",
    },
    [stage]
  );

  useCopilotAction(
    {
      name: "confirmOnboarding",
      description: "Confirm all onboarding information is correct",
      available: stage === "confirmation" ? "enabled" : "disabled",
      parameters: [
        {
          name: "confirmed",
          type: "boolean",
          description: "True if user confirms everything is correct",
          required: true
        },
      ],
      renderAndWaitForResponse: ({ args, status, respond }) => {
        if (args.confirmed) {
          if (status === "executing") {
            return (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-blue-800">Finalizing your onboarding...</span>
                </div>
              </div>
            );
          }

          return (
            <div className="p-6 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg border-2 border-green-300">
              <div className="text-center space-y-4">
                <div className="text-6xl">🎉</div>
                <h2 className="text-3xl font-bold text-green-800">Onboarding Complete!</h2>
                <p className="text-gray-700">
                  Welcome aboard! Your account is all set up and ready to go.
                </p>
                <button
                  onClick={() => {
                    respond?.("Onboarding completed successfully.");
                    setStage("complete");
                  }}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Get Started
                </button>
              </div>
            </div>
          );
        } else {
          return (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-yellow-800">Let's review your information. What would you like to change?</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    respond?.("User wants to change basic information.");
                    setStage("collectInfo");
                  }}
                  className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
                >
                  Change Info
                </button>
                <button
                  onClick={() => {
                    respond?.("User wants to change preferences.");
                    setStage("preferences");
                  }}
                  className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
                >
                  Change Preferences
                </button>
              </div>
            </div>
          );
        }
      },
    },
    [stage]
  );
}
```

```typescript
// lib/stages/use-stage-complete.tsx
import { useCopilotAdditionalInstructions } from "@copilotkit/react-core";
import { useGlobalState } from "./use-global-state";

/**
 * useStageComplete: Final stage after onboarding is done
 */
export function useStageComplete() {
  const { stage } = useGlobalState();

  useCopilotAdditionalInstructions(
    {
      instructions: `
        CURRENT STAGE: Complete
        - Congratulate the user on completing onboarding
        - Explain what they can do next
        - Offer to answer any questions they have about using the platform
        - Be helpful and encouraging
      `,
      available: stage === "complete" ? "enabled" : "disabled",
    },
    [stage]
  );
}
```

#### Step 3: Export All Stages

```typescript
// lib/stages/index.ts
export * from "./use-global-state";
export * from "./use-stage-welcome";
export * from "./use-stage-collect-info";
export * from "./use-stage-preferences";
export * from "./use-stage-confirmation";
export * from "./use-stage-complete";
```

#### Step 4: Create Chat Component

```typescript
// components/onboarding-chat.tsx
"use client";

import {
  useStageWelcome,
  useStageCollectInfo,
  useStagePreferences,
  useStageConfirmation,
  useStageComplete,
  useGlobalState,
} from "@/lib/stages";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { useEffect, useState } from "react";
import { useCopilotChat } from "@copilotkit/react-core";
import { TextMessage, MessageRole } from "@copilotkit/runtime-client-gql";

export function OnboardingChat() {
  const { stage } = useGlobalState();
  const { appendMessage, isLoading } = useCopilotChat();
  const [initialMessageSent, setInitialMessageSent] = useState(false);

  // Register all stage hooks - CopilotKit will manage availability
  useStageWelcome();
  useStageCollectInfo();
  useStagePreferences();
  useStageConfirmation();
  useStageComplete();

  // Send initial welcome message
  useEffect(() => {
    if (initialMessageSent || isLoading) return;

    setTimeout(() => {
      appendMessage(
        new TextMessage({
          content: "Hi! I'm here to help you get started. Welcome to the onboarding process!",
          role: MessageRole.Assistant,
        })
      );
      setInitialMessageSent(true);
    }, 500);
  }, [initialMessageSent, appendMessage, isLoading]);

  return (
    <div className="flex flex-col h-full">
      {/* Stage Indicator */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 border-b">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-700">Progress:</span>
            <div className="flex gap-1">
              {["welcome", "collectInfo", "preferences", "confirmation", "complete"].map((s, i) => (
                <div
                  key={s}
                  className={`w-12 h-2 rounded-full transition-all ${
                    stage === s
                      ? "bg-blue-600"
                      : i < ["welcome", "collectInfo", "preferences", "confirmation", "complete"].indexOf(stage)
                      ? "bg-green-500"
                      : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            stage === "welcome" ? "bg-blue-100 text-blue-800" :
            stage === "collectInfo" ? "bg-purple-100 text-purple-800" :
            stage === "preferences" ? "bg-orange-100 text-orange-800" :
            stage === "confirmation" ? "bg-yellow-100 text-yellow-800" :
            "bg-green-100 text-green-800"
          }`}>
            {stage === "collectInfo" ? "Collect Info" :
             stage === "preferences" ? "Preferences" :
             stage === "confirmation" ? "Confirmation" :
             stage.charAt(0).toUpperCase() + stage.slice(1)}
          </span>
        </div>
      </div>

      {/* CopilotChat component handles all messaging */}
      <div className="flex-1 overflow-hidden">
        <CopilotChat
          className="h-full"
          instructions={systemPrompt}
        />
      </div>
    </div>
  );
}

const systemPrompt = `
GOAL
You are helping a user complete their onboarding process. Guide them through each stage step-by-step.

BACKGROUND
You are powered by CopilotKit, an open-source framework for building AI-powered applications.

DETAILS
You will guide the user through multiple stages. Each stage has specific instructions and tools available.
Follow the stage-specific instructions carefully and use the provided tools at the appropriate times.

IMPORTANT RULES
- Never mention the word "stage" or "state" to the user
- Never mention "state machine" to the user
- Be friendly, clear, and helpful
- Explain why you need information when asking for it
- Always confirm information before moving forward
`;
```

#### Step 5: Main Page with CopilotKit Provider

```typescript
// app/page.tsx
"use client";

import { CopilotKit } from "@copilotkit/react-core";
import { GlobalStateProvider } from "@/lib/stages";
import { OnboardingChat } from "@/components/onboarding-chat";

export default function OnboardingPage() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <GlobalStateProvider>
        <div className="h-screen flex flex-col bg-gray-50">
          <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 shadow-lg">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-bold">User Onboarding</h1>
              <p className="text-blue-100 mt-2">Let's get you set up with your account</p>
            </div>
          </header>
          <main className="flex-1 overflow-hidden">
            <OnboardingChat />
          </main>
        </div>
      </GlobalStateProvider>
    </CopilotKit>
  );
}
```

#### Step 6: API Route for CopilotKit Runtime

```typescript
// app/api/copilotkit/route.ts
import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import OpenAI from "openai";
import { NextRequest } from "next/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const serviceAdapter = new OpenAIAdapter({ openai });
const runtime = new CopilotRuntime();

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
```

### Key Advantages of Native Implementation

1. **Declarative availability**: Use `available` prop instead of conditional logic
2. **Self-contained stages**: Each stage is a modular hook
3. **Automatic management**: Framework handles tool/context enabling/disabling
4. **Clear separation**: Stage logic is isolated and easy to maintain
5. **Type safety**: Framework provides TypeScript support
6. **Less boilerplate**: No need to manually check stage everywhere

---

## Side-by-Side Comparison

| Feature | Vercel AI SDK (Manual) | CopilotKit (Native) |
|---------|------------------------|---------------------|
| **State Machine Support** | ❌ Manual implementation required | ✅ Native support with `available` prop |
| **Stage Definition** | Conditional logic everywhere | Self-contained stage hooks |
| **Tool Availability** | Manual includes/excludes | Declarative `available` prop |
| **Context Sharing** | Manual state passing | `useCopilotReadable` with availability |
| **Instructions per Stage** | Concatenated strings with conditions | `useCopilotAdditionalInstructions` per stage |
| **Code Organization** | Scattered across components | Modular stage hooks |
| **Boilerplate** | High - many conditionals | Low - framework handles it |
| **Maintainability** | Complex - changes ripple | Simple - isolated stages |
| **Learning Curve** | Steep - must understand all parts | Moderate - clear patterns |
| **Debugging** | Difficult - trace through conditions | Easier - inspect stage hooks |
| **Type Safety** | Good - but manual setup | Excellent - framework provides types |
| **Testing** | Complex - mock entire flow | Simpler - test stage hooks individually |

### Code Comparison: Adding a New Stage

#### Vercel AI SDK (Manual)
```typescript
// Must update in 4+ places:

// 1. Type definition
export type OnboardingStage =
  | "welcome"
  | "collectInfo"
  | "newStage"  // ADD HERE
  | "preferences";

// 2. Server action system prompt
if (stage === 'newStage') {  // ADD HERE
  systemPrompt += ' Instructions for new stage...';
}

// 3. Server action tools
if (stage === 'newStage') {  // ADD HERE
  tools.newStageAction = {
    description: '...',
    // ...
  };
}

// 4. Client component transitions
if (stage === 'collectInfo' && someCondition) {
  setTimeout(() => setStage('newStage'), 1000);  // ADD HERE
}

// 5. Stage indicator UI
stage === 'newStage' ? 'bg-teal-100' : ''  // ADD HERE
```

#### CopilotKit (Native)
```typescript
// Just create one new file:

// lib/stages/use-stage-new.tsx
export function useStageNew() {
  const { stage, setStage } = useGlobalState();

  useCopilotAdditionalInstructions({
    instructions: "Instructions for new stage...",
    available: stage === "newStage" ? "enabled" : "disabled",
  }, [stage]);

  useCopilotAction({
    name: "newStageAction",
    description: "...",
    available: stage === "newStage" ? "enabled" : "disabled",
    handler: () => setStage("nextStage"),
  }, [stage]);
}

// Then just call it in your component:
useStageNew();  // ADD THIS ONE LINE
```

---

## Complete Working Examples

### Example Workflow: User Onboarding (3-5 Steps)

Both implementations support the same workflow:

```
┌──────────┐
│ Welcome  │ → Greet user, explain process
└────┬─────┘
     │ User says "yes" or "start"
     ▼
┌──────────┐
│Collect   │ → Get name, email, phone
│Info      │   User submits info
└────┬─────┘
     │ Info confirmed
     ▼
┌──────────┐
│Preferences│ → Get theme, notifications, newsletter
│          │   User confirms preferences
└────┬─────┘
     │ Preferences saved
     ▼
┌──────────┐
│Confirm-  │ → Show summary, ask for final confirmation
│ation     │   User confirms or goes back
└────┬─────┘
     │ Final confirmation
     ▼
┌──────────┐
│Complete  │ → Congratulate, explain next steps
└──────────┘
```

### Full File Structure Comparison

#### Vercel AI SDK
```
app/
├── page.tsx                    # Main page with provider
├── context.tsx                 # State context
├── actions.tsx                 # Server actions (large, complex)
├── onboarding-chat.tsx         # Chat component (complex transitions)
└── components/
    └── stage-indicator.tsx     # Manual stage visualization
```

#### CopilotKit
```
app/
├── page.tsx                    # Main page with CopilotKit
└── api/
    └── copilotkit/
        └── route.ts            # Runtime endpoint

lib/
└── stages/
    ├── index.ts                # Exports
    ├── use-global-state.tsx    # Global state with useCopilotReadable
    ├── use-stage-welcome.tsx   # Welcome stage (self-contained)
    ├── use-stage-collect-info.tsx  # Info collection stage
    ├── use-stage-preferences.tsx   # Preferences stage
    ├── use-stage-confirmation.tsx  # Confirmation stage
    └── use-stage-complete.tsx      # Complete stage

components/
└── onboarding-chat.tsx         # Simple chat wrapper
```

---

## Pros and Cons

### Vercel AI SDK (Manual) ✅ Pros

1. **Full control**: Complete control over every aspect of the state machine
2. **Flexibility**: Can implement any state machine pattern you want
3. **No framework lock-in**: Use any state management library
4. **Minimal dependencies**: Just React and Vercel AI SDK
5. **Customizable**: Easy to add custom logic not supported by frameworks
6. **Direct**: No abstraction layers between you and the AI SDK
7. **Educational**: Learn state machine patterns deeply

### Vercel AI SDK (Manual) ❌ Cons

1. **High boilerplate**: Must write conditional logic everywhere
2. **Repetitive code**: Same patterns repeated across files
3. **Hard to maintain**: Changes require updates in multiple places
4. **Error-prone**: Easy to forget to check stage somewhere
5. **Complex debugging**: Hard to trace state flow
6. **Steep learning curve**: Must understand entire system
7. **Testing complexity**: Must mock entire state machine
8. **Poor scalability**: Adding stages becomes increasingly difficult

### CopilotKit (Native) ✅ Pros

1. **Native support**: Framework designed for state machines
2. **Low boilerplate**: Declarative `available` prop
3. **Modular**: Self-contained stage hooks
4. **Easy to maintain**: Add/remove/modify stages easily
5. **Clear patterns**: Consistent structure across stages
6. **Good developer experience**: Intuitive API
7. **Type-safe**: Excellent TypeScript support
8. **Easy testing**: Test stage hooks individually
9. **Scalable**: Adding stages is straightforward
10. **Built-in features**: Automatic tool/context management

### CopilotKit (Native) ❌ Cons

1. **Framework dependency**: Tied to CopilotKit ecosystem
2. **Less flexibility**: Must work within framework patterns
3. **Learning curve**: Must learn CopilotKit-specific APIs
4. **Abstraction**: Additional layer between you and AI
5. **Opinionated**: Framework makes design decisions for you
6. **Documentation**: Smaller community than Vercel
7. **Debugging**: Must understand framework internals for complex issues

---

## Decision Guide

### Choose Vercel AI SDK (Manual) If:

✅ You need **maximum control** over state machine logic
✅ You have **complex, non-standard** state transitions
✅ You want to **minimize dependencies**
✅ You're building a **simple workflow** (2-3 stages)
✅ You need **custom state management** patterns
✅ You're already invested in Vercel ecosystem
✅ You want to **learn state machines** deeply

### Choose CopilotKit (Native) If:

✅ You're building **multi-stage workflows** (4+ stages)
✅ You want **fast development** with less boilerplate
✅ You prefer **declarative, modular** code
✅ You value **maintainability** and easy modifications
✅ You want **built-in state machine** features
✅ You're building **production applications** that will scale
✅ You want to focus on **business logic** over infrastructure
✅ You need **type-safe, well-tested** patterns

### Quick Decision Matrix

| Project Characteristics | Recommended Choice |
|------------------------|-------------------|
| 2-3 simple stages | Either (slight edge to Vercel for simplicity) |
| 4-6 moderate stages | **CopilotKit** (native support wins) |
| 7+ complex stages | **CopilotKit** (maintainability critical) |
| Need max control | **Vercel AI SDK** (manual control) |
| Fast prototyping | **CopilotKit** (less boilerplate) |
| Long-term maintenance | **CopilotKit** (modular architecture) |
| Small team | **CopilotKit** (clear patterns) |
| Learning focus | **Vercel AI SDK** (understand fundamentals) |

---

## Visual State Machine Diagram

### CopilotKit State Machine (From Example)

```
                    ┌─────────────────┐
                    │  getContactInfo │
                    │  (Stage 1)      │
                    └────────┬────────┘
                             │ User submits contact
                             │ setStage("buildCar")
                             ▼
                    ┌─────────────────┐
                    │    buildCar     │
                    │    (Stage 2)    │
                    └────────┬────────┘
                             │ User selects car
                             │ setStage("sellFinancing")
                             ▼
                    ┌─────────────────┐
                    │ sellFinancing   │
                    │   (Stage 3)     │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
         User wants financing   User declines
         setStage("getFinancingInfo") setStage("getPaymentInfo")
                    │                 │
                    ▼                 ▼
        ┌─────────────────┐  ┌─────────────────┐
        │getFinancingInfo │  │ getPaymentInfo  │
        │   (Stage 4a)    │  │   (Stage 4b)    │
        └────────┬────────┘  └────────┬────────┘
                 │                     │
                 └──────────┬──────────┘
                            │ Payment/Financing submitted
                            │ setStage("confirmOrder")
                            ▼
                   ┌─────────────────┐
                   │  confirmOrder   │
                   │   (Stage 5)     │
                   └────────┬────────┘
                            │
                   ┌────────┴────────┐
                   │                 │
            User confirms       User cancels
            Add to orders       Ask if restart
                   │                 │
                   └────────┬────────┘
                            │
                            ▼
                   Optional: Loop back to
                   getContactInfo for new order
```

### How It Works

Each stage is a React hook that:
1. Uses `useCopilotAdditionalInstructions` for stage-specific AI behavior
2. Uses `useCopilotReadable` for stage-specific context
3. Uses `useCopilotAction` for stage-specific tools
4. All use `available: stage === "X" ? "enabled" : "disabled"`
5. Transitions happen via `setStage("nextStage")` in action handlers

---

## Conclusion

Both Vercel AI SDK and CopilotKit can build state machine workflows, but they take fundamentally different approaches:

**Vercel AI SDK** requires manual implementation with full control but significant boilerplate. Best for simple workflows or when you need maximum flexibility.

**CopilotKit** provides native state machine support with declarative APIs and modular architecture. Best for complex, maintainable applications with multiple stages.

For most production applications with 4+ stages, **CopilotKit's native approach** offers better developer experience, maintainability, and scalability. For learning or simple 2-3 stage flows, Vercel AI SDK's manual approach provides valuable insights into state machine patterns.

The current example in `/examples/copilot-state-machine` demonstrates CopilotKit's native approach with a 6-stage car sales workflow, showcasing how the framework handles complex multi-stage conversations with branching logic (financing vs. no financing paths).

---

## Additional Resources

### Vercel AI SDK
- Documentation: https://sdk.vercel.ai/docs
- GitHub: https://github.com/vercel/ai
- Examples: https://github.com/vercel/ai/tree/main/examples

### CopilotKit
- Documentation: https://docs.copilotkit.ai
- GitHub: https://github.com/CopilotKit/CopilotKit
- State Machine Guide: https://docs.copilotkit.ai/coagents/state-machine
- This Example: `/examples/copilot-state-machine`

---

**Last Updated**: 2025-10-20
**Version**: 1.0
**Author**: AI State Machine Comparison Report
