"use client";

import { useCallback, useMemo, useRef } from "react";

import type { EditorSkillData } from "./editor-shell";

interface InstructionsTabProps {
  skill: EditorSkillData;
  /** Called on every content change. The parent (editor-shell) updates its working copy
   *  and the auto-save hook takes care of persisting the change after a debounce. */
  onContentChange: (content: string) => void;
}

const TAB_SIZE = 2;
const TAB_STRING = " ".repeat(TAB_SIZE);

export function InstructionsTab({ skill, onContentChange }: InstructionsTabProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const stats = useMemo(() => {
    const lines = skill.content.split("\n");
    const words = skill.content.trim() ? skill.content.trim().split(/\s+/).length : 0;
    return { lineCount: lines.length, wordCount: words, charCount: skill.content.length };
  }, [skill.content]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== "Tab") return;

      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { selectionStart, selectionEnd } = textarea;
      const content = skill.content;

      if (e.shiftKey) {
        // Shift+Tab: remove indentation
        const beforeCursor = content.slice(0, selectionStart);
        const lineStart = beforeCursor.lastIndexOf("\n") + 1;
        const linePrefix = content.slice(lineStart, selectionStart);

        if (linePrefix.startsWith(TAB_STRING)) {
          const updated = content.slice(0, lineStart) + content.slice(lineStart + TAB_SIZE);
          onContentChange(updated);
          requestAnimationFrame(() => {
            textarea.selectionStart = Math.max(lineStart, selectionStart - TAB_SIZE);
            textarea.selectionEnd = Math.max(lineStart, selectionEnd - TAB_SIZE);
          });
        }
      } else {
        // Tab: insert indentation
        const updated = content.slice(0, selectionStart) + TAB_STRING + content.slice(selectionEnd);
        onContentChange(updated);
        requestAnimationFrame(() => {
          textarea.selectionStart = selectionStart + TAB_SIZE;
          textarea.selectionEnd = selectionStart + TAB_SIZE;
        });
      }
    },
    [skill.content, onContentChange],
  );

  return (
    <div className="space-y-3">
      <div
        className="relative flex overflow-hidden rounded-md border border-input focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50"
        style={{ minHeight: "400px", maxHeight: "70vh" }}
      >
        <div
          ref={gutterRef}
          aria-hidden="true"
          className="shrink-0 select-none overflow-hidden border-r border-input bg-muted/50 px-3 py-2 text-right font-mono text-xs leading-[1.625rem] text-muted-foreground"
          style={{ minWidth: "3.5rem" }}
        >
          {Array.from({ length: stats.lineCount }, (_, i) => {
            const lineNumber = i + 1;
            return <div key={lineNumber}>{lineNumber}</div>;
          })}
        </div>

        <textarea
          ref={textareaRef}
          value={skill.content}
          onChange={(e) => onContentChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          placeholder="Write your skill instructions in Markdown..."
          spellCheck={false}
          aria-label="Skill instructions editor"
          className="flex-1 resize-y bg-transparent px-4 py-2 font-mono text-sm leading-[1.625rem] text-foreground outline-none placeholder:text-muted-foreground"
          style={{ minHeight: "400px", tabSize: TAB_SIZE }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex gap-4">
          <span>{stats.charCount} characters</span>
          <span>{stats.wordCount} words</span>
          <span>{stats.lineCount} lines</span>
        </div>
      </div>
    </div>
  );
}
