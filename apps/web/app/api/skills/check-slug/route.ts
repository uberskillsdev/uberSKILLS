import { getSkillBySlug } from "@uberskills/db";
import { NextResponse } from "next/server";

import { routeLogger } from "@/lib/logger";

const log = routeLogger("GET", "/api/skills/check-slug");

// GET /api/skills/check-slug?slug=my-skill&excludeId=abc123
// Returns { available: boolean } indicating whether the slug is free to use.
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug || slug.trim().length === 0) {
    log.warn("missing slug parameter");
    return NextResponse.json(
      { error: "slug query parameter is required", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const excludeId = searchParams.get("excludeId");
  const existing = getSkillBySlug(slug.trim());
  const available = !existing || existing.id === excludeId;

  log.debug({ slug, excludeId, available }, "slug check");
  return NextResponse.json({ available });
}
