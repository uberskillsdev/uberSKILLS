import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@uberskillz/db", () => ({
  listSkills: vi.fn(),
  createSkill: vi.fn(),
  createVersion: vi.fn(),
}));

const { listSkills, createSkill, createVersion } = await import("@uberskillz/db");
const mockedListSkills = vi.mocked(listSkills);
const mockedCreateSkill = vi.mocked(createSkill);
const mockedCreateVersion = vi.mocked(createVersion);

const { GET, POST } = await import("../route");

const MOCK_DATE = new Date("2026-01-15T12:00:00Z");

/** Creates a mock skill row. */
function makeSkill(overrides: Record<string, unknown> = {}) {
  return {
    id: "skill_abc123",
    name: "Test Skill",
    slug: "test-skill",
    description: "A test skill",
    trigger: "test trigger",
    tags: "[]",
    modelPattern: null,
    content: "# Instructions",
    status: "draft" as const,
    createdAt: MOCK_DATE,
    updatedAt: MOCK_DATE,
    ...overrides,
  };
}

/** Creates a GET request with query params. */
function makeGetRequest(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost:3000/api/skills");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString(), { method: "GET" });
}

/** Creates a POST request with a JSON body. */
function makePostRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/skills", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// GET /api/skills
// ---------------------------------------------------------------------------

