import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import * as schema from "./schema";

const DEFAULT_DATABASE_URL = "file:data/uberskillz.db";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

let cachedDb: DbInstance | null = null;

/**
 * Returns a Drizzle ORM database instance, creating one if needed (singleton).
 *
 * Connection type is auto-detected from `DATABASE_URL`:
 * - `file:` prefix → local SQLite via bun:sqlite
 * - `libsql://` prefix → remote Turso via @libsql/client
 */
export function getDb(): DbInstance {
  if (cachedDb) {
    return cachedDb;
  }

  const url = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;

  if (url.startsWith("libsql://")) {
    cachedDb = createLibsqlClient(url);
  } else if (url.startsWith("file:")) {
    cachedDb = createSqliteClient(url);
  } else {
    throw new Error(
      `Unsupported DATABASE_URL scheme: "${url}". Expected "file:" or "libsql://" prefix.`,
    );
  }

  return cachedDb;
}

/**
 * Creates a local SQLite connection via bun:sqlite.
 * Auto-creates the parent directory for the database file if it doesn't exist.
 */
function createSqliteClient(url: string): DbInstance {
  // Strip "file:" prefix to get the filesystem path
  const relativePath = url.slice("file:".length);
  const absolutePath = resolve(process.cwd(), relativePath);

  // Ensure the directory exists
  const dir = dirname(absolutePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(absolutePath);

  // Enable WAL mode for better concurrent read performance
  sqlite.exec("PRAGMA journal_mode = WAL;");

  return drizzle(sqlite, { schema }) as unknown as DbInstance;
}

/**
 * Creates a remote Turso connection via @libsql/client.
 */
function createLibsqlClient(url: string): DbInstance {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require("@libsql/client") as typeof import("@libsql/client");

  const client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  return drizzleLibsql(client, { schema }) as unknown as DbInstance;
}

/**
 * Resets the cached database instance.
 * Intended for testing only — allows tests to create fresh connections.
 */
export function resetDbForTesting(): void {
  cachedDb = null;
}
