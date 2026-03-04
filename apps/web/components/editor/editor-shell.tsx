"use client";

import type { SkillStatus } from "@uberskillz/types";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@uberskillz/ui";
import {
  ArrowLeft,
  Download,
  FileText,
  History,
  Loader2,
  Pencil,
  Play,
  Rocket,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";

// ---------------------------------------------------------------------------
// Types -- serialised shapes passed from the server component (Dates as ISO strings)
// ---------------------------------------------------------------------------

/** Skill data serialised for client consumption (Date fields as ISO strings). */
export interface EditorSkillData {
  id: string;
  name: string;
  slug: string;
  description: string;
  trigger: string;
  tags: string[];
  modelPattern: string | null;
  content: string;
  status: SkillStatus;
  createdAt: string;
  updatedAt: string;
}

/** Skill file row serialised for client consumption. */
export interface EditorFileData {
  id: string;
  skillId: string;
  path: string;
  content: string;
  type: "prompt" | "resource";
  createdAt: string;
  updatedAt: string;
}

interface EditorShellProps {
  skill: EditorSkillData;
  files: EditorFileData[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS = [
  { value: "metadata", label: "Metadata", icon: Settings2 },
  { value: "instructions", label: "Instructions", icon: Pencil },
  { value: "files", label: "Files", icon: FileText },
  { value: "preview", label: "Preview", icon: Play },
  { value: "history", label: "History", icon: History },
] as const;

type TabValue = (typeof TABS)[number]["value"];

const VALID_TAB_VALUES = new Set<string>(TABS.map((t) => t.value));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calls a JSON API endpoint and throws with the server error message on failure.
 * Centralises the fetch-check-parse-throw pattern used by all mutation handlers.
 */
async function apiFetch<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? `Request failed (${res.status})`);
  }

  return res.json() as Promise<T>;
}

/**
 * POST variant of apiFetch -- used by export and deploy which use POST, not PUT.
 * Returns the raw Response so callers can choose .json() or .blob().
 */
async function apiPost(url: string, body: Record<string, unknown>): Promise<Response> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? `Request failed (${res.status})`);
  }

  return res;
}

/** Extracts a human-readable message from an unknown caught value. */
function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/** Triggers a browser file download from a Blob. */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Skill Editor shell -- manages the tabbed interface, inline title editing,
 * status dropdown, and action buttons (Test, Export, Deploy).
 *
 * Tab panel content is placeholder for now (S4-2 through S4-6).
 */