describe("GET /api/skills", () => {
  it("returns paginated skills list with defaults", async () => {
    const skill = makeSkill();
    mockedListSkills.mockReturnValue({
      data: [skill],
      total: 1,
      page: 1,
      limit: 12,
      totalPages: 1,
    });

    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.skills).toHaveLength(1);
    expect(data.total).toBe(1);
    expect(data.page).toBe(1);
    expect(data.totalPages).toBe(1);
    expect(mockedListSkills).toHaveBeenCalledWith({
      search: undefined,
      status: undefined,
      page: undefined,
      limit: undefined,
      sort: undefined,
    });
  });

  it("passes search, status, page, limit, and sort params", async () => {
    mockedListSkills.mockReturnValue({
      data: [],
      total: 0,
      page: 2,
      limit: 5,
      totalPages: 0,
    });

    const response = await GET(
      makeGetRequest({
        search: "hello",
        status: "ready",
        page: "2",
        limit: "5",
        sort: "name_asc",
      }),
    );

    expect(response.status).toBe(200);
    expect(mockedListSkills).toHaveBeenCalledWith({
      search: "hello",
      status: "ready",
      page: 2,
      limit: 5,
      sort: "name_asc",
    });
  });

  it("returns empty list when no skills exist", async () => {
    mockedListSkills.mockReturnValue({
      data: [],
      total: 0,
      page: 1,
      limit: 12,
      totalPages: 0,
    });

    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.skills).toEqual([]);
    expect(data.total).toBe(0);
  });

  it("rejects invalid status value", async () => {
    const response = await GET(makeGetRequest({ status: "invalid" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.error).toContain("status must be one of");
  });

  it("rejects invalid sort value", async () => {
    const response = await GET(makeGetRequest({ sort: "random" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.error).toContain("sort must be one of");
  });

  it("rejects non-numeric page", async () => {
    const response = await GET(makeGetRequest({ page: "abc" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.error).toContain("page must be a positive integer");
  });

  it("rejects page less than 1", async () => {
    const response = await GET(makeGetRequest({ page: "0" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("rejects non-numeric limit", async () => {
    const response = await GET(makeGetRequest({ limit: "xyz" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.error).toContain("limit must be a positive integer");
  });

  it("returns 500 on database error", async () => {
    mockedListSkills.mockImplementation(() => {
      throw new Error("DB failure");
    });

    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe("SKILLS_LIST_ERROR");
  });
});

// ---------------------------------------------------------------------------
// POST /api/skills
// ---------------------------------------------------------------------------

describe("POST /api/skills", () => {
  it("creates a skill with all fields and initial version", async () => {
    const skill = makeSkill();
    mockedCreateSkill.mockReturnValue(skill as ReturnType<typeof createSkill>);
    mockedCreateVersion.mockReturnValue({} as ReturnType<typeof createVersion>);

    const response = await POST(
      makePostRequest({
        name: "Test Skill",
        description: "A test skill",
        trigger: "test trigger",
        tags: ["tag1", "tag2"],
        content: "# Instructions",
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.name).toBe("Test Skill");
    expect(mockedCreateSkill).toHaveBeenCalledWith({
      name: "Test Skill",
      description: "A test skill",
      trigger: "test trigger",
      tags: ["tag1", "tag2"],
      modelPattern: null,
      content: "# Instructions",
    });
    expect(mockedCreateVersion).toHaveBeenCalledWith({
      skillId: "skill_abc123",
      contentSnapshot: "# Instructions",
      metadataSnapshot: expect.any(String),
      changeSummary: "Initial version",
    });
  });

  it("creates a skill with only the required name field", async () => {
    const skill = makeSkill({ name: "Minimal" });
    mockedCreateSkill.mockReturnValue(skill as ReturnType<typeof createSkill>);
    mockedCreateVersion.mockReturnValue({} as ReturnType<typeof createVersion>);

    const response = await POST(makePostRequest({ name: "Minimal" }));

    expect(response.status).toBe(201);
    expect(mockedCreateSkill).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Minimal",
        description: "",
        trigger: "",
        tags: [],
        content: "",
      }),
    );
  });

  it("trims whitespace from name", async () => {
    const skill = makeSkill({ name: "Trimmed" });
    mockedCreateSkill.mockReturnValue(skill as ReturnType<typeof createSkill>);
    mockedCreateVersion.mockReturnValue({} as ReturnType<typeof createVersion>);

    await POST(makePostRequest({ name: "  Trimmed  " }));

    expect(mockedCreateSkill).toHaveBeenCalledWith(expect.objectContaining({ name: "Trimmed" }));
  });

  it("rejects missing name", async () => {
    const response = await POST(makePostRequest({ description: "no name" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.error).toContain("name is required");
  });

  it("rejects empty string name", async () => {
    const response = await POST(makePostRequest({ name: "   " }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("rejects name exceeding max length", async () => {
    const response = await POST(makePostRequest({ name: "x".repeat(101) }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.error).toContain("at most 100");
  });

  it("rejects description exceeding max length", async () => {
    const response = await POST(makePostRequest({ name: "Valid", description: "x".repeat(501) }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.error).toContain("at most 500");
  });

  it("rejects non-string description", async () => {
    const response = await POST(makePostRequest({ name: "Valid", description: 123 }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.error).toContain("description must be a string");
  });

  it("rejects non-string trigger", async () => {
    const response = await POST(makePostRequest({ name: "Valid", trigger: true }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.error).toContain("trigger must be a string");
  });

  it("rejects non-array tags", async () => {
    const response = await POST(makePostRequest({ name: "Valid", tags: "not-array" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.error).toContain("tags must be an array");
  });

  it("rejects tags containing non-strings", async () => {
    const response = await POST(makePostRequest({ name: "Valid", tags: [1, 2] }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("rejects invalid modelPattern regex", async () => {
    const response = await POST(makePostRequest({ name: "Valid", modelPattern: "[invalid" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.error).toContain("valid regular expression");
  });

  it("rejects invalid JSON body", async () => {
    const request = new Request("http://localhost:3000/api/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_JSON");
  });

  it("rejects array body", async () => {
    const response = await POST(makePostRequest([{ name: "test" }]));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_BODY");
  });

  it("returns 500 on database error", async () => {
    mockedCreateSkill.mockImplementation(() => {
      throw new Error("DB failure");
    });

    const response = await POST(makePostRequest({ name: "Test" }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe("SKILL_CREATE_ERROR");
  });
});
