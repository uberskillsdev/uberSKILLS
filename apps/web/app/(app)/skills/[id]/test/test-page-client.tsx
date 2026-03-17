"use client";

import type { TestMessage } from "@uberskills/types";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import type { TestRunStream, TestSkillData } from "@/components/test/test-config-panel";
import { TestConfigPanel } from "@/components/test/test-config-panel";
import type { HistorySelection } from "@/components/test/test-history";
import { TestHistory } from "@/components/test/test-history";
import type { TestMetricsData } from "@/components/test/test-metrics";
import { TestResponsePanel } from "@/components/test/test-response-panel";

interface TestPageClientProps {
  skill: TestSkillData;
  defaultModel: string;
  hasApiKey: boolean;
}

interface TestRunResponse {
  status: "running" | "completed" | "error";
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  latencyMs: number | null;
  ttftMs: number | null;
  error: string | null;
  messages: TestMessage[] | null;
}

export function TestPageClient({ skill, defaultModel, hasApiKey }: TestPageClientProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [currentStreamText, setCurrentStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<TestMetricsData | null>(null);
  // Incremented after each test completes to trigger a history table refresh
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const testRunIdRef = useRef<string | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  // Retries up to 3 times since the server's onFinish callback may lag behind the stream ending.
  const fetchMetrics = useCallback(async (testRunId: string) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 500;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(`/api/test/${testRunId}`);
        if (!res.ok) return;

        const data = (await res.json()) as TestRunResponse;

        if (data.status === "running" && attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          continue;
        }

        if (data.status === "error" && data.error) {
          setError(data.error);
        }

        // Restore full messages from server (includes per-turn metrics)
        if (data.messages) {
          setMessages(data.messages);
        }

        setMetrics({
          promptTokens: data.promptTokens,
          completionTokens: data.completionTokens,
          totalTokens: data.totalTokens,
          latencyMs: data.latencyMs,
          ttftMs: data.ttftMs,
        });
        return;
      } catch {
        return;
      }
    }
  }, []);

  /** Read a stream to completion, updating currentStreamText as chunks arrive. */
  const consumeStream = useCallback(
    async (reader: ReadableStreamDefaultReader<Uint8Array>, testRunId: string) => {
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          setCurrentStreamText((prev) => prev + decoder.decode(value, { stream: true }));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Stream interrupted";
        setError(message);
      } finally {
        setIsRunning(false);
        readerRef.current = null;

        await fetchMetrics(testRunId);

        // Clear streaming text — the full content is now in the messages array
        setCurrentStreamText("");

        // Trigger history table refresh
        setHistoryRefreshKey((k) => k + 1);
      }
    },
    [fetchMetrics],
  );

  const handleTestStart = useCallback(
    async (stream: TestRunStream) => {
      setIsRunning(true);
      setMessages([]);
      setCurrentStreamText("");
      setError(null);
      setMetrics(null);
      testRunIdRef.current = stream.testRunId;
      readerRef.current = stream.reader;

      await consumeStream(stream.reader, stream.testRunId);
    },
    [consumeStream],
  );

  /** Send a follow-up message in the current conversation. */
  const handleContinue = useCallback(
    async (userMessage: string) => {
      const testRunId = testRunIdRef.current;
      if (!testRunId || isRunning) return;

      setIsRunning(true);
      setCurrentStreamText("");
      setError(null);

      // Optimistically add the user message to the conversation
      const userMsg: TestMessage = {
        role: "user",
        content: userMessage,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const res = await fetch(`/api/test/${testRunId}/continue`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userMessage }),
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          const errMsg = data.error ?? `Continue failed (${res.status})`;
          setError(errMsg);
          setIsRunning(false);
          toast.error(errMsg);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setError("No response stream available");
          setIsRunning(false);
          toast.error("No response stream available");
          return;
        }

        readerRef.current = reader;
        await consumeStream(reader, testRunId);
      } catch {
        setError("Failed to send follow-up. Check your network connection.");
        setIsRunning(false);
        toast.error("Failed to send follow-up.");
      }
    },
    [isRunning, consumeStream],
  );

  // Load a historical test run's response into the response panel
  const handleSelectHistoryRun = useCallback((selection: HistorySelection) => {
    testRunIdRef.current = selection.testRunId;
    if (selection.messages) {
      setMessages(selection.messages);
    } else {
      // Legacy single-turn run: reconstruct a 2-element array
      setMessages(
        selection.text
          ? [
              { role: "user", content: "", timestamp: 0 },
              { role: "assistant", content: selection.text, timestamp: 0 },
            ]
          : [],
      );
    }
    setCurrentStreamText("");
    setError(selection.error);
    setMetrics(selection.metrics);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Main two-panel layout */}
      <div className="flex h-[calc(100vh-14rem)] overflow-hidden rounded-lg border border-border">
        <div className="w-1/2 shrink-0 border-r border-border">
          <TestConfigPanel
            skill={skill}
            defaultModel={defaultModel}
            hasApiKey={hasApiKey}
            onTestStart={handleTestStart}
            isRunning={isRunning}
          />
        </div>

        <div className="flex w-1/2 flex-col overflow-hidden p-5">
          <TestResponsePanel
            messages={messages}
            currentStreamText={currentStreamText}
            isRunning={isRunning}
            error={error}
            metrics={metrics}
            onContinue={handleContinue}
          />
        </div>
      </div>

      {/* Test history table */}
      <TestHistory
        skillId={skill.id}
        refreshKey={historyRefreshKey}
        onSelectRun={handleSelectHistoryRun}
      />
    </div>
  );
}
