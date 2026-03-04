import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { runMigrations } from "../../migrate";
import { openSqliteDb } from "../../sqlite-utils";

const TEST_DIR = resolve(process.cwd(), "data/test-files-query");
const TEST_DB_URL = "file:data/test-files-query/files.db";
const TEST_DB_PATH = resolve(process.cwd(), "data/test-files-query/files.db");

// biome-ignore lint/suspicious/noExplicitAny: Test setup requires untyped Drizzle bridge
let testDb: any;
let closeDb: () => void;

vi.mock("../../client", () => ({
  getDb: () => testDb,
  resetDbForTesting: vi.fn(),
}));

const { listFiles, createFile, updateFile, deleteFile } = await import("../files");
const { skills, skillFiles } = await import("../../schema");

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

describe("files query functions", () => {
  beforeAll(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    runMigrations(TEST_DB_URL);
    const opened = openSqliteDb(TEST_DB_PATH, { skills, skillFiles });
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
    testDb.delete(skillFiles).run();
    testDb.delete(skills).run();
  });

  // -------------------------------------------------------------------------
  // createFile
  // -------------------------------------------------------------------------
  describe("createFile", () => {
    it("creates a file with auto-generated id and timestamps", () => {
      insertTestSkill("skill-1", "File Skill");

      const file = createFile({
        skillId: "skill-1",
        path: "prompts/setup.md",
        content: "# Setup\nInitialize things.",
        type: "prompt",
      });

      expect(file.id).toBeDefined();
      expect(file.id.length).toBe(21);
      expect(file.skillId).toBe("skill-1");
      expect(file.path).toBe("prompts/setup.md");
      expect(file.content).toBe("# Setup\nInitialize things.");
      expect(file.type).toBe("prompt");
      expect(file.createdAt).toBeInstanceOf(Date);
      expect(file.updatedAt).toBeInstanceOf(Date);
    });

    it("defaults content to empty string and type to resource", () => {
      insertTestSkill("skill-2", "Minimal File");

      const file = createFile({
        skillId: "skill-2",
        path: "resources/data.json",
      });

      expect(file.content).toBe("");
      expect(file.type).toBe("resource");
    });
  });

  // -------------------------------------------------------------------------
  // listFiles
  // -------------------------------------------------------------------------
  describe("listFiles", () => {
    it("returns files sorted by path ascending", () => {
      insertTestSkill("skill-list", "List Skill");
      createFile({ skillId: "skill-list", path: "resources/z-file.txt" });
      createFile({ skillId: "skill-list", path: "prompts/a-prompt.md" });
      createFile({ skillId: "skill-list", path: "prompts/m-prompt.md" });

      const files = listFiles("skill-list");
      expect(files.length).toBe(3);
      expect(files[0]?.path).toBe("prompts/a-prompt.md");
      expect(files[1]?.path).toBe("prompts/m-prompt.md");
      expect(files[2]?.path).toBe("resources/z-file.txt");
    });

    it("returns only files for the specified skill", () => {
      insertTestSkill("skill-a", "A");
      insertTestSkill("skill-b", "B");
      createFile({ skillId: "skill-a", path: "file-a.md" });
      createFile({ skillId: "skill-b", path: "file-b.md" });

      const files = listFiles("skill-a");
      expect(files.length).toBe(1);
      expect(files[0]?.path).toBe("file-a.md");
    });

    it("returns empty array for skill with no files", () => {
      insertTestSkill("skill-empty", "Empty");
      expect(listFiles("skill-empty")).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // updateFile
  // -------------------------------------------------------------------------
  describe("updateFile", () => {
    it("partially updates a file", () => {
      insertTestSkill("skill-up", "Update Skill");
      const created = createFile({
        skillId: "skill-up",
        path: "old-path.md",
        content: "old content",
        type: "resource",
      });

      const updated = updateFile(created.id, { content: "new content" });
      expect(updated).not.toBeNull();
      expect(updated?.path).toBe("old-path.md");
      expect(updated?.content).toBe("new content");
      expect(updated?.type).toBe("resource");
    });

    it("updates path (rename)", () => {
      insertTestSkill("skill-rename", "Rename Skill");
      const created = createFile({ skillId: "skill-rename", path: "old.md" });

      const updated = updateFile(created.id, { path: "new.md" });
      expect(updated?.path).toBe("new.md");
    });

    it("updates type", () => {
      insertTestSkill("skill-type", "Type Skill");
      const created = createFile({ skillId: "skill-type", path: "file.md", type: "resource" });

      const updated = updateFile(created.id, { type: "prompt" });
      expect(updated?.type).toBe("prompt");
    });

    it("bumps updatedAt on update", () => {
      insertTestSkill("skill-ts", "Timestamp Skill");
      const created = createFile({ skillId: "skill-ts", path: "file.md" });

      const updated = updateFile(created.id, { content: "changed" });
      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
    });

    it("returns null for non-existent ID", () => {
      expect(updateFile("nonexistent-id-12345", { content: "nope" })).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // deleteFile
  // -------------------------------------------------------------------------
  describe("deleteFile", () => {
    it("deletes a file and returns true", () => {
      insertTestSkill("skill-del", "Delete Skill");
      const created = createFile({ skillId: "skill-del", path: "delete-me.md" });

      expect(deleteFile(created.id)).toBe(true);
      expect(listFiles("skill-del")).toEqual([]);
    });

    it("returns false for non-existent ID", () => {
      expect(deleteFile("nonexistent-id-12345")).toBe(false);
    });
  });
});
