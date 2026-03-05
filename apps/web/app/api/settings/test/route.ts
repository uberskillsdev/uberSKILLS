import { getDecryptedApiKey } from "@uberskills/db";
import { NextResponse } from "next/server";

import { routeLogger } from "@/lib/logger";

const log = routeLogger("GET", "/api/settings/test");

/**
 * GET /api/settings/test -- Tests the OpenRouter API key by calling their models endpoint.
 *
 * Decrypts the stored API key, sends a request to OpenRouter /api/v1/models,
 * and returns success or an appropriate error.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const apiKey = getDecryptedApiKey();
    if (!apiKey) {
      log.warn("no API key configured");
      return NextResponse.json(
        { error: "No API key configured. Add one in Settings first.", code: "NO_API_KEY" },
        { status: 401 },
      );
    }

    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://uberskills.dev",
        "X-Title": "UberSkills",
      },
    });

    if (!res.ok) {
      const status = res.status;
      if (status === 401 || status === 403) {
        log.warn({ upstreamStatus: status }, "invalid API key");
        return NextResponse.json(
          { error: "Invalid API key. Check your key at openrouter.ai/keys.", code: "INVALID_KEY" },
          { status: 401 },
        );
      }
      if (status === 429) {
        log.warn("rate limited by OpenRouter");
        return NextResponse.json(
          { error: "Rate limited by OpenRouter. Try again in a moment.", code: "RATE_LIMITED" },
          { status: 429 },
        );
      }
      log.warn({ upstreamStatus: status }, "upstream error from OpenRouter");
      return NextResponse.json(
        { error: `OpenRouter returned status ${status}`, code: "UPSTREAM_ERROR" },
        { status: 502 },
      );
    }

    log.info("API key test passed");
    return NextResponse.json({ status: "connected" });
  } catch (err) {
    log.error({ err }, "failed to reach OpenRouter");
    return NextResponse.json(
      {
        error: "Could not reach OpenRouter. Check your network connection.",
        code: "NETWORK_ERROR",
      },
      { status: 502 },
    );
  }
}
