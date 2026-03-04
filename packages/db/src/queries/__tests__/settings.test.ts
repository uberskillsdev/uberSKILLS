import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { runMigrations } from "../../migrate";
import { openSqliteDb } from "../../sqlite-utils";

const TEST_DIR = resolve(process.cwd(), "data/test-settings-query");
const TEST_DB_URL = "file:data/test-settings-query/settings.db";
const TEST_DB_PATH = resolve(process.cwd(), "data/test-settings-query/settings.db");

// Use a fixed encryption key for deterministic testing
const TEST_ENCRYPTION_KEY = "a".repeat(64);

// biome-ignore lint/suspicious/noExplicitAny: Test setup requires untyped Drizzle bridge
let testDb: any;
let closeDb: () => void;

vi.mock("../../client", () => ({
  getDb: () => testDb,
  resetDbForTesting: vi.fn(),
}));

// Stub the env before importing modules that use it
vi.stubEnv("ENCRYPTION_SECRET", TEST_ENCRYPTION_KEY);

const { getSetting, setSetting, getAllSettings, getDecryptedApiKey } = await import("../settings");
const { settings } = await import("../../schema");

describe("settings query functions", () => {
  beforeAll(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    runMigrations(TEST_DB_URL);
    const opened = openSqliteDb(TEST_DB_PATH, { settings });
    testDb = opened.db;
    closeDb = opened.close;
  });

  afterAll(() => {
    closeDb();
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    testDb.delete(settings).run();
  });

  // -------------------------------------------------------------------------
  // setSetting / getSetting
  // -------------------------------------------------------------------------
  describe("setSetting and getSetting", () => {
    it("creates a new plaintext setting", () => {
      setSetting("theme", "dark");

      const row = getSetting("theme");
      expect(row).not.toBeNull();
      expect(row?.key).toBe("theme");
      expect(row?.value).toBe("dark");
      expect(row?.encrypted).toBe(false);
      expect(row?.updatedAt).toBeInstanceOf(Date);
    });

    it("updates an existing setting", () => {
      setSetting("theme", "light");
      setSetting("theme", "dark");

      const row = getSetting("theme");
      expect(row?.value).toBe("dark");
    });

    it("creates an encrypted setting", () => {
      setSetting("openrouterApiKey", "sk-or-v1-secret-key", true);

      const row = getSetting("openrouterApiKey");
      expect(row).not.toBeNull();
      expect(row?.encrypted).toBe(true);
      // Stored value should NOT be the plaintext
      expect(row?.value).not.toBe("sk-or-v1-secret-key");
      // Stored value should be in iv:authTag:data format
      expect(row?.value.split(":").length).toBe(3);
    });

    it("returns null for non-existent key", () => {
      expect(getSetting("nonexistent-key")).toBeNull();
    });

    it("updates encrypted flag when re-setting", () => {
      setSetting("myKey", "plain-value", false);
      expect(getSetting("myKey")?.encrypted).toBe(false);

      setSetting("myKey", "now-encrypted", true);
      expect(getSetting("myKey")?.encrypted).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // getAllSettings
  // -------------------------------------------------------------------------
  describe("getAllSettings", () => {
    it("returns all settings", () => {
      setSetting("theme", "light");
      setSetting("defaultModel", "anthropic/claude-sonnet-4");
      setSetting("openrouterApiKey", "key", true);

      const all = getAllSettings();
      expect(all.length).toBe(3);

      const keys = all.map((s) => s.key).sort();
      expect(keys).toEqual(["defaultModel", "openrouterApiKey", "theme"]);
    });

    it("returns empty array when no settings exist", () => {
      expect(getAllSettings()).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // getDecryptedApiKey
  // -------------------------------------------------------------------------
  describe("getDecryptedApiKey", () => {
    it("returns the decrypted API key", () => {
      const apiKey = "sk-or-v1-my-api-key-for-testing-12345";
      setSetting("openrouterApiKey", apiKey, true);

      const decrypted = getDecryptedApiKey();
      expect(decrypted).toBe(apiKey);
    });

    it("returns null when no API key is stored", () => {
      expect(getDecryptedApiKey()).toBeNull();
    });

    it("returns the value as-is when stored without encryption", () => {
      setSetting("openrouterApiKey", "plain-key", false);

      const result = getDecryptedApiKey();
      expect(result).toBe("plain-key");
    });
  });
});
