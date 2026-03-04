"use client";

import type { SkillStatus } from "@uberskillz/types";
import { useCallback, useState } from "react";

import { Pagination } from "@/components/pagination";
import { SkillCard } from "@/components/skill-card";
import { SkillListView } from "@/components/skill-list-view";
import {
  getStoredViewMode,
  SkillsLibraryControls,
  STORAGE_KEY,
  type ViewMode,
} from "@/components/skills-library-controls";

/** Skill shape passed from server to client — dates serialised as strings over the boundary. */
interface SkillData {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: SkillStatus;
  tags: string[] | string;
  updatedAt: Date;
}

interface SkillsLibraryViewProps {
  skills: SkillData[];
  /** Current 1-based page number. */
  page: number;
  /** Total number of pages. */
  totalPages: number;
  /** Total number of skills across all pages. */
  total: number;
  /** Items per page. */
  limit: number;
}

/**
 * Client wrapper that manages the grid/list view toggle state.
 * Reads initial preference from localStorage and persists changes.
 * Renders the controls toolbar, the appropriate view, and pagination.
 */
export function SkillsLibraryView({
  skills,
  page,
  totalPages,
  total,
  limit,
}: SkillsLibraryViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(getStoredViewMode);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, []);

  return (
    <>
      <SkillsLibraryControls viewMode={viewMode} onViewModeChange={handleViewModeChange} />

      {skills.length > 0 &&
        (viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {skills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        ) : (
          <SkillListView skills={skills} />
        ))}

      <Pagination page={page} totalPages={totalPages} total={total} limit={limit} />
    </>
  );
}
