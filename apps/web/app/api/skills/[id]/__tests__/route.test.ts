import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@uberskillz/db", () => ({
  getSkillById: vi.fn(),
  listFiles: vi.fn(),
  updateSkill: vi.fn(),
  deleteSkill: vi.fn(),
  createVersion: vi.fn(),
}));

const { getSkillById, listFiles, updateSkill, deleteSkill, createVersion } = await import(
  "@uberskillz/db"
);
const mockedGetSkillById = vi.mocked(getSkillById);
const mockedListFiles = vi.mocked(listFiles);
const mockedUpdateSkill = vi.mocked(updateSkill);
const mockedDeleteSkill = vi.mocked(deleteSkill);
const mockedCreateVersion = vi.mocked(createVersion);

const { GET, PUT, DELETE } = await import("../route");

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

/** Creates a mock file row. */
function makeFile(overrides: Record<string, unknown> = {}) {
  return {
    id: "file_xyz789",
    skillId: "skill_abc123",
    path: "prompts/setup.md",
    content: "Setup prompt",
    type: "prompt",
    createdAt: MOCK_DATE,
    updatedAt: MOCK_DATE,
    ...overrides,
  };
}

/** Creates the route context with params promise. */
function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

/** Creates a GET request. */
function makeGetRequest(): Request {
  return new Request("http://localhost:3000/api/skills/skill_abc123", { method: "GET" });
}

