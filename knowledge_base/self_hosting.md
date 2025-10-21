# Self‑Hosting CopilotKit (Skip Copilot Cloud Key)

This note shows how to run the `copilot-state-machine` example fully self‑hosted, without a Copilot Cloud Public API key. You’ll replace the `publicApiKey` prop with a local `runtimeUrl` and add a Next.js API route that runs the Copilot Runtime on your server.

## TL;DR

- You can skip `NEXT_PUBLIC_CPK_PUBLIC_API_KEY` entirely when self‑hosting.
- Use `<CopilotKit runtimeUrl="/api/copilotkit">` instead of `publicApiKey`.
- Add a Next.js API route that mounts the Copilot Runtime.
- Put your model provider key (e.g., `OPENAI_API_KEY`) in `.env.local` (server‑side only).

---

## Steps for `examples/copilot-state-machine`

1) Update the CopilotKit provider to point at your local runtime

File: `CopilotKit/examples/copilot-state-machine/src/app/layout.tsx`

Change from:

```tsx
<CopilotKit
  publicApiKey={process.env.NEXT_PUBLIC_CPK_PUBLIC_API_KEY}
  showDevConsole={false}
>
  {/* ... */}
</CopilotKit>
```

To:

```tsx
<CopilotKit runtimeUrl="/api/copilotkit" showDevConsole={false}>
  {/* ... */}
</CopilotKit>
```

2) Add a Next.js API route for the Copilot Runtime

Create: `CopilotKit/examples/copilot-state-machine/src/app/api/copilotkit/route.ts`

```ts
import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { NextRequest } from "next/server";

const serviceAdapter = new OpenAIAdapter();
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

Reference implementation: `CopilotKit/examples/copilot-fully-custom/app/api/copilotkit/route.ts`.

3) Configure your provider API key (server‑side)

Add to `CopilotKit/examples/copilot-state-machine/.env.local` (or your preferred env file that loads in dev):

```
OPENAI_API_KEY=sk_...
```

Notes:
- Do not expose provider keys as `NEXT_PUBLIC_...`; keep them server‑side.
- If using a different LLM provider, use the corresponding adapter and env var.

4) Run the example

From `CopilotKit/examples/copilot-state-machine`:

```
pnpm install
pnpm dev
```

Open the app and the UI will communicate with your local runtime at `/api/copilotkit` without needing a Copilot Cloud key.

---

## What You Lose Without Copilot Cloud

- Cloud‑only features like `guardrails_c`, hosted error/observability (`onError` capture), and certain auth/remote endpoint integrations.
- If you need these, keep using `publicApiKey` with Copilot Cloud.

## When to Prefer Self‑Hosting

- You want full control over runtime, data, and provider configuration.
- You need to run entirely air‑gapped or avoid any cloud dependency.

## Related Docs and Snippets

- Component reference shows both `publicApiKey` and `runtimeUrl`: `CopilotKit/docs/content/docs/reference/components/CopilotKit.mdx`
- Self‑hosted provider snippet: `CopilotKit/docs/snippets/coagents/self-host-configure-copilotkit-provider.mdx`
- Cloud provider snippet (for comparison): `CopilotKit/docs/snippets/coagents/cloud-configure-copilotkit-provider.mdx`

