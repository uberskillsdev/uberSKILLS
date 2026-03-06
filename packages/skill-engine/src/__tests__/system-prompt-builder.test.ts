import { describe, expect, it } from "vitest";
import type { SystemPromptFile } from "../system-prompt-builder";
import { buildTestSystemPrompt, isFileReferenced } from "../system-prompt-builder";

const SKILL_CONTENT = "You are a helpful coding assistant.\n\nFollow best practices.";

function makeFile(overrides: Partial<SystemPromptFile> & { path: string }): SystemPromptFile {
  return {
    content: "file content here",
    type: "resource",
    ...overrides,
  };
}

function makeLargeContent(lineCount: number): string {
  return Array.from({ length: lineCount }, (_, i) => `line ${i + 1}`).join("\n");
}

// ---------------------------------------------------------------------------
// isFileReferenced
// ---------------------------------------------------------------------------

describe("isFileReferenced", () => {
  it("returns true when the full path appears in content", () => {
    const content = "Refer to resources/api-docs.md for API details.";
    expect(isFileReferenced(content, "resources/api-docs.md")).toBe(true);
  });

  it("returns true when only the filename appears in content", () => {
    const content = "Follow the rules in style-guide.md at all times.";
    expect(isFileReferenced(content, "resources/style-guide.md")).toBe(true);
  });

  it("returns false when neither path nor filename appears", () => {
    const content = "You are a helpful assistant.";
    expect(isFileReferenced(content, "resources/api-docs.md")).toBe(false);
  });

  it("returns false for partial matches that are not the filename", () => {
    const content = "Use the api module.";
    expect(isFileReferenced(content, "resources/api-docs.md")).toBe(false);
  });

  it("handles paths with no directory separator", () => {
    const content = "See notes.txt for details.";
    expect(isFileReferenced(content, "notes.txt")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildTestSystemPrompt
// ---------------------------------------------------------------------------

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

  it("summarizes large unreferenced resource files with preview", () => {
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

  it("fully inlines large resource files when referenced by full path", () => {
    const largeResource = makeLargeContent(200);
    const contentWithRef = "You are an assistant.\n\nRefer to resources/api-docs.md for guidance.";
    const result = buildTestSystemPrompt({
      resolvedContent: contentWithRef,
      files: [makeFile({ path: "resources/api-docs.md", content: largeResource })],
    });

    expect(result.systemPrompt).toContain("line 200");
    expect(result.systemPrompt).not.toContain("omitted for brevity");
    expect(result.inlinedCount).toBe(1);
    expect(result.summarizedCount).toBe(0);
  });

  it("fully inlines large resource files when referenced by filename only", () => {
    const largeResource = makeLargeContent(200);
    const contentWithRef = "Follow the rules in style-guide.md at all times.";
    const result = buildTestSystemPrompt({
      resolvedContent: contentWithRef,
      files: [makeFile({ path: "resources/style-guide.md", content: largeResource })],
    });

    expect(result.systemPrompt).toContain("line 200");
    expect(result.inlinedCount).toBe(1);
    expect(result.summarizedCount).toBe(0);
  });

  it("handles mixed referenced and unreferenced large resource files", () => {
    const contentWithRef = "Use api-docs.md as a reference.";
    const result = buildTestSystemPrompt({
      resolvedContent: contentWithRef,
      files: [
        makeFile({ path: "resources/api-docs.md", content: makeLargeContent(200) }),
        makeFile({ path: "resources/changelog.md", content: makeLargeContent(200) }),
      ],
    });

    // api-docs.md referenced → inlined, changelog.md not referenced → summarized
    expect(result.inlinedCount).toBe(1);
    expect(result.summarizedCount).toBe(1);
    expect(result.systemPrompt).toContain("line 200"); // from api-docs (inlined)
    expect(result.systemPrompt).toContain("Showing first 20 of 200 lines"); // from changelog
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
    expect(result.summarizedCount).toBe(1); // big unreferenced resource
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

  it("resource file at threshold + 1 lines is summarized when unreferenced", () => {
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