export function EditorShell({ skill, files }: EditorShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Derive initial tab from ?tab= query param, falling back to "metadata"
  const tabParam = searchParams.get("tab");
  const initialTab: TabValue =
    tabParam && VALID_TAB_VALUES.has(tabParam) ? (tabParam as TabValue) : "metadata";

  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
  const [skillName, setSkillName] = useState(skill.name);
  const [status, setStatus] = useState<SkillStatus>(skill.status);
  const [isEditingName, setIsEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // -- Tab navigation -------------------------------------------------------

  /** Syncs tab state with the URL so the active tab survives page refresh. */
  const handleTabChange = useCallback(
    (value: string) => {
      const tab = value as TabValue;
      setActiveTab(tab);

      // "metadata" is the default, so we omit the param to keep the URL clean
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "metadata") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const query = params.toString();
      router.replace(`/skills/${skill.id}${query ? `?${query}` : ""}`, { scroll: false });
    },
    [router, searchParams, skill.id],
  );

  // -- Inline name editing --------------------------------------------------

  /** Persists the edited skill name, or reverts if empty / unchanged. */
  const saveSkillName = useCallback(async () => {
    const trimmed = skillName.trim();

    // Nothing to save -- revert to the original server value
    if (!trimmed || trimmed === skill.name) {
      setSkillName(skill.name);
      setIsEditingName(false);
      return;
    }

    setSavingName(true);
    try {
      await apiFetch(`/api/skills/${skill.id}`, { name: trimmed });
      toast.success("Skill renamed");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to rename skill"));
      setSkillName(skill.name);
    } finally {
      setSavingName(false);
      setIsEditingName(false);
    }
  }, [skillName, skill.name, skill.id, router]);

  /** Enter confirms, Escape reverts -- standard inline-edit keyboard UX. */
  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveSkillName();
      } else if (e.key === "Escape") {
        setSkillName(skill.name);
        setIsEditingName(false);
      }
    },
    [saveSkillName, skill.name],
  );

  /** Switches to edit mode and selects all text for quick replacement. */
  const startEditingName = useCallback(() => {
    setIsEditingName(true);
    // Wait one frame so the input is mounted before we can focus/select it
    requestAnimationFrame(() => nameInputRef.current?.select());
  }, []);

  // -- Status change --------------------------------------------------------

  /** Optimistically updates the status badge, reverting on API failure. */
  const handleStatusChange = useCallback(
    async (value: string) => {
      const newStatus = value as SkillStatus;
      const previousStatus = status;

      // Optimistic update -- show the new badge immediately
      setStatus(newStatus);
      setSavingStatus(true);

      try {
        await apiFetch(`/api/skills/${skill.id}`, { status: newStatus });
        toast.success(`Status changed to ${newStatus}`);
      } catch (err) {
        setStatus(previousStatus);
        toast.error(errorMessage(err, "Failed to update status"));
      } finally {
        setSavingStatus(false);
      }
    },
    [status, skill.id],
  );

  // -- Export / Deploy ------------------------------------------------------

  /** Downloads the skill as a zip archive. */
  const handleExport = useCallback(async () => {
    try {
      const res = await apiPost("/api/export", { skillId: skill.id });
      const blob = await res.blob();

      // Prefer the server-provided filename; fall back to slug-based name
      const disposition = res.headers.get("Content-Disposition");
      const filename = disposition?.match(/filename="(.+)"/)?.[1] ?? `${skill.slug}.zip`;

      triggerDownload(blob, filename);
      toast.success("Skill exported");
    } catch (err) {
      toast.error(errorMessage(err, "Export failed"));
    }
  }, [skill.id, skill.slug]);

  /** Deploys the skill to ~/.claude/skills/ and updates status to "deployed". */
  const handleDeploy = useCallback(async () => {
    try {
      const res = await apiPost("/api/export/deploy", { skillId: skill.id });
      const data = (await res.json()) as { path: string };
      toast.success(`Deployed to ${data.path}`);
      setStatus("deployed");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err, "Deploy failed"));
    }
  }, [skill.id, router]);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/skills">
          <ArrowLeft className="size-4" />
          Back to Library
        </Link>
      </Button>

      {/* Header: editable name, status dropdown, action buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* Inline editable skill name */}
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                ref={nameInputRef}
                type="text"
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                onBlur={saveSkillName}
                onKeyDown={handleNameKeyDown}
                className="h-9 rounded-md border border-input bg-background px-3 text-page-title tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Skill name"
                disabled={savingName}
              />
              {savingName && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            </div>
          ) : (
            <button
              type="button"
              onClick={startEditingName}
              className="group flex items-center gap-2 text-page-title tracking-tight hover:text-muted-foreground transition-colors"
              aria-label={`Edit skill name: ${skillName}`}
            >
              <h1>{skillName}</h1>
              <Pencil className="size-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}

          {/* Status dropdown */}
          <Select value={status} onValueChange={handleStatusChange} disabled={savingStatus}>
            <SelectTrigger className="w-[130px]" aria-label="Skill status">
              <SelectValue>
                <StatusBadge status={status} />
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">
                <StatusBadge status="draft" />
              </SelectItem>
              <SelectItem value="ready">
                <StatusBadge status="ready" />
              </SelectItem>
              <SelectItem value="deployed">
                <StatusBadge status="deployed" />
              </SelectItem>
            </SelectContent>
          </Select>

          {savingStatus && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/skills/${skill.id}/test`}>
              <Play className="size-4" />
              Test
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="size-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleDeploy}>
            <Rocket className="size-4" />
            Deploy
          </Button>
        </div>
      </div>

      <Separator />

      {/* Tabbed interface */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList variant="line" className="w-full justify-start">
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="gap-1.5">
              <Icon className="size-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="metadata" className="mt-6">
          <TabPlaceholder
            title="Metadata"
            description="Edit skill name, description, trigger, tags, and model pattern."
          />
        </TabsContent>

        <TabsContent value="instructions" className="mt-6">
          <TabPlaceholder
            title="Instructions"
            description="Write the skill's instruction content in Markdown."
          />
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <TabPlaceholder
            title="Files"
            description="Manage additional prompt and resource files."
            fileCount={files.length}
          />
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          <TabPlaceholder
            title="Preview"
            description="See the generated SKILL.md as it will be exported."
          />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <TabPlaceholder title="History" description="Browse past versions of this skill." />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab placeholder (S4-2 through S4-6 will replace these with real panels)
// ---------------------------------------------------------------------------

interface TabPlaceholderProps {
  title: string;
  description: string;
  fileCount?: number;
}

function TabPlaceholder({ title, description, fileCount }: TabPlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
      <h2 className="text-section-heading">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {fileCount !== undefined && (
        <p className="mt-1 text-xs text-muted-foreground">
          {fileCount} {fileCount === 1 ? "file" : "files"} attached
        </p>
      )}
      <p className="mt-4 text-xs text-muted-foreground">Coming soon</p>
    </div>
  );
}
