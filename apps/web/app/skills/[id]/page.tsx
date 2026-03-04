import { getSkillBySlug, listFiles } from "@uberskillz/db";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import type { EditorFileData, EditorSkillData } from "@/components/editor/editor-shell";
import { EditorShell } from "@/components/editor/editor-shell";

// Always re-fetch on every request so the editor shows the latest data.
export const dynamic = "force-dynamic";

interface SkillEditorPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Skill Editor page (Server Component).
 *
 * Fetches the skill by its slug (the `[id]` segment) and serialises the
 * Drizzle rows into plain JSON for the client-side EditorShell.
 */
export default async function SkillEditorPage({ params }: SkillEditorPageProps) {
  const { id: slug } = await params;

  const skill = getSkillBySlug(slug);
  if (!skill) notFound();

  const files = listFiles(skill.id);

  // Drizzle returns Date objects for timestamp columns, but the client
  // component receives props as serialised JSON -- convert to ISO strings.
  // Tags are stored as a JSON string in SQLite; parse into a real array.
  const skillData: EditorSkillData = {
    id: skill.id,
    name: skill.name,
    slug: skill.slug,
    description: skill.description,
    trigger: skill.trigger,
    tags: typeof skill.tags === "string" ? (JSON.parse(skill.tags) as string[]) : skill.tags,
    modelPattern: skill.modelPattern,
    content: skill.content,
    status: skill.status,
    createdAt: skill.createdAt.toISOString(),
    updatedAt: skill.updatedAt.toISOString(),
  };

  const filesData: EditorFileData[] = files.map((f) => ({
    id: f.id,
    skillId: f.skillId,
    path: f.path,
    content: f.content,
    type: f.type,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }));

  // Suspense boundary is required because EditorShell calls useSearchParams(),
  // which needs a Suspense ancestor in the App Router.
  return (
    <Suspense>
      <EditorShell skill={skillData} files={filesData} />
    </Suspense>
  );
}
