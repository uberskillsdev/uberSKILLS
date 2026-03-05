import { NextResponse } from "next/server";

import { routeLogger } from "@/lib/logger";
import { fetchAndSyncModels, isSyncError } from "@/lib/sync-models";

const log = routeLogger("POST", "/api/models/sync");

/** POST /api/models/sync -- Fetches models from OpenRouter and caches them in the database. */
export async function POST(): Promise<NextResponse> {
  try {
    const synced = await fetchAndSyncModels();
    log.info({ count: synced }, "models synced");
    return NextResponse.json({ synced });
  } catch (err) {
    log.error({ err }, "failed to sync models");
    if (isSyncError(err)) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.httpStatus });
    }
    return NextResponse.json(
      {
        error: "Could not reach OpenRouter. Check your network connection.",
        code: "NETWORK_ERROR",
      },
      { status: 502 },
    );
  }
}
