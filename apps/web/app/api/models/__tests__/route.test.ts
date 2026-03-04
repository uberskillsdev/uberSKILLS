import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@uberskillz/db", () => ({
  getDecryptedApiKey: vi.fn(),
}));

const { getDecryptedApiKey } = await import("@uberskillz/db");
const mockedGetDecryptedApiKey = vi.mocked(getDecryptedApiKey);

const { GET } = await import("../route");

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("GET /api/models", () => {
  it("returns 401 when no API key is configured", async () => {
    mockedGetDecryptedApiKey.mockReturnValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.code).toBe("NO_API_KEY");
  });

  it("returns sorted model list with provider field on success", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-test");

    const mockModels = {
      data: [
        { id: "openai/gpt-4", name: "GPT-4", architecture: { modality: "text->text" } },
        {
          id: "anthropic/claude-sonnet-4",
          name: "Claude Sonnet 4",
          architecture: { modality: "text->text" },
        },
      ],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockModels), { status: 200 }),
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.models).toHaveLength(2);
    // Sorted by provider: anthropic before openai
    expect(data.models[0].id).toBe("anthropic/claude-sonnet-4");
    expect(data.models[0].provider).toBe("anthropic");
    expect(data.models[1].id).toBe("openai/gpt-4");
    expect(data.models[1].provider).toBe("openai");
  });

  it("filters out non-chat-capable models", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-test");

    const mockModels = {
      data: [
        { id: "openai/gpt-4", name: "GPT-4", architecture: { modality: "text->text" } },
        {
          id: "stability/sdxl",
          name: "Stable Diffusion",
          architecture: { modality: "text->image" },
        },
      ],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockModels), { status: 200 }),
    );

    const response = await GET();
    const data = await response.json();

    expect(data.models).toHaveLength(1);
    expect(data.models[0].id).toBe("openai/gpt-4");
  });

  it("includes models without architecture info", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-test");

    const mockModels = {
      data: [{ id: "unknown/model", name: "Unknown Model" }],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockModels), { status: 200 }),
    );

    const response = await GET();
    const data = await response.json();

    expect(data.models).toHaveLength(1);
    expect(data.models[0].provider).toBe("unknown");
  });

  it("returns 401 when OpenRouter returns 401", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-bad");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Unauthorized", { status: 401 }),
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.code).toBe("INVALID_KEY");
  });

  it("returns 429 when rate limited", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-key");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Too Many Requests", { status: 429 }),
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.code).toBe("RATE_LIMITED");
  });

  it("returns 502 on network error", async () => {
    mockedGetDecryptedApiKey.mockReturnValue("sk-or-v1-key");

    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network failure"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.code).toBe("NETWORK_ERROR");
  });
});
