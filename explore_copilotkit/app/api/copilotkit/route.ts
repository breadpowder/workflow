import { NextRequest } from 'next/server';
import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';

/**
 * Self-hosted CopilotKit runtime endpoint
 *
 * This endpoint provides AI capabilities without exposing API keys to the client.
 * The OpenAI API key is read from environment variables on the server side only.
 *
 * @see https://docs.copilotkit.ai/runtime
 */

// Maximum duration for Vercel serverless function (10 minutes)
export const maxDuration = 600;

/**
 * POST handler for CopilotKit runtime
 *
 * Handles AI requests from the client and forwards them to OpenAI,
 * streaming responses back to the client.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime: new CopilotRuntime(),
    serviceAdapter: new OpenAIAdapter({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
    }),
    endpoint: '/api/copilotkit',
  });

  return handleRequest(req);
}
