import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb, resetDbForTesting } from "../client";

// Store original env so we can restore it between tests
const originalEnv = { ...process.env };

describe("client", () => {
  beforeEach(() => {
    resetDbForTesting();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("getDb() with SQLite (file: prefix)", () => {
    const testDbDir = resolve(process.cwd(), "data/test-client");
    const testDbPath = `file:data/test-client/test.db`;

    afterEach(() => {
      // Clean up test database files
      if (existsSync(testDbDir)) {
        rmSync(testDbDir, { recursive: true, force: true });
      }
    });

    it("returns a Drizzle instance for file: URLs", () => {
      process.env.DATABASE_URL = testDbPath;
      const db = getDb();
      expect(db).toBeDefined();
      expect(db.query).toBeDefined();
    });

    it("auto-creates the data directory if it does not exist", () => {
      // Ensure the test directory doesn't exist
      if (existsSync(testDbDir)) {
        rmSync(testDbDir, { recursive: true, force: true });
      }

      process.env.DATABASE_URL = testDbPath;
      getDb();

      expect(existsSync(testDbDir)).toBe(true);
    });

    it("uses the default DATABASE_URL when env var is not set", () => {
      delete process.env.DATABASE_URL;

      // The default is file:data/uberskillz.db — this should create data/ dir
      const db = getDb();
      expect(db).toBeDefined();

      // Clean up default database
      const defaultDir = resolve(process.cwd(), "data");
      const defaultDb = resolve(defaultDir, "uberskillz.db");
      if (existsSync(defaultDb)) {
        rmSync(defaultDb, { force: true });
      }
    });

    it("returns the same instance on repeated calls (singleton)", () => {
      process.env.DATABASE_URL = testDbPath;
      const db1 = getDb();
      const db2 = getDb();
      expect(db1).toBe(db2);
    });

    it("resolves file paths relative to process.cwd()", () => {
      process.env.DATABASE_URL = testDbPath;
      getDb();

      const expectedDir = resolve(process.cwd(), "data/test-client");
      expect(existsSync(expectedDir)).toBe(true);
    });
  });

  describe("getDb() with Turso (libsql:// prefix)", () => {
    it("creates a libsql client for libsql:// URLs", () => {
      process.env.DATABASE_URL = "libsql://test-db.turso.io";
      process.env.TURSO_AUTH_TOKEN = "test-token";

      // The libsql client creation should succeed (though connecting would fail)
      const db = getDb();
      expect(db).toBeDefined();
      expect(db.query).toBeDefined();
    });

    it("returns the same instance on repeated calls (singleton)", () => {
      process.env.DATABASE_URL = "libsql://test-db.turso.io";
      process.env.TURSO_AUTH_TOKEN = "test-token";

      const db1 = getDb();
      const db2 = getDb();
      expect(db1).toBe(db2);
    });
  });

  describe("getDb() error handling", () => {
    it("throws for unsupported DATABASE_URL schemes", () => {
      process.env.DATABASE_URL = "postgres://localhost/db";

      expect(() => getDb()).toThrow("Unsupported DATABASE_URL scheme");
    });

    it("throws with the invalid URL in the error message", () => {
      process.env.DATABASE_URL = "mysql://localhost/db";

      expect(() => getDb()).toThrow("mysql://localhost/db");
    });
  });

  describe("resetDbForTesting()", () => {
    it("allows creating a new connection after reset", () => {
      const testDbDir = resolve(process.cwd(), "data/test-reset");
      const testDbPath = "file:data/test-reset/test.db";

      process.env.DATABASE_URL = testDbPath;
      const db1 = getDb();

      resetDbForTesting();

      const db2 = getDb();
      expect(db1).not.toBe(db2);

      // Clean up
      if (existsSync(testDbDir)) {
        rmSync(testDbDir, { recursive: true, force: true });
      }
    });
  });
});
