import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_DATABASE_URL, openSqliteDb, resolveFileUrl } from "./sqlite-utils";

/**
 * Path to the generated Drizzle migration files (resolved from this module's directory).
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_FOLDER = resolve(__dirname, "migrations");

/**
 * Runs all pending Drizzle migrations against the SQLite database at `DATABASE_URL`.
 *
 * Uses better-sqlite3 + drizzle-orm/better-sqlite3 migrator.
 *
 * For Turso / libsql URLs, migrations are skipped (use `drizzle-kit push` instead).
 */
export function runMigrations(databaseUrl?: string): void {
  const url = databaseUrl ?? process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;

  if (!url.startsWith("file:")) {
    console.warn(`Skipping auto-migration: migrator only supports file: URLs (got "${url}").`);
    return;
  }

  const absolutePath = resolveFileUrl(url);
  const { db, close } = openSqliteDb(absolutePath);

  const { migrate } = require("drizzle-orm/better-sqlite3/migrator");
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

  close();
}

// Allow running as a standalone script: `tsx packages/db/src/migrate.ts`
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  runMigrations();
  console.log("Migrations applied successfully.");
}
