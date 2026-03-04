import { getDecryptedApiKey } from "@uberskillz/db";
import { NextResponse } from "next/server";

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
      return NextResponse.json(
        { error: "No API key configured. Add one in Settings first.", code: "NO_API_KEY" },
        { status: 401 },
      );
    }

    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://uberskillz.dev",
        "X-Title": "UberSkillz",
      },
    });

    if (!res.ok) {
      const status = res.status;
      if (status === 401 || status === 403) {
        return NextResponse.json(
          { error: "Invalid API key. Check your key at openrouter.ai/keys.", code: "INVALID_KEY" },
          { status: 401 },
        );
      }
      if (status === 429) {
        return NextResponse.json(
          { error: "Rate limited by OpenRouter. Try again in a moment.", code: "RATE_LIMITED" },
          { status: 429 },
        );
      }
      return NextResponse.json(
        { error: `OpenRouter returned status ${status}`, code: "UPSTREAM_ERROR" },
        { status: 502 },
      );
    }

    return NextResponse.json({ status: "connected" });
  } catch {
    return NextResponse.json(
      {
        error: "Could not reach OpenRouter. Check your network connection.",
        code: "NETWORK_ERROR",
      },
      { status: 502 },
    );
  }
}