/** Creates a PUT request with a JSON body. */
function makePutRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/skills/skill_abc123", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Creates a DELETE request. */
function makeDeleteRequest(): Request {
  return new Request("http://localhost:3000/api/skills/skill_abc123", { method: "DELETE" });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// GET /api/skills/[id]
// ---------------------------------------------------------------------------

describe("GET /api/skills/[id]", () => {
  it("returns skill with its files", async () => {
    const skill = makeSkill();
    const file = makeFile();
    mockedGetSkillById.mockReturnValue(skill as ReturnType<typeof getSkillById>);
    mockedListFiles.mockReturnValue([file] as ReturnType<typeof listFiles>);

    const response = await GET(makeGetRequest(), makeContext("skill_abc123"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe("Test Skill");
    expect(data.files).toHaveLength(1);
    expect(data.files[0].path).toBe("prompts/setup.md");
  });

  it("returns skill with empty files array", async () => {
    mockedGetSkillById.mockReturnValue(makeSkill() as ReturnType<typeof getSkillById>);
    mockedListFiles.mockReturnValue([]);

    const response = await GET(makeGetRequest(), makeContext("skill_abc123"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.files).toEqual([]);
  });

  it("returns 404 for nonexistent skill", async () => {
    mockedGetSkillById.mockReturnValue(null);

    const response = await GET(makeGetRequest(), makeContext("nonexistent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("returns 500 on database error", async () => {
    mockedGetSkillById.mockImplementation(() => {
      throw new Error("DB failure");
    });

    const response = await GET(makeGetRequest(), makeContext("skill_abc123"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe("SKILL_READ_ERROR");
  });
});

// ---------------------------------------------------------------------------
// PUT /api/skills/[id]
// ---------------------------------------------------------------------------

describe("PUT /api/skills/[id]", () => {
  it("updates skill fields and returns updated skill", async () => {
    const existing = makeSkill();
    const updated = makeSkill({ name: "Updated Name", slug: "updated-name" });
    mockedGetSkillById.mockReturnValue(existing as ReturnType<typeof getSkillById>);
    mockedUpdateSkill.mockReturnValue(updated as ReturnType<typeof updateSkill>);
    mockedCreateVersion.mockReturnValue({} as ReturnType<typeof createVersion>);

    const response = await PUT(
      makePutRequest({ name: "Updated Name" }),
      makeContext("skill_abc123"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe("Updated Name");
    expect(mockedUpdateSkill).toHaveBeenCalledWith(
      "skill_abc123",
      expect.objectContaining({ name: "Updated Name" }),
    );
  });

  it("creates a new version when content changes", async () => {
    const existing = makeSkill({ content: "old content" });
    const updated = makeSkill({ content: "new content" });
    mockedGetSkillById.mockReturnValue(existing as ReturnType<typeof getSkillById>);
    mockedUpdateSkill.mockReturnValue(updated as ReturnType<typeof updateSkill>);
    mockedCreateVersion.mockReturnValue({} as ReturnType<typeof createVersion>);

    await PUT(makePutRequest({ content: "new content" }), makeContext("skill_abc123"));

    expect(mockedCreateVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        skillId: "skill_abc123",
        changeSummary: expect.stringContaining("content"),
      }),
    );
  });

  it("creates a new version when metadata changes", async () => {
    const existing = makeSkill();
    const updated = makeSkill({ description: "new description" });
    mockedGetSkillById.mockReturnValue(existing as ReturnType<typeof getSkillById>);
    mockedUpdateSkill.mockReturnValue(updated as ReturnType<typeof updateSkill>);
    mockedCreateVersion.mockReturnValue({} as ReturnType<typeof createVersion>);

    await PUT(makePutRequest({ description: "new description" }), makeContext("skill_abc123"));

    expect(mockedCreateVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        changeSummary: expect.stringContaining("description"),
      }),
    );
  });

  it("does not create a version when only status changes", async () => {
    const existing = makeSkill();
    const updated = makeSkill({ status: "ready" });
    mockedGetSkillById.mockReturnValue(existing as ReturnType<typeof getSkillById>);
    mockedUpdateSkill.mockReturnValue(updated as ReturnType<typeof updateSkill>);

    await PUT(makePutRequest({ status: "ready" }), makeContext("skill_abc123"));

    expect(mockedCreateVersion).not.toHaveBeenCalled();
  });

  it("does not create a version when content is same as existing", async () => {
    const existing = makeSkill({ content: "same content" });
    const updated = makeSkill({ content: "same content" });
    mockedGetSkillById.mockReturnValue(existing as ReturnType<typeof getSkillById>);
    mockedUpdateSkill.mockReturnValue(updated as ReturnType<typeof updateSkill>);

    await PUT(makePutRequest({ content: "same content" }), makeContext("skill_abc123"));

    expect(mockedCreateVersion).not.toHaveBeenCalled();
  });

  it("returns 404 for nonexistent skill", async () => {
    mockedGetSkillById.mockReturnValue(null);

    const response = await PUT(makePutRequest({ name: "Updated" }), makeContext("nonexistent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("rejects empty name", async () => {
    mockedGetSkillById.mockReturnValue(makeSkill() as ReturnType<typeof getSkillById>);

    const response = await PUT(makePutRequest({ name: "" }), makeContext("skill_abc123"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.error).toContain("non-empty string");
  });

  it("rejects name exceeding max length", async () => {
    mockedGetSkillById.mockReturnValue(makeSkill() as ReturnType<typeof getSkillById>);

    const response = await PUT(
      makePutRequest({ name: "x".repeat(101) }),
      makeContext("skill_abc123"),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.error).toContain("at most 100");
  });

  it("rejects invalid status", async () => {
    mockedGetSkillById.mockReturnValue(makeSkill() as ReturnType<typeof getSkillById>);

    const response = await PUT(makePutRequest({ status: "invalid" }), makeContext("skill_abc123"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.error).toContain("status must be one of");
  });

  it("rejects invalid modelPattern regex", async () => {
    mockedGetSkillById.mockReturnValue(makeSkill() as ReturnType<typeof getSkillById>);

    const response = await PUT(
      makePutRequest({ modelPattern: "[invalid" }),
      makeContext("skill_abc123"),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.error).toContain("valid regular expression");
  });

  it("rejects non-array tags", async () => {
    mockedGetSkillById.mockReturnValue(makeSkill() as ReturnType<typeof getSkillById>);

    const response = await PUT(makePutRequest({ tags: "not-array" }), makeContext("skill_abc123"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("rejects invalid JSON body", async () => {
    const request = new Request("http://localhost:3000/api/skills/skill_abc123", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });

    const response = await PUT(request, makeContext("skill_abc123"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_JSON");
  });

  it("rejects description exceeding max length", async () => {
    mockedGetSkillById.mockReturnValue(makeSkill() as ReturnType<typeof getSkillById>);

    const response = await PUT(
      makePutRequest({ description: "x".repeat(501) }),
      makeContext("skill_abc123"),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("at most 500");
  });

  it("returns 500 on database error during update", async () => {
    mockedGetSkillById.mockReturnValue(makeSkill() as ReturnType<typeof getSkillById>);
    mockedUpdateSkill.mockImplementation(() => {
      throw new Error("DB failure");
    });

    const response = await PUT(makePutRequest({ name: "Updated" }), makeContext("skill_abc123"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe("SKILL_UPDATE_ERROR");
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/skills/[id]
// ---------------------------------------------------------------------------

describe("DELETE /api/skills/[id]", () => {
  it("deletes a skill and returns success", async () => {
    mockedDeleteSkill.mockReturnValue(true);

    const response = await DELETE(makeDeleteRequest(), makeContext("skill_abc123"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockedDeleteSkill).toHaveBeenCalledWith("skill_abc123");
  });

  it("returns 404 for nonexistent skill", async () => {
    mockedDeleteSkill.mockReturnValue(false);

    const response = await DELETE(makeDeleteRequest(), makeContext("nonexistent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("returns 500 on database error", async () => {
    mockedDeleteSkill.mockImplementation(() => {
      throw new Error("DB failure");
    });

    const response = await DELETE(makeDeleteRequest(), makeContext("skill_abc123"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe("SKILL_DELETE_ERROR");
  });
});
