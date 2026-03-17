import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { getDecryptedApiKey, getTestRun, updateTestRun } from "@uberskills/db";
import type { TestMessage } from "@uberskills/types";
import { streamText } from "ai";
import { NextResponse } from "next/server";

import { routeLogger } from "@/lib/logger";

const log = routeLogger("POST", "/api/test/[id]/continue");

interface ContinueRequestBody {
  userMessage: string;
  enableWebSearch?: boolean;
}

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/test/[id]/continue -- Sends a follow-up message in an existing test run.
 *
 * Flow:
 * 1. Validate test run exists and is completed
 * 2. Parse existing messages (or reconstruct from legacy single-turn fields)
 * 3. Append user message, stream AI response with full conversation history
 * 4. Update test run with cumulative metrics and full messages array
 */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  const rlog = log.child({ testRunId: id });

  // Decrypt the stored API key
  let apiKey: string | null;
  try {
    apiKey = getDecryptedApiKey();
  } catch {
    return NextResponse.json(
      { error: "Failed to decrypt API key.", code: "DECRYPT_ERROR" },
      { status: 500 },
    );
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: "No API key configured.", code: "NO_API_KEY" },
      { status: 401 },
    );
  }

  // Fetch existing test run
  const testRun = getTestRun(id);
  if (!testRun) {
    rlog.warn("test run not found");
    return NextResponse.json(
      { error: `Test run "${id}" not found`, code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  if (testRun.status !== "completed") {
    return NextResponse.json(
      { error: "Can only continue a completed test run", code: "INVALID_STATUS" },
      { status: 400 },
    );
  }

  // Parse request body
  let body: ContinueRequestBody;
  try {
    body = (await request.json()) as ContinueRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_JSON" }, { status: 400 });
  }

  const { userMessage, enableWebSearch } = body;

  if (typeof userMessage !== "string" || userMessage.trim() === "") {
    return NextResponse.json(
      { error: "userMessage must be a non-empty string", code: "INVALID_USER_MESSAGE" },
      { status: 400 },
    );
  }

  // Reconstruct messages array from legacy runs if needed
  let existingMessages: TestMessage[];
  if (testRun.messages) {
    existingMessages = JSON.parse(testRun.messages) as TestMessage[];
  } else {
    existingMessages = [
      { role: "user", content: testRun.userMessage, timestamp: testRun.createdAt.getTime() },
      {
        role: "assistant",
        content: testRun.assistantResponse ?? "",
        timestamp: testRun.createdAt.getTime(),
        promptTokens: testRun.promptTokens,
        completionTokens: testRun.completionTokens,
        totalTokens: testRun.totalTokens,
        latencyMs: testRun.latencyMs,
        ttftMs: testRun.ttftMs,
      },
    ];
  }

  // Build the new user message
  const turnStartMs = Date.now();
  const newUserMessage: TestMessage = {
    role: "user",
    content: userMessage.trim(),
    timestamp: turnStartMs,
  };
  const allMessages = [...existingMessages, newUserMessage];

  // Build AI SDK messages array from conversation history
  const aiMessages = allMessages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Mark as running
  updateTestRun(id, { status: "running" });

  rlog.info({ turn: Math.ceil(allMessages.length / 2) }, "continue turn started");

  let ttftMs: number | null = null;

  const openrouter = createOpenRouter({
    apiKey,
    headers: {
      "HTTP-Referer": "https://uberskills.dev",
      "X-Title": "uberSKILLS",
    },
  });

  try {
    const result = streamText({
      model: openrouter(
        testRun.model,
        enableWebSearch ? { web_search_options: { max_results: 5 } } : undefined,
      ),
      system: testRun.systemPrompt,
      messages: aiMessages,
      onChunk() {
        if (ttftMs === null) {
          ttftMs = Date.now() - turnStartMs;
        }
      },
      async onFinish({ text, usage }) {
        const latencyMs = Date.now() - turnStartMs;

        const assistantMessage: TestMessage = {
          role: "assistant",
          content: text,
          timestamp: Date.now(),
          promptTokens: usage.inputTokens ?? null,
          completionTokens: usage.outputTokens ?? null,
          totalTokens: usage.totalTokens ?? null,
          latencyMs,
          ttftMs,
        };

        const finalMessages = [...allMessages, assistantMessage];

        // Cumulative metrics: sum across all assistant turns
        let cumulativePrompt = 0;
        let cumulativeCompletion = 0;
        let cumulativeTotal = 0;
        let cumulativeLatency = 0;
        for (const m of finalMessages) {
          if (m.role === "assistant") {
            cumulativePrompt += m.promptTokens ?? 0;
            cumulativeCompletion += m.completionTokens ?? 0;
            cumulativeTotal += m.totalTokens ?? 0;
            cumulativeLatency += m.latencyMs ?? 0;
          }
        }

        updateTestRun(id, {
          assistantResponse: text,
          promptTokens: cumulativePrompt,
          completionTokens: cumulativeCompletion,
          totalTokens: cumulativeTotal,
          latencyMs: cumulativeLatency,
          ttftMs,
          status: "completed",
          messages: JSON.stringify(finalMessages),
        });

        rlog.info(
          { latencyMs, tokens: usage.totalTokens ?? 0, turns: Math.ceil(finalMessages.length / 2) },
          "continue turn completed",
        );
      },
      async onError({ error }) {
        const message = error instanceof Error ? error.message : "Unknown streaming error";
        const latencyMs = Date.now() - turnStartMs;

        // Persist the user message even on error
        updateTestRun(id, {
          latencyMs: null,
          ttftMs: null,
          status: "error",
          error: message,
          messages: JSON.stringify(allMessages),
        });

        rlog.error({ err: error, latencyMs }, "continue turn stream error");
      },
    });

    const response = result.toTextStreamResponse();
    response.headers.set("X-Test-Run-Id", id);
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";

    updateTestRun(id, {
      status: "error",
      error: message,
      messages: JSON.stringify(allMessages),
    });

    rlog.error({ err: error }, "continue turn failed");

    if (message.includes("401") || message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Invalid API key", code: "INVALID_KEY" }, { status: 401 });
    }
    if (message.includes("429") || message.includes("rate")) {
      return NextResponse.json(
        { error: "Rate limited by OpenRouter.", code: "RATE_LIMITED" },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { error: "Failed to generate response from AI provider.", code: "UPSTREAM_ERROR" },
      { status: 502 },
    );
  }
}
