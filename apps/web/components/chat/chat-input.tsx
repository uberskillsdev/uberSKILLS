"use client";

import { Button, Textarea } from "@uberskillz/ui";
import { Loader2, Send } from "lucide-react";
import { useCallback } from "react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  isStreaming,
  disabled = false,
  placeholder = "Describe the skill you want to create...",
}: ChatInputProps) {
  const canSend = !isStreaming && value.trim().length > 0 && !disabled;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!isStreaming && value.trim() && !disabled) {
          onSubmit();
        }
      }
    },
    [isStreaming, value, disabled, onSubmit],
  );

  return (
    <div className="flex gap-2">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-[44px] max-h-[160px] resize-none font-sans"
        rows={1}
        aria-label="Chat message input"
      />
      <Button
        onClick={onSubmit}
        disabled={!canSend}
        size="icon"
        className="shrink-0 self-end"
        aria-label={isStreaming ? "Sending..." : "Send message"}
      >
        {isStreaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
      </Button>
    </div>
  );
}
