import { getSkillById, listVersions } from "@uberskills/db";
import { NextResponse } from "next/server";

import { routeLogger } from "@/lib/logger";

const log = routeLogger("GET", "/api/skills/[id]/versions");

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/skills/[id]/versions — list all versions for a skill
export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;
  const rlog = log.child({ skillId: id });

  try {
    const skill = getSkillById(id);
    if (!skill) {
      rlog.warn("skill not found");
      return NextResponse.json({ error: "Skill not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const versions = listVersions(id);
    rlog.info({ count: versions.length }, "versions listed");
    return NextResponse.json({ versions });
  } catch (err) {
    rlog.error({ err }, "failed to list versions");
    return NextResponse.json(
      { error: "Failed to list versions", code: "VERSIONS_READ_ERROR" },
      { status: 500 },
    );
  }
}
