import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { runMigrations } from "../../migrate";
import { openSqliteDb } from "../../sqlite-utils";

const TEST_DIR = resolve(process.cwd(), "data/test-runs-query");
const TEST_DB_URL = "file:data/test-runs-query/runs.db";
const TEST_DB_PATH = resolve(process.cwd(), "data/test-runs-query/runs.db");

// biome-ignore lint/suspicious/noExplicitAny: Test setup requires untyped Drizzle bridge
let testDb: any;
let closeDb: () => void;

vi.mock("../../client", () => ({
  getDb: () => testDb,
  resetDbForTesting: vi.fn(),
}));

const { listTestRuns, getTestRun, createTestRun, updateTestRun } = await import("../test-runs");
const { skills, testRuns } = await import("../../schema");

function insertTestSkill(id: string, name: string): void {
  testDb
    .insert(skills)
    .values({
      id,
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      description: "",
      trigger: "",
      tags: "[]",
      content: "",
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .run();
}

describe("test-runs query functions", () => {
  beforeAll(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    runMigrations(TEST_DB_URL);
    const opened = openSqliteDb(TEST_DB_PATH, { skills, testRuns });
    testDb = opened.db;
    closeDb = opened.close;
  });

  afterAll(() => {
    closeDb();
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    testDb.delete(testRuns).run();
    testDb.delete(skills).run();
  });

  // -------------------------------------------------------------------------
  // createTestRun
  // -------------------------------------------------------------------------
  describe("createTestRun", () => {
    it("creates a test run with auto-generated id and default status", () => {
      insertTestSkill("skill-1", "Test Skill");

      const run = createTestRun({
        skillId: "skill-1",
        model: "anthropic/claude-sonnet-4",
        systemPrompt: "You are a helpful assistant.",
        userMessage: "Hello, world!",
      });

      expect(run.id).toBeDefined();
      expect(run.id.length).toBe(21);
      expect(run.skillId).toBe("skill-1");
      expect(run.model).toBe("anthropic/claude-sonnet-4");
      expect(run.systemPrompt).toBe("You are a helpful assistant.");
      expect(run.userMessage).toBe("Hello, world!");
      expect(run.status).toBe("running");
      expect(run.arguments).toBe("{}");
      expect(run.assistantResponse).toBeNull();
      expect(run.promptTokens).toBeNull();
      expect(run.completionTokens).toBeNull();
      expect(run.totalTokens).toBeNull();
      expect(run.latencyMs).toBeNull();
      expect(run.ttftMs).toBeNull();
      expect(run.error).toBeNull();
      expect(run.createdAt).toBeInstanceOf(Date);
    });

    it("accepts custom arguments and status", () => {
      insertTestSkill("skill-2", "Custom Run");

      const run = createTestRun({
        skillId: "skill-2",
        model: "openai/gpt-4",
        systemPrompt: "system",
        userMessage: "user",
        arguments: JSON.stringify({ LANGUAGE: "Python" }),
        status: "completed",
      });

      expect(run.arguments).toBe(JSON.stringify({ LANGUAGE: "Python" }));
      expect(run.status).toBe("completed");
    });
  });

  // -------------------------------------------------------------------------
  // getTestRun
  // -------------------------------------------------------------------------
  describe("getTestRun", () => {
    it("returns a test run by its ID", () => {
      insertTestSkill("skill-get", "Get Run");
      const created = createTestRun({
        skillId: "skill-get",
        model: "anthropic/claude-sonnet-4",
        systemPrompt: "sys",
        userMessage: "find me",
      });

      const found = getTestRun(created.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.userMessage).toBe("find me");
    });

    it("returns null for non-existent ID", () => {
      expect(getTestRun("nonexistent-id-12345")).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // updateTestRun
  // -------------------------------------------------------------------------
  describe("updateTestRun", () => {
    it("updates response and metrics on completion", () => {
      insertTestSkill("skill-up", "Update Run");
      const created = createTestRun({
        skillId: "skill-up",
        model: "anthropic/claude-sonnet-4",
        systemPrompt: "sys",
        userMessage: "msg",
      });

      const updated = updateTestRun(created.id, {
        assistantResponse: "Here is my response.",
        promptTokens: 50,
        completionTokens: 120,
        totalTokens: 170,
        latencyMs: 2500,
        ttftMs: 350,
        status: "completed",
      });

      expect(updated).not.toBeNull();
      expect(updated?.assistantResponse).toBe("Here is my response.");
      expect(updated?.promptTokens).toBe(50);
      expect(updated?.completionTokens).toBe(120);
      expect(updated?.totalTokens).toBe(170);
      expect(updated?.latencyMs).toBe(2500);
      expect(updated?.ttftMs).toBe(350);
      expect(updated?.status).toBe("completed");
    });

    it("updates error status", () => {
      insertTestSkill("skill-err", "Error Run");
      const created = createTestRun({
        skillId: "skill-err",
        model: "anthropic/claude-sonnet-4",
        systemPrompt: "sys",
        userMessage: "msg",
      });

      const updated = updateTestRun(created.id, {
        status: "error",
        error: "Rate limit exceeded",
      });

      expect(updated?.status).toBe("error");
      expect(updated?.error).toBe("Rate limit exceeded");
    });

    it("partially updates only provided fields", () => {
      insertTestSkill("skill-partial", "Partial Run");
      const created = createTestRun({
        skillId: "skill-partial",
        model: "anthropic/claude-sonnet-4",
        systemPrompt: "sys",
        userMessage: "msg",
      });

      const updated = updateTestRun(created.id, { status: "completed" });
      expect(updated?.status).toBe("completed");
      // Other fields remain unchanged
      expect(updated?.assistantResponse).toBeNull();
      expect(updated?.promptTokens).toBeNull();
    });

    it("returns the current record when no fields are provided", () => {
      insertTestSkill("skill-noop", "Noop Run");
      const created = createTestRun({
        skillId: "skill-noop",
        model: "anthropic/claude-sonnet-4",
        systemPrompt: "sys",
        userMessage: "msg",
      });

      const result = updateTestRun(created.id, {});
      expect(result).not.toBeNull();
      expect(result?.id).toBe(created.id);
    });

    it("returns null for non-existent ID", () => {
      expect(updateTestRun("nonexistent-id-12345", { status: "error" })).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // listTestRuns
  // -------------------------------------------------------------------------
  describe("listTestRuns", () => {
    it("returns test runs sorted by createdAt descending", () => {
      insertTestSkill("skill-list", "List Runs");
      createTestRun({
        skillId: "skill-list",
        model: "model-a",
        systemPrompt: "s",
        userMessage: "first",
      });
      createTestRun({
        skillId: "skill-list",
        model: "model-b",
        systemPrompt: "s",
        userMessage: "second",
      });
      createTestRun({
        skillId: "skill-list",
        model: "model-c",
        systemPrompt: "s",
        userMessage: "third",
      });

      const runs = listTestRuns("skill-list");
      expect(runs.length).toBe(3);
      // Newest first
      for (let i = 1; i < runs.length; i++) {
        const prevTime = runs[i - 1]?.createdAt.getTime() ?? 0;
        const currTime = runs[i]?.createdAt.getTime() ?? 0;
        expect(prevTime).toBeGreaterThanOrEqual(currTime);
      }
    });

    it("returns only runs for the specified skill", () => {
      insertTestSkill("skill-x", "X");
      insertTestSkill("skill-y", "Y");
      createTestRun({ skillId: "skill-x", model: "m", systemPrompt: "s", userMessage: "x" });
      createTestRun({ skillId: "skill-y", model: "m", systemPrompt: "s", userMessage: "y" });

      const runs = listTestRuns("skill-x");
      expect(runs.length).toBe(1);
      expect(runs[0]?.userMessage).toBe("x");
    });

    it("returns empty array for skill with no runs", () => {
      insertTestSkill("skill-empty", "Empty");
      expect(listTestRuns("skill-empty")).toEqual([]);
    });
  });
});
