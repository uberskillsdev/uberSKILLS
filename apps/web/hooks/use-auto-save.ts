"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Visual status shown to the user in the editor header. */
export type SaveStatus = "idle" | "saving" | "saved" | "error" | "conflict";

/** Debounce interval before an auto-save is triggered (ms). */
const DEBOUNCE_MS = 3_000;

/** How long the "Saved" indicator stays visible after a successful save (ms). */
const SAVED_DISPLAY_MS = 3_000;

/**
 * Serialisable snapshot of the editable skill fields.
 * Used to detect material changes between the last-saved state and the working copy.
 */
export interface SkillSnapshot {
  name: string;
  description: string;
  trigger: string;
  tags: string[];
  modelPattern: string | null;
  content: string;
}

interface UseAutoSaveOptions {
  /** The skill ID to PUT changes against. */
  skillId: string;
  /** The working-copy data reflecting the user's current edits. */
  current: SkillSnapshot;
  /** The last-persisted state from the server (used to detect material changes). */
  saved: SkillSnapshot;
  /** Called after a successful save so the parent can refresh server data. */
  onSaved?: () => void;
}

interface UseAutoSaveResult {
  /** Current save status for the UI indicator. */
  status: SaveStatus;
  /** Trigger an immediate save (manual "Save" button). */
  saveNow: () => void;
  /** Whether there are unsaved changes. */
  isDirty: boolean;
}

/** Produces a stable JSON string for shallow comparison of two snapshots. */
function serialise(snapshot: SkillSnapshot): string {
  return JSON.stringify([
    snapshot.name,
    snapshot.description,
    snapshot.trigger,
    [...snapshot.tags].sort(),
    snapshot.modelPattern,
    snapshot.content,
  ]);
}

/** Sends a JSON PUT and returns the response. Throws on network errors. */
async function putSkill(
  skillId: string,
  data: SkillSnapshot,
): Promise<{ ok: boolean; status: number; error?: string }> {
  const res = await fetch(`/api/skills/${skillId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: data.name.trim(),
      description: data.description,
      trigger: data.trigger,
      tags: data.tags,
      modelPattern: data.modelPattern,
      content: data.content,
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, status: res.status, error: body.error ?? `Request failed (${res.status})` };
  }
  return { ok: true, status: res.status };
}

/**
 * Auto-save hook for the skill editor.
 *
 * Watches `current` for changes relative to `saved`. When they differ, a
 * debounced PUT is scheduled after {@link DEBOUNCE_MS}. Provides a manual
 * `saveNow()` escape hatch and registers a `beforeunload` guard for unsaved
 * changes.
 */
export function useAutoSave({
  skillId,
  current,
  saved,
  onSaved,
}: UseAutoSaveOptions): UseAutoSaveResult {
  const [status, setStatus] = useState<SaveStatus>("idle");

  // Refs for values used inside async callbacks and timers
  const currentRef = useRef(current);
  currentRef.current = current;

  const savedRef = useRef(saved);
  savedRef.current = saved;

  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  const currentKey = serialise(current);
  const savedKey = serialise(saved);
  const isDirty = currentKey !== savedKey;

  // Core save function — shared by debounce and manual trigger
  const performSave = useCallback(async () => {
    // Avoid concurrent saves
    if (savingRef.current) return;

    const snapshot = currentRef.current;
    // Skip if nothing changed compared to server state
    if (serialise(snapshot) === serialise(savedRef.current)) {
      return;
    }

    savingRef.current = true;
    setStatus("saving");

    const result = await putSkill(skillId, snapshot);

    savingRef.current = false;

    if (result.ok) {
      setStatus("saved");
      onSavedRef.current?.();
      // Clear "Saved" indicator after a delay
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setStatus("idle"), SAVED_DISPLAY_MS);
    } else if (result.status === 409) {
      // Conflict — another process has modified the skill
      setStatus("conflict");
    } else {
      setStatus("error");
    }
  }, [skillId]);

  // Debounced auto-save: reset timer whenever the working copy changes.
  // `currentKey` is intentionally included so the effect re-runs (and the
  // debounce timer resets) on every material edit, even when `isDirty` remains true.
  // biome-ignore lint/correctness/useExhaustiveDependencies: currentKey restarts the debounce timer
  useEffect(() => {
    if (!isDirty) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      performSave();
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [isDirty, currentKey, performSave]);

  // Manual save — clears debounce timer and saves immediately
  const saveNow = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    performSave();
  }, [performSave]);

  // Warn user before navigating away with unsaved changes
  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  return { status, saveNow, isDirty };
}
