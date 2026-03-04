"use client";

import { useChat } from "@ai-sdk/react";
import type { AppSettings } from "@uberskillz/types";
import { DefaultChatTransport } from "ai";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { ChatPanel } from "@/components/chat/chat-panel";
import { SkillPreviewPanel } from "@/components/chat/skill-preview-panel";
import { PageHeader } from "@/components/page-header";
import { useModels } from "@/hooks/use-models";

/**
 * AI Skill Creation page at /skills/new.
 *
 * Two-panel layout:
 * - Left: Chat panel where the user describes a skill and receives AI-generated SKILL.md drafts.
 * - Right: Preview panel that parses AI output into structured SKILL.md.
 *
 * Uses Vercel AI SDK `useChat` hook connected to POST /api/chat.
 * The selected model is passed via the transport `body` option.
 */
export default function NewSkillPage() {
  const [selectedModel, setSelectedModel] = useState("");
  const selectedModelRef = useRef(selectedModel);
  selectedModelRef.current = selectedModel;
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [input, setInput] = useState("");

  const { models, isLoading: modelsLoading } = useModels();

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

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ model: selectedModelRef.current }),
      }),
    [],
  );

  const { messages, status, error, sendMessage, regenerate, stop } = useChat({ transport });

  const isStreaming = status === "submitted" || status === "streaming";

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

        {/* Right panel: Preview */}
        <div className="hidden overflow-hidden rounded-lg border border-border bg-card lg:block">
          <SkillPreviewPanel
            messages={messages}
            isStreaming={isStreaming}
            onRegenerate={regenerate}
          />
        </div>
      </div>
    </div>
  );
}
