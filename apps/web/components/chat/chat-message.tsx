"use client";

import { cn } from "@uberskillz/ui";
import type { UIMessage } from "ai";
import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  message: UIMessage;
}

/**
 * Renders a single chat message bubble.
 * User messages appear on the right with muted background.
 * Assistant messages appear on the left with card background.
 */
export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  const text = message.parts
    .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("");

  return (
    <div
      className={cn("flex gap-3", isUser && "flex-row-reverse")}
      role="log"
      aria-label={isUser ? "Your message" : "AI response"}
    >
      {/* Avatar icon */}
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-muted" : "bg-foreground text-background",
        )}
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </div>

      {/* Message bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed",
          isUser ? "bg-muted text-foreground" : "border border-border bg-card text-card-foreground",
        )}
      >
        <div className="whitespace-pre-wrap break-words">{text}</div>
      </div>
    </div>
  );
}
