"use client";

import { useChat } from "@ai-sdk/react";
import type { AppSettings } from "@uberskillz/types";
import { DefaultChatTransport } from "ai";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ChatPanel } from "@/components/chat/chat-panel";
import { PageHeader } from "@/components/page-header";
import { useModels } from "@/hooks/use-models";

/**
 * AI Skill Creation page at /skills/new.
 *
 * Two-panel layout:
 * - Left: Chat panel where the user describes a skill and receives AI-generated SKILL.md drafts.
 * - Right: Preview panel (placeholder -- implemented in S5-3).
 *
 * Uses Vercel AI SDK `useChat` hook connected to POST /api/chat.
 * The selected model is passed via the transport `body` option.
 */
export default function NewSkillPage() {
  const [selectedModel, setSelectedModel] = useState("");
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [input, setInput] = useState("");

  const { models, isLoading: modelsLoading } = useModels();

  // Check whether an API key is configured by fetching settings once
  useEffect(() => {
    async function checkApiKey() {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) {
          setHasApiKey(false);
          return;
        }
        const settings = (await res.json()) as AppSettings;
        setHasApiKey(settings.openrouterApiKey !== null);

        // Use the configured default model if no model has been selected yet
        if (settings.defaultModel) {
          setSelectedModel((prev) => prev || settings.defaultModel);
        }
      } catch {
        setHasApiKey(false);
      }
    }
    checkApiKey();
  }, []);

  // Create a transport that includes the selected model in the request body.
  // Memoized so the transport instance is stable across renders unless the model changes.
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { model: selectedModel },
      }),
    [selectedModel],
  );

  const { messages, status, error, sendMessage, regenerate, stop } = useChat({ transport });

  if (hasApiKey === null) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Back navigation */}
      <Link
        href="/skills"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Library
      </Link>

      <PageHeader
        title="Create New Skill"
        description="Describe your skill and let AI generate a SKILL.md draft for you."
      />

      {/* Two-panel layout */}
      <div className="grid h-[calc(100vh-280px)] min-h-[500px] grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left panel: Chat */}
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <ChatPanel
            messages={messages}
            status={status}
            error={error}
            sendMessage={sendMessage}
            regenerate={regenerate}
            stop={stop}
            input={input}
            onInputChange={setInput}
            models={models}
            modelsLoading={modelsLoading}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            hasApiKey={hasApiKey}
          />
        </div>

        {/* Right panel: Preview (S5-3 placeholder) */}
        <div className="hidden overflow-hidden rounded-lg border border-border bg-card lg:block">
          <SkillPreviewPlaceholder messages={messages} />
        </div>
      </div>
    </div>
  );
}

/**
 * Placeholder for the skill preview panel (S5-3).
 * Extracts the last assistant message and shows its raw text content.
 */
function SkillPreviewPlaceholder({
  messages,
}: {
  messages: ReturnType<typeof useChat>["messages"];
}) {
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  const text = lastAssistant?.parts
    .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("");

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Preview</h2>
        <p className="text-xs text-muted-foreground">Generated SKILL.md will appear here</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {text ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
            {text}
          </pre>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Start a conversation to see the preview
          </div>
        )}
      </div>
    </div>
  );
}
