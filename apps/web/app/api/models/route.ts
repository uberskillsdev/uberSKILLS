import { getDecryptedApiKey } from "@uberskillz/db";
import { NextResponse } from "next/server";

/** Model shape returned to the client. */
export interface OpenRouterModel {
  id: string;
  name: string;
  provider: string;
}

/** Raw model shape from the OpenRouter /api/v1/models response. */
interface OpenRouterRawModel {
  id: string;
  name: string;
  architecture?: { modality?: string };
}

/**
 * Checks whether a model supports text output (i.e. is chat-capable).
 * OpenRouter uses modality strings like "text->text", "text+image->text".
 * Models without modality info are included by default.
 */
function isChatCapable(model: OpenRouterRawModel): boolean {
  const modality = model.architecture?.modality;
  if (!modality) return true;
  return modality.split("->").pop()?.includes("text") ?? false;
}

/** Extracts the provider prefix from a model id (e.g. "anthropic/claude-3" → "anthropic"). */
function extractProvider(modelId: string): string {
  const slashIndex = modelId.indexOf("/");
  return slashIndex > 0 ? modelId.slice(0, slashIndex) : modelId;
}

/**
 * GET /api/models -- Fetches available models from OpenRouter.
 *
 * Requires a valid API key stored in settings. Returns chat-capable models
 * sorted by provider then name, each with { id, name, provider }.
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
      if (res.status === 401 || res.status === 403) {
        return NextResponse.json(
          { error: "Invalid API key", code: "INVALID_KEY" },
          { status: 401 },
        );
      }
      if (res.status === 429) {
        return NextResponse.json(
          { error: "Rate limited by OpenRouter. Try again shortly.", code: "RATE_LIMITED" },
          { status: 429 },
        );
      }
      return NextResponse.json(
        { error: `OpenRouter returned status ${res.status}`, code: "UPSTREAM_ERROR" },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { data: OpenRouterRawModel[] };

    const models: OpenRouterModel[] = (data.data ?? [])
      .filter(isChatCapable)
      .map((m) => ({ id: m.id, name: m.name, provider: extractProvider(m.id) }))
      .sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name));

    return NextResponse.json({ models });
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
