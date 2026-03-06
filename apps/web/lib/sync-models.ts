import { getDecryptedApiKey, syncModels, type UpsertModelInput } from "@uberskills/db";

/** Raw model shape from the OpenRouter /api/v1/models response. */
interface OpenRouterRawModel {
  id: string;
  slug: string;
  name: string;
  architecture?: { modality?: string };
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
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

/** Error codes thrown by fetchAndSyncModels. */
export type SyncErrorCode = "NO_API_KEY" | "INVALID_KEY" | "RATE_LIMITED" | "UPSTREAM_ERROR";

export class SyncError extends Error {
  code: SyncErrorCode;
  httpStatus: number;

  constructor(message: string, code: SyncErrorCode, httpStatus: number) {
    super(message);
    this.name = "SyncError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

/** Type guard that works even when instanceof fails across module boundaries. */
export function isSyncError(err: unknown): err is SyncError {
  return err instanceof Error && "code" in err && "httpStatus" in err;
}

/**
 * Fetches models from OpenRouter, filters chat-capable ones,
 * and stores them in the database. Returns the number of models synced.
 */
export async function fetchAndSyncModels(): Promise<number> {
  const apiKey = getDecryptedApiKey();
  if (!apiKey) {
    throw new SyncError("No API key configured. Add one in Settings first.", "NO_API_KEY", 401);
  }

  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://uberskills.dev",
      "X-Title": "uberSKILLS",
    },
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new SyncError("Invalid API key", "INVALID_KEY", 401);
    }
    if (res.status === 429) {
      throw new SyncError("Rate limited by OpenRouter. Try again shortly.", "RATE_LIMITED", 429);
    }
    throw new SyncError(`OpenRouter returned status ${res.status}`, "UPSTREAM_ERROR", 502);
  }

  const data = (await res.json()) as { data: OpenRouterRawModel[] };

  const models: UpsertModelInput[] = (data.data ?? []).filter(isChatCapable).map((m) => ({
    id: m.id,
    slug: m.slug ?? null,
    name: m.name,
    provider: extractProvider(m.id),
    contextLength: m.context_length ?? null,
    inputPrice: m.pricing?.prompt ?? null,
    outputPrice: m.pricing?.completion ?? null,
    modality: m.architecture?.modality ?? null,
  }));

  return syncModels(models);
}
