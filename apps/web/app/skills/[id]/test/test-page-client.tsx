"use client";

import { useCallback, useRef, useState } from "react";

import type { TestRunStream, TestSkillData } from "@/components/test/test-config-panel";
import { TestConfigPanel } from "@/components/test/test-config-panel";

interface TestPageClientProps {
  skill: TestSkillData;
  defaultModel: string;
  hasApiKey: boolean;
}

/**
 * Client wrapper for the skill testing page.
 *
 * Renders a two-panel layout:
 * - Left: configuration panel (model, arguments, user message, run button)
 * - Right: response panel placeholder (to be implemented in S5-6)
 *
 * Manages the streaming state shared between the config and response panels.
 */
export function TestPageClient({ skill, defaultModel, hasApiKey }: TestPageClientProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Holds the active stream reader so a future "stop" button can cancel it.
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  /** Consumes the streaming response body chunk-by-chunk and appends decoded text. */
  const handleTestStart = useCallback(async (stream: TestRunStream) => {
    setIsRunning(true);
    setStreamedText("");
    setError(null);
    readerRef.current = stream.reader;

    const decoder = new TextDecoder();

    try {
      // Read chunks until the stream signals completion
      while (true) {
        const { done, value } = await stream.reader.read();
        if (done) break;
        setStreamedText((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Stream interrupted";
      setError(message);
    } finally {
      setIsRunning(false);
      readerRef.current = null;
    }
  }, []);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 overflow-hidden rounded-lg border border-border">
      {/* Left panel: configuration */}
      <div className="w-1/2 shrink-0 border-r border-border">
        <TestConfigPanel
          skill={skill}
          defaultModel={defaultModel}
          hasApiKey={hasApiKey}
          onTestStart={handleTestStart}
          isRunning={isRunning}
        />
      </div>

      {/* Right panel: response (placeholder for S5-6) */}
      <div className="flex w-1/2 flex-col overflow-y-auto p-5">
        <ResponsePanel streamedText={streamedText} error={error} isRunning={isRunning} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Response panel -- shows streamed output, error, or empty state
// ---------------------------------------------------------------------------

interface ResponsePanelProps {
  streamedText: string;
  error: string | null;
  isRunning: boolean;
}

function ResponsePanel({ streamedText, error, isRunning }: ResponsePanelProps): React.ReactNode {
  if (error) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg border px-4 py-3 text-sm"
        style={{
          borderColor: "var(--status-error-text)",
          color: "var(--status-error-text)",
        }}
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (streamedText) {
    return (
      <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
        {streamedText}
        {isRunning && <span className="inline-block h-4 w-1.5 animate-pulse bg-foreground" />}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
      <p className="text-sm">Run a test to see results</p>
      <p className="mt-1 text-xs">
        Configure the parameters on the left and click &quot;Run Test&quot;.
      </p>
    </div>
  );
}
