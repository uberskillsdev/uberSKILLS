"use client";

import type { TestMessage } from "@uberskills/types";
import { Button, Textarea } from "@uberskills/ui";
import { Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { TestMetricsData } from "./test-metrics";
import { TestMetrics } from "./test-metrics";

interface TestResponsePanelProps {
  messages: TestMessage[];
  currentStreamText: string;
  isRunning: boolean;
  error: string | null;
  metrics: TestMetricsData | null;
  onContinue: (userMessage: string) => void;
}

export function TestResponsePanel({
  messages,
  currentStreamText,
  isRunning,
  error,
  metrics,
  onContinue,
}: TestResponsePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [followUp, setFollowUp] = useState("");

  const hasConversation = messages.length > 0 || currentStreamText.length > 0;

  // Auto-scroll when content changes during streaming
  const streamLength = currentStreamText.length;
  useEffect(() => {
    if (isRunning && streamLength > 0 && scrollRef.current) {
      scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
    }
  }, [isRunning, streamLength]);

  const handleSendFollowUp = useCallback(() => {
    const text = followUp.trim();
    if (!text || isRunning) return;
    setFollowUp("");
    onContinue(text);
  }, [followUp, isRunning, onContinue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendFollowUp();
      }
    },
    [handleSendFollowUp],
  );

  // Empty state
  if (!hasConversation && !error && !isRunning) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
        <p className="text-sm">Run a test to see results</p>
        <p className="mt-1 text-xs">
          Configure the parameters on the left and click &quot;Run Test&quot;.
        </p>
      </div>
    );
  }

  // Error-only state (no conversation yet)
  if (error && messages.length === 0 && !currentStreamText) {
    return (
      <div className="flex h-full flex-col gap-4">
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
        {metrics && <TestMetrics metrics={metrics} />}
      </div>
    );
  }

  // Determine if we're streaming the first turn (no messages yet)
  const isFirstTurnStreaming = messages.length === 0 && currentStreamText.length > 0;

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Conversation area */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto">
        {messages.map((msg, i) => (
          <MessageBlock
            // biome-ignore lint/suspicious/noArrayIndexKey: messages array is append-only
            key={i}
            role={msg.role}
            content={msg.content}
            isStreaming={false}
          />
        ))}

        {/* Currently streaming text */}
        {currentStreamText && (
          <MessageBlock
            role={isFirstTurnStreaming ? "assistant" : "assistant"}
            content={currentStreamText}
            isStreaming={isRunning}
          />
        )}

        {/* Error after conversation */}
        {error && (
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
        )}
      </div>

      {/* Metrics */}
      {!isRunning && metrics && <TestMetrics metrics={metrics} />}

      {/* Follow-up input — visible when conversation exists and not in error/running state */}
      {hasConversation && !isRunning && !error && (
        <div className="flex shrink-0 items-end gap-2 border-t border-border pt-3">
          <Textarea
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a follow-up message..."
            className="min-h-[44px] max-h-[120px] resize-none font-mono text-sm"
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSendFollowUp}
            disabled={!followUp.trim()}
            className="shrink-0"
          >
            <Send className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function MessageBlock({
  role,
  content,
  isStreaming,
}: {
  role: "user" | "assistant";
  content: string;
  isStreaming: boolean;
}) {
  if (role === "user") {
    return (
      <div className="rounded-lg bg-muted p-3">
        <p className="mb-1 text-xs font-medium text-muted-foreground">You</p>
        <p className="text-sm whitespace-pre-wrap">{content}</p>
      </div>
    );
  }

  // Assistant message
  if (isStreaming) {
    return (
      <div
        className="font-mono text-sm leading-relaxed whitespace-pre-wrap"
        role="log"
        aria-live="polite"
        aria-atomic={false}
      >
        {content}
        <span
          className="inline-block h-4 w-1.5 animate-pulse bg-foreground motion-reduce:animate-none motion-reduce:opacity-50"
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
    </div>
  );
}
