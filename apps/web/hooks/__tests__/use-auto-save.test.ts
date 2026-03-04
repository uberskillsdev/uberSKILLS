import { describe, expect, it } from "vitest";
import type { SkillSnapshot } from "../use-auto-save";

/**
 * Replicates the serialise function from use-auto-save to test snapshot
 * comparison logic independently (the hook itself uses React hooks so it
 * cannot be directly invoked in a pure unit test without a React renderer).
 */
function serialise(snapshot: SkillSnapshot): string {
  return JSON.stringify([
    snapshot.name,
    snapshot.description,
    snapshot.trigger,
    [...snapshot.tags].sort(),
    snapshot.modelPattern,
    snapshot.content,
  ]);
}

function makeSnapshot(overrides?: Partial<SkillSnapshot>): SkillSnapshot {
  return {
    name: "Test Skill",
    description: "A skill for testing",
    trigger: "When the user asks",
    tags: ["test", "demo"],
    modelPattern: null,
    content: "# Instructions\nDo the thing.",
    ...overrides,
  };
}

describe("SkillSnapshot serialisation", () => {
  it("identical snapshots produce the same serialised value", () => {
    const a = makeSnapshot();
    const b = makeSnapshot();
    expect(serialise(a)).toBe(serialise(b));
  });

  it("detects a changed name", () => {
    const a = makeSnapshot();
    const b = makeSnapshot({ name: "Renamed Skill" });
    expect(serialise(a)).not.toBe(serialise(b));
  });

  it("detects changed content", () => {
    const a = makeSnapshot();
    const b = makeSnapshot({ content: "# Updated" });
    expect(serialise(a)).not.toBe(serialise(b));
  });

  it("detects changed tags", () => {
    const a = makeSnapshot();
    const b = makeSnapshot({ tags: ["test", "demo", "new-tag"] });
    expect(serialise(a)).not.toBe(serialise(b));
  });

  it("ignores tag order (sorted before comparison)", () => {
    const a = makeSnapshot({ tags: ["alpha", "beta"] });
    const b = makeSnapshot({ tags: ["beta", "alpha"] });
    expect(serialise(a)).toBe(serialise(b));
  });

  it("detects changed modelPattern from null to string", () => {
    const a = makeSnapshot({ modelPattern: null });
    const b = makeSnapshot({ modelPattern: "claude-.*" });
    expect(serialise(a)).not.toBe(serialise(b));
  });

  it("detects changed description", () => {
    const a = makeSnapshot();
    const b = makeSnapshot({ description: "Updated description" });
    expect(serialise(a)).not.toBe(serialise(b));
  });

  it("detects changed trigger", () => {
    const a = makeSnapshot();
    const b = makeSnapshot({ trigger: "Always" });
    expect(serialise(a)).not.toBe(serialise(b));
  });

  it("treats empty tags arrays as equal", () => {
    const a = makeSnapshot({ tags: [] });
    const b = makeSnapshot({ tags: [] });
    expect(serialise(a)).toBe(serialise(b));
  });
});
