import {
  type CreateSkillInput,
  createSkill,
  createVersion,
  listSkills,
  type SkillSortKey,
} from "@uberskillz/db";
import type { SkillStatus } from "@uberskillz/types";
import { NextResponse } from "next/server";

const VALID_STATUSES: SkillStatus[] = ["draft", "ready", "deployed"];
const VALID_SORTS: SkillSortKey[] = ["updated", "name_asc", "name_desc", "newest", "oldest"];
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

// GET /api/skills — list skills with optional search, status filter, pagination, and sort
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") ?? undefined;
    const status = searchParams.get("status") as SkillStatus | null;
    const sort = searchParams.get("sort") as SkillSortKey | null;
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(", ")}`, code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    if (sort && !VALID_SORTS.includes(sort)) {
      return NextResponse.json(
        { error: `sort must be one of: ${VALID_SORTS.join(", ")}`, code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const parsedPage = page ? Number.parseInt(page, 10) : undefined;
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;

    if (parsedPage !== undefined && (Number.isNaN(parsedPage) || parsedPage < 1)) {
      return NextResponse.json(
        { error: "page must be a positive integer", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    if (parsedLimit !== undefined && (Number.isNaN(parsedLimit) || parsedLimit < 1)) {
      return NextResponse.json(
        { error: "limit must be a positive integer", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const result = listSkills({
      search,
      status: status ?? undefined,
      page: parsedPage,
      limit: parsedLimit,
      sort: sort ?? undefined,
    });

    return NextResponse.json({
      skills: result.data,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to list skills", code: "SKILLS_LIST_ERROR" },
      { status: 500 },
    );
  }
}

// POST /api/skills — create a new skill with an initial version
export async function POST(request: Request): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Request body must be a JSON object", code: "INVALID_BODY" },
      { status: 400 },
    );
  }

  const { name, description, trigger, tags, modelPattern, content } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "name is required and must be a non-empty string", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (name.length > MAX_NAME_LENGTH) {
    return NextResponse.json(
      { error: `name must be at most ${MAX_NAME_LENGTH} characters`, code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (description !== undefined && typeof description !== "string") {
    return NextResponse.json(
      { error: "description must be a string", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (typeof description === "string" && description.length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json(
      {
        error: `description must be at most ${MAX_DESCRIPTION_LENGTH} characters`,
        code: "VALIDATION_ERROR",
      },
      { status: 400 },
    );
  }

  if (trigger !== undefined && typeof trigger !== "string") {
    return NextResponse.json(
      { error: "trigger must be a string", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (tags !== undefined && (!Array.isArray(tags) || !tags.every((t) => typeof t === "string"))) {
    return NextResponse.json(
      { error: "tags must be an array of strings", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (modelPattern !== undefined && modelPattern !== null && typeof modelPattern !== "string") {
    return NextResponse.json(
      { error: "modelPattern must be a string or null", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (typeof modelPattern === "string" && modelPattern.length > 0) {
    try {
      new RegExp(modelPattern);
    } catch {
      return NextResponse.json(
        { error: "modelPattern must be a valid regular expression", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }
  }

  if (content !== undefined && typeof content !== "string") {
    return NextResponse.json(
      { error: "content must be a string", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  try {
    const input: CreateSkillInput = {
      name: (name as string).trim(),
      description: (description as string | undefined) ?? "",
      trigger: (trigger as string | undefined) ?? "",
      tags: (tags as string[] | undefined) ?? [],
      modelPattern: (modelPattern as string | null | undefined) ?? null,
      content: (content as string | undefined) ?? "",
    };

    const skill = createSkill(input);

    createVersion({
      skillId: skill.id,
      contentSnapshot: skill.content,
      metadataSnapshot: JSON.stringify({
        name: skill.name,
        description: skill.description,
        trigger: skill.trigger,
        model_pattern: skill.modelPattern,
      }),
      changeSummary: "Initial version",
    });

    return NextResponse.json(skill, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create skill", code: "SKILL_CREATE_ERROR" },
      { status: 500 },
    );
  }
}
