import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { runMigrations } from "../../migrate";
import { openSqliteDb } from "../../sqlite-utils";

const TEST_DIR = resolve(process.cwd(), "data/test-versions-query");
const TEST_DB_URL = "file:data/test-versions-query/versions.db";
const TEST_DB_PATH = resolve(process.cwd(), "data/test-versions-query/versions.db");

// biome-ignore lint/suspicious/noExplicitAny: Test setup requires untyped Drizzle bridge
let testDb: any;
let closeDb: () => void;

// Mock getDb() so query functions use our test database
vi.mock("../../client", () => ({
  getDb: () => testDb,
  resetDbForTesting: vi.fn(),
}));

// Import after mock is set up
const { createVersion, listVersions, getVersion } = await import("../versions");
const { skills, skillVersions } = await import("../../schema");

// Helper to insert a skill directly for FK references
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

describe("versions query functions", () => {
  beforeAll(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    runMigrations(TEST_DB_URL);
    const opened = openSqliteDb(TEST_DB_PATH, { skills, skillVersions });
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
    testDb.delete(skillVersions).run();
    testDb.delete(skills).run();
  });

  // -------------------------------------------------------------------------
  // createVersion
  // -------------------------------------------------------------------------
  describe("createVersion", () => {
    it("creates a version with auto-incremented version number starting at 1", () => {
      insertTestSkill("skill-1", "Test Skill");

      const v = createVersion({
        skillId: "skill-1",
        contentSnapshot: "# Instructions\nDo things.",
        metadataSnapshot: JSON.stringify({ name: "Test Skill" }),
        changeSummary: "Initial version",
      });

      expect(v.id).toBeDefined();
      expect(v.id.length).toBe(21);
      expect(v.skillId).toBe("skill-1");
      expect(v.version).toBe(1);
      expect(v.contentSnapshot).toBe("# Instructions\nDo things.");
      expect(v.metadataSnapshot).toBe(JSON.stringify({ name: "Test Skill" }));
      expect(v.changeSummary).toBe("Initial version");
      expect(v.createdAt).toBeInstanceOf(Date);
    });

    it("auto-increments version number for the same skill", () => {
      insertTestSkill("skill-2", "Multi Version");

      const v1 = createVersion({
        skillId: "skill-2",
        contentSnapshot: "v1 content",
        metadataSnapshot: "{}",
      });
      const v2 = createVersion({
        skillId: "skill-2",
        contentSnapshot: "v2 content",
        metadataSnapshot: "{}",
      });
      const v3 = createVersion({
        skillId: "skill-2",
        contentSnapshot: "v3 content",
        metadataSnapshot: "{}",
      });

      expect(v1.version).toBe(1);
      expect(v2.version).toBe(2);
      expect(v3.version).toBe(3);
    });

    it("maintains independent version counters per skill", () => {
      insertTestSkill("skill-a", "Skill A");
      insertTestSkill("skill-b", "Skill B");

      const va1 = createVersion({
        skillId: "skill-a",
        contentSnapshot: "A v1",
        metadataSnapshot: "{}",
      });
      const vb1 = createVersion({
        skillId: "skill-b",
        contentSnapshot: "B v1",
        metadataSnapshot: "{}",
      });
      const va2 = createVersion({
        skillId: "skill-a",
        contentSnapshot: "A v2",
        metadataSnapshot: "{}",
      });

      expect(va1.version).toBe(1);
      expect(vb1.version).toBe(1);
      expect(va2.version).toBe(2);
    });

    it("defaults changeSummary to empty string", () => {
      insertTestSkill("skill-3", "Summary Default");

      const v = createVersion({
        skillId: "skill-3",
        contentSnapshot: "content",
        metadataSnapshot: "{}",
      });

      expect(v.changeSummary).toBe("");
    });
  });

  // -------------------------------------------------------------------------
  // listVersions
  // -------------------------------------------------------------------------
  describe("listVersions", () => {
    it("returns versions sorted by version number descending", () => {
      insertTestSkill("skill-list", "List Skill");
      createVersion({ skillId: "skill-list", contentSnapshot: "v1", metadataSnapshot: "{}" });
      createVersion({ skillId: "skill-list", contentSnapshot: "v2", metadataSnapshot: "{}" });
      createVersion({ skillId: "skill-list", contentSnapshot: "v3", metadataSnapshot: "{}" });

      const versions = listVersions("skill-list");
      expect(versions.length).toBe(3);
      expect(versions[0]?.version).toBe(3);
      expect(versions[1]?.version).toBe(2);
      expect(versions[2]?.version).toBe(1);
    });

    it("returns only versions for the specified skill", () => {
      insertTestSkill("skill-x", "Skill X");
      insertTestSkill("skill-y", "Skill Y");
      createVersion({ skillId: "skill-x", contentSnapshot: "X", metadataSnapshot: "{}" });
      createVersion({ skillId: "skill-y", contentSnapshot: "Y", metadataSnapshot: "{}" });

      const versions = listVersions("skill-x");
      expect(versions.length).toBe(1);
      expect(versions[0]?.contentSnapshot).toBe("X");
    });

    it("returns empty array for skill with no versions", () => {
      insertTestSkill("skill-empty", "No Versions");
      const versions = listVersions("skill-empty");
      expect(versions).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // getVersion
  // -------------------------------------------------------------------------
  describe("getVersion", () => {
    it("returns a version by its ID", () => {
      insertTestSkill("skill-get", "Get Version");
      const created = createVersion({
        skillId: "skill-get",
        contentSnapshot: "find me",
        metadataSnapshot: "{}",
      });

      const found = getVersion(created.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.contentSnapshot).toBe("find me");
    });

    it("returns null for non-existent ID", () => {
      expect(getVersion("nonexistent-id-12345")).toBeNull();
    });
  });
});
