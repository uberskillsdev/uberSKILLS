"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@uberskills/ui";
import { FolderSearch, Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import type { ScanResult, SelectionState } from "@/components/import/import-results-table";
import { ImportResultsTable } from "@/components/import/import-results-table";
import { PageHeader } from "@/components/page-header";

type ImportPhase = "idle" | "scanning" | "results" | "importing";

/**
 * Import page (S6-6).
 *
 * Two import methods: zip upload and directory scan.
 * After scan/upload, shows a results table with validation status and conflict detection.
 * Users select skills to import and confirm.
 */
export default function ImportPage() {
  const router = useRouter();

  const [phase, setPhase] = useState<ImportPhase>("idle");
  const [directoryPath, setDirectoryPath] = useState("~/.claude/skills/");
  const [results, setResults] = useState<ScanResult[]>([]);
  const [selections, setSelections] = useState<Map<number, SelectionState>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Build default selection state from scan results. Valid skills checked, invalid unchecked. */
  const buildSelections = useCallback((scanResults: ScanResult[]) => {
    const map = new Map<number, SelectionState>();
    for (let i = 0; i < scanResults.length; i++) {
      const r = scanResults[i];
      if (r) {
        map.set(i, { selected: r.valid, overwrite: false });
      }
    }
    return map;
  }, []);

  /** Handle directory scan. */
  const handleScanDirectory = useCallback(async () => {
    if (!directoryPath.trim()) {
      toast.error("Please enter a directory path");
      return;
    }

    setPhase("scanning");
    setError(null);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "directory", path: directoryPath.trim() }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error: string };
        throw new Error(err.error ?? "Failed to scan directory");
      }

      const data = (await res.json()) as { skills: ScanResult[] };
      setResults(data.skills);
      setSelections(buildSelections(data.skills));
      setPhase("results");

      if (data.skills.length === 0) {
        toast.info("No skills found in the specified directory");
        setPhase("idle");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to scan directory";
      setError(message);
      toast.error(message);
      setPhase("idle");
    }
  }, [directoryPath, buildSelections]);

  /** Handle zip file selection. */
  const handleFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset the input so the same file can be selected again
      e.target.value = "";

      setPhase("scanning");
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/import", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = (await res.json()) as { error: string };
          throw new Error(err.error ?? "Failed to process zip file");
        }

        const data = (await res.json()) as { skills: ScanResult[] };
        setResults(data.skills);
        setSelections(buildSelections(data.skills));
        setPhase("results");

        if (data.skills.length === 0) {
          toast.info("No skills found in the zip file");
          setPhase("idle");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to process zip file";
        setError(message);
        toast.error(message);
        setPhase("idle");
      }
    },
    [buildSelections],
  );

  /** Confirm import of selected skills. */
  const handleImport = useCallback(async () => {
    const selectedSkills = results
      .map((result, index) => {
        const sel = selections.get(index);
        if (!sel?.selected) return null;
        // For conflicting skills, only import if overwrite is set
        if (result.conflict && !sel.overwrite) return null;
        return {
          frontmatter: result.skill.frontmatter,
          content: result.skill.content,
          files: result.files,
          overwrite: sel.overwrite,
        };
      })
      .filter(Boolean);

    if (selectedSkills.length === 0) {
      toast.error("No skills selected for import");
      return;
    }

    setPhase("importing");

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "confirm", skills: selectedSkills }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error: string };
        throw new Error(err.error ?? "Failed to import skills");
      }

      const data = (await res.json()) as {
        imported: { id: string; name: string; action: string }[];
      };
      toast.success(
        `Imported ${data.imported.length} skill${data.imported.length === 1 ? "" : "s"}`,
      );
      router.push("/skills");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to import skills";
      toast.error(message);
      setPhase("results");
    }
  }, [results, selections, router]);

  let selectedCount = 0;
  for (const [index, sel] of selections) {
    if (!sel.selected) continue;
    const result = results[index];
    if (result?.conflict && !sel.overwrite) continue;
    selectedCount++;
  }

  const isScanning = phase === "scanning";
  const isImporting = phase === "importing";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Import Skills"
        description="Import skills from a zip file or scan a directory on your filesystem."
      />

      {/* Import Methods */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Zip Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="size-4" />
              Upload Zip
            </CardTitle>
            <CardDescription>
              Upload a .zip archive containing one or more skill directories with SKILL.md files.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning || isImporting}
              className="w-full"
            >
              {isScanning ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Choose .zip File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleFileSelected}
              className="hidden"
              aria-label="Select zip file to import"
            />
          </CardContent>
        </Card>

        {/* Directory Scan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderSearch className="size-4" />
              Scan Directory
            </CardTitle>
            <CardDescription>
              Scan a local directory for skill folders containing SKILL.md files.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={directoryPath}
                onChange={(e) => setDirectoryPath(e.target.value)}
                placeholder="~/.claude/skills/"
                className="font-mono text-sm"
                disabled={isScanning || isImporting}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleScanDirectory();
                }}
                aria-label="Directory path to scan"
              />
              <Button
                variant="outline"
                onClick={handleScanDirectory}
                disabled={isScanning || isImporting}
              >
                {isScanning ? <Loader2 className="size-4 animate-spin" /> : null}
                Scan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error display */}
      {error && phase === "idle" && (
        <Card className="border-destructive/50">
          <CardContent className="py-4 text-sm" style={{ color: "var(--status-error-text)" }}>
            {error}
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isScanning && (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Scanning for skills...</span>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {phase === "results" && results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scan Results</CardTitle>
            <CardDescription>
              {results.length} skill{results.length === 1 ? "" : "s"} found. Select which skills to
              import.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImportResultsTable
              results={results}
              selections={selections}
              onSelectionChange={setSelections}
            />

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  setPhase("idle");
                  setResults([]);
                  setSelections(new Map());
                  setError(null);
                }}
              >
                Clear Results
              </Button>
              <Button onClick={handleImport} disabled={selectedCount === 0 || isImporting}>
                {isImporting ? <Loader2 className="size-4 animate-spin" /> : null}
                Import Selected ({selectedCount})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state (initial) */}
      {phase === "idle" && results.length === 0 && !error && (
        <EmptyState
          icon={Upload}
          title="Import skills"
          description="Upload a .zip file or scan a directory to import existing skills. Skills are expected to be in directories containing a SKILL.md file with YAML frontmatter."
        />
      )}
    </div>
  );
}
