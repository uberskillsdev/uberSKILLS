import { describe, expect, it } from "vitest";
import type { SystemPromptFile } from "../system-prompt-builder";
import { buildTestSystemPrompt } from "../system-prompt-builder";

const SKILL_CONTENT = "You are a helpful coding assistant.\n\nFollow best practices.";

function makeFile(
  overrides: Partial<SystemPromptFile> & { path: string },
): SystemPromptFile {
  return {
    content: "file content here",
    type: "resource",
    ...overrides,
  };
}

function makeLargeContent(lineCount: number): string {
  return Array.from({ length: lineCount }, (_, i) => `line ${i + 1}`).join("\n");
}

describe("buildTestSystemPrompt", () => {
  it("returns resolvedContent unchanged when there are no files", () => {
    const result = buildTestSystemPrompt({
      resolvedContent: SKILL_CONTENT,
      files: [],
    });

    expect(result.systemPrompt).toBe(SKILL_CONTENT);
    expect(result.inlinedCount).toBe(0);
    expect(result.summarizedCount).toBe(0);
  });

  it("inlines small resource files in full", () => {
    const result = buildTestSystemPrompt({
      resolvedContent: SKILL_CONTENT,
      files: [makeFile({ path: "resources/style-guide.md", content: "Use tabs." })],
    });

    expect(result.systemPrompt).toContain("## Skill Reference Files");
    expect(result.systemPrompt).toContain("### File: resources/style-guide.md (resource)");
    expect(result.systemPrompt).toContain("Use tabs.");
    expect(result.inlinedCount).toBe(1);
    expect(result.summarizedCount).toBe(0);
  });

  it("always inlines prompt files regardless of size", () => {
    const largePrompt = makeLargeContent(200);
    const result = buildTestSystemPrompt({
      resolvedContent: SKILL_CONTENT,
      files: [makeFile({ path: "prompts/setup.md", content: largePrompt, type: "prompt" })],
    });

    expect(result.systemPrompt).toContain("line 200");
    expect(result.inlinedCount).toBe(1);
    expect(result.summarizedCount).toBe(0);
  });

  it("summarizes large resource files with preview", () => {
    const largeResource = makeLargeContent(150);
    const result = buildTestSystemPrompt({
      resolvedContent: SKILL_CONTENT,
      files: [makeFile({ path: "resources/api-docs.md", content: largeResource })],
    });

    expect(result.systemPrompt).toContain("Showing first 20 of 150 lines");
    expect(result.systemPrompt).toContain("130 additional lines omitted");
    expect(result.systemPrompt).toContain("line 1");
    expect(result.systemPrompt).toContain("line 20");
    expect(result.systemPrompt).not.toContain("line 21");
    expect(result.inlinedCount).toBe(0);
    expect(result.summarizedCount).toBe(1);
  });

  it("respects custom resourceInlineThreshold", () => {
    const content = makeLargeContent(50);
    const result = buildTestSystemPrompt({
      resolvedContent: SKILL_CONTENT,
      files: [makeFile({ path: "resources/data.txt", content })],
      resourceInlineThreshold: 30,
    });

    expect(result.summarizedCount).toBe(1);
    expect(result.systemPrompt).toContain("Showing first 20 of 50 lines");
  });

  it("respects custom previewLines", () => {
    const content = makeLargeContent(150);
    const result = buildTestSystemPrompt({
      resolvedContent: SKILL_CONTENT,
      files: [makeFile({ path: "resources/data.txt", content })],
      previewLines: 5,
    });

    expect(result.systemPrompt).toContain("Showing first 5 of 150 lines");
    expect(result.systemPrompt).toContain("line 5");
    expect(result.systemPrompt).not.toContain("line 6");
  });

  it("orders prompt files before resource files", () => {
    const result = buildTestSystemPrompt({
      resolvedContent: SKILL_CONTENT,
      files: [
        makeFile({ path: "resources/ref.md", content: "resource content" }),
        makeFile({ path: "prompts/init.md", content: "prompt content", type: "prompt" }),
      ],
    });

    const promptIdx = result.systemPrompt.indexOf("prompts/init.md");
    const resourceIdx = result.systemPrompt.indexOf("resources/ref.md");
    expect(promptIdx).toBeLessThan(resourceIdx);
  });

  it("handles mixed inline and summarized files", () => {
    const result = buildTestSystemPrompt({
      resolvedContent: SKILL_CONTENT,
      files: [
        makeFile({ path: "prompts/core.md", content: makeLargeContent(200), type: "prompt" }),
        makeFile({ path: "resources/small.txt", content: "tiny" }),
        makeFile({ path: "resources/big.txt", content: makeLargeContent(150) }),
      ],
    });

    expect(result.inlinedCount).toBe(2); // prompt (always inline) + small resource
    expect(result.summarizedCount).toBe(1); // big resource
    expect(result.systemPrompt).toContain("3 file(s) are bundled");
  });

  it("resource file at exactly threshold lines is inlined", () => {
    const content = makeLargeContent(100);
    const result = buildTestSystemPrompt({
      resolvedContent: SKILL_CONTENT,
      files: [makeFile({ path: "resources/exact.txt", content })],
      resourceInlineThreshold: 100,
    });

    expect(result.inlinedCount).toBe(1);
    expect(result.summarizedCount).toBe(0);
  });

  it("resource file at threshold + 1 lines is summarized", () => {
    const content = makeLargeContent(101);
    const result = buildTestSystemPrompt({
      resolvedContent: SKILL_CONTENT,
      files: [makeFile({ path: "resources/over.txt", content })],
      resourceInlineThreshold: 100,
    });

    expect(result.inlinedCount).toBe(0);
    expect(result.summarizedCount).toBe(1);
  });

  it("preserves resolvedContent at the start of systemPrompt", () => {
    const result = buildTestSystemPrompt({
      resolvedContent: SKILL_CONTENT,
      files: [makeFile({ path: "resources/a.txt", content: "data" })],
    });

    expect(result.systemPrompt.startsWith(SKILL_CONTENT)).toBe(true);
  });
});
