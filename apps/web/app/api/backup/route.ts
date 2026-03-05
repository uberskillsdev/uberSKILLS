import { existsSync, readFileSync } from "node:fs";
import { NextResponse } from "next/server";

import { getDbPath } from "@/lib/db-path";
import { routeLogger } from "@/lib/logger";

const log = routeLogger("GET", "/api/backup");

/**
 * GET /api/backup -- Downloads the raw SQLite database file.
 *
 * Returns the database as an `application/octet-stream` attachment so the
 * browser triggers a download. Only works with local SQLite databases.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const dbPath = getDbPath();
    if (!dbPath) {
      log.warn("backup unsupported for non-local database");
      return NextResponse.json(
        { error: "Backup is only supported for local SQLite databases.", code: "UNSUPPORTED" },
        { status: 400 },
      );
    }

    if (!existsSync(dbPath)) {
      return NextResponse.json(
        { error: "Database file not found.", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const buffer = readFileSync(dbPath);
    const date = new Date().toISOString().slice(0, 10);
    const filename = `uberskills-backup-${date}.db`;

    log.info({ sizeBytes: buffer.length }, "backup downloaded");
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err) {
    log.error({ err }, "failed to create backup");
    return NextResponse.json(
      { error: "Failed to create backup.", code: "BACKUP_ERROR" },
      { status: 500 },
    );
  }
}
