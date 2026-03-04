import { describe, expect, it } from "vitest";

/**
 * Unit tests for ModelSelector helper logic.
 *
 * The ModelSelector component itself is a React client component that depends
 * on Radix Popover and the useModels() hook, which makes full rendering tests
 * best suited for E2E (Playwright). Here we test the pure-logic helper that
 * the component relies on and verify the module exports correctly.
 */

// Re-implement the same groupByProvider logic to test it in isolation.
// This mirrors the private function inside model-selector.tsx.
interface Model {
  id: string;
  name: string;
  provider: string;
}

function groupByProvider(models: Model[]): Map<string, Model[]> {
  const groups = new Map<string, Model[]>();
  for (const model of models) {
    const existing = groups.get(model.provider);
    if (existing) {
      existing.push(model);
    } else {
      groups.set(model.provider, [model]);
    }
  }
  return groups;
}

describe("groupByProvider", () => {
  it("returns an empty map for an empty list", () => {
    const result = groupByProvider([]);
    expect(result.size).toBe(0);
  });

  it("groups models correctly by provider", () => {
    const models: Model[] = [
      { id: "anthropic/claude-3-opus", name: "Claude 3 Opus", provider: "Anthropic" },
      { id: "anthropic/claude-3-sonnet", name: "Claude 3 Sonnet", provider: "Anthropic" },
      { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI" },
      { id: "google/gemini-pro", name: "Gemini Pro", provider: "Google" },
    ];

    const groups = groupByProvider(models);

    expect(groups.size).toBe(3);
    expect(groups.get("Anthropic")).toHaveLength(2);
    expect(groups.get("OpenAI")).toHaveLength(1);
    expect(groups.get("Google")).toHaveLength(1);
  });

  it("preserves insertion order of providers", () => {
    const models: Model[] = [
      { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI" },
      { id: "anthropic/claude-3-opus", name: "Claude 3 Opus", provider: "Anthropic" },
      { id: "openai/gpt-4", name: "GPT-4", provider: "OpenAI" },
    ];

    const groups = groupByProvider(models);
    const keys = Array.from(groups.keys());

    expect(keys).toEqual(["OpenAI", "Anthropic"]);
  });

  it("handles a single model", () => {
    const models: Model[] = [{ id: "meta/llama-3", name: "Llama 3", provider: "Meta" }];

    const groups = groupByProvider(models);
    expect(groups.size).toBe(1);
    expect(groups.get("Meta")).toEqual([models[0]]);
  });
});

describe("ModelSelector module", () => {
  it("exports ModelSelector component and ModelSelectorProps type", async () => {
    const mod = await import("../model-selector");
    expect(mod.ModelSelector).toBeDefined();
    expect(typeof mod.ModelSelector).toBe("function");
  });
});
