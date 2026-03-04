import {
  createVersion,
  deleteSkill,
  getSkillById,
  listFiles,
  type UpdateSkillInput,
  updateSkill,
} from "@uberskillz/db";
import type { SkillStatus } from "@uberskillz/types";
import { NextResponse } from "next/server";

const VALID_STATUSES: SkillStatus[] = ["draft", "ready", "deployed"];
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/skills/[id] — returns a single skill with its associated files
export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;

  try {
    const skill = getSkillById(id);
    if (!skill) {
      return NextResponse.json({ error: "Skill not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const files = listFiles(id);

    return NextResponse.json({ ...skill, files });
  } catch {
    return NextResponse.json(
      { error: "Failed to retrieve skill", code: "SKILL_READ_ERROR" },
      { status: 500 },
    );
  }
}

// PUT /api/skills/[id] — updates skill fields; creates a new version if content or metadata changed
export async function PUT(request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;

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

  const existing = getSkillById(id);
  if (!existing) {
    return NextResponse.json({ error: "Skill not found", code: "NOT_FOUND" }, { status: 404 });
  }

  const { name, description, trigger, tags, modelPattern, content, status } = body;

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "name must be a non-empty string", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }
    if (name.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: `name must be at most ${MAX_NAME_LENGTH} characters`, code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }
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

  if (status !== undefined) {
    if (typeof status !== "string" || !VALID_STATUSES.includes(status as SkillStatus)) {
      return NextResponse.json(
        {
          error: `status must be one of: ${VALID_STATUSES.join(", ")}`,
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }
  }

  try {
    const input: UpdateSkillInput = {};
    if (name !== undefined) input.name = (name as string).trim();
    if (description !== undefined) input.description = description as string;
    if (trigger !== undefined) input.trigger = trigger as string;
    if (tags !== undefined) input.tags = tags as string[];
    if (modelPattern !== undefined) input.modelPattern = modelPattern as string | null;
    if (content !== undefined) input.content = content as string;
    if (status !== undefined) input.status = status as SkillStatus;

    const updated = updateSkill(id, input);
    if (!updated) {
      return NextResponse.json({ error: "Skill not found", code: "NOT_FOUND" }, { status: 404 });
    }

    // Create a new version when content or metadata materially changed
    const contentChanged = content !== undefined && content !== existing.content;
    const metadataChanged =
      (name !== undefined && name !== existing.name) ||
      (description !== undefined && description !== existing.description) ||
      (trigger !== undefined && trigger !== existing.trigger) ||
      (modelPattern !== undefined && modelPattern !== existing.modelPattern);

    if (contentChanged || metadataChanged) {
      const changes: string[] = [];
      if (contentChanged) changes.push("content");
      if (name !== undefined && name !== existing.name) changes.push("name");
      if (description !== undefined && description !== existing.description)
        changes.push("description");
      if (trigger !== undefined && trigger !== existing.trigger) changes.push("trigger");
      if (modelPattern !== undefined && modelPattern !== existing.modelPattern)
        changes.push("model pattern");

      createVersion({
        skillId: id,
        contentSnapshot: updated.content,
        metadataSnapshot: JSON.stringify({
          name: updated.name,
          description: updated.description,
          trigger: updated.trigger,
          model_pattern: updated.modelPattern,
        }),
        changeSummary: `Updated ${changes.join(", ")}`,
      });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Failed to update skill", code: "SKILL_UPDATE_ERROR" },
      { status: 500 },
    );
  }
}

// DELETE /api/skills/[id] — deletes a skill and all related data (files, versions, test runs)
export async function DELETE(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;

  try {
    const deleted = deleteSkill(id);
    if (!deleted) {
      return NextResponse.json({ error: "Skill not found", code: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete skill", code: "SKILL_DELETE_ERROR" },
      { status: 500 },
    );
  }
}
