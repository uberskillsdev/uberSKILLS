"use client";

import type { SkillFrontmatter, ValidationError } from "@uberskills/types";
import {
  Badge,
  Button,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@uberskills/ui";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { useCallback, useState } from "react";
import { ImportPreview } from "./import-preview";

/** A single skill scan result enriched with slug and conflict info from the API. */
export interface ScanResult {
  skill: { frontmatter: SkillFrontmatter; content: string };
  files: { path: string; content: string; type: "prompt" | "resource" }[];
  valid: boolean;
  errors: ValidationError[];
  source: string;
  slug: string;
  conflict: boolean;
}

/** Tracks selection and overwrite preference per result index. */
export interface SelectionState {
  selected: boolean;
  overwrite: boolean;
}

interface ImportResultsTableProps {
  results: ScanResult[];
  selections: Map<number, SelectionState>;
  onSelectionChange: (selections: Map<number, SelectionState>) => void;
}

/**
 * Results table for imported/scanned skills.
 * Displays checkbox, name, valid/invalid status, description, and conflict info.
 * Rows are expandable to show parsed frontmatter and content preview.
 */
export function ImportResultsTable({
  results,
  selections,
  onSelectionChange,
}: ImportResultsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleExpand = useCallback((index: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const toggleSelect = useCallback(
    (index: number) => {
      const next = new Map(selections);
      const current = next.get(index);
      if (current) {
        next.set(index, { ...current, selected: !current.selected });
      }
      onSelectionChange(next);
    },
    [selections, onSelectionChange],
  );

  const toggleOverwrite = useCallback(
    (index: number) => {
      const next = new Map(selections);
      const current = next.get(index);
      if (current) {
        next.set(index, { ...current, overwrite: !current.overwrite });
      }
      onSelectionChange(next);
    },
    [selections, onSelectionChange],
  );

  /** Toggle all valid skills. */
  const toggleAll = useCallback(() => {
    const allValid = results.every((r, i) => !r.valid || selections.get(i)?.selected);
    const next = new Map(selections);
    for (let i = 0; i < results.length; i++) {
      const current = next.get(i);
      if (current && results[i]?.valid) {
        next.set(i, { ...current, selected: !allValid });
      }
    }
    onSelectionChange(next);
  }, [results, selections, onSelectionChange]);

  const allValidSelected = results.every((r, i) => !r.valid || selections.get(i)?.selected);
  const selectedCount = Array.from(selections.values()).filter((s) => s.selected).length;

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allValidSelected && results.some((r) => r.valid)}
                onCheckedChange={toggleAll}
                aria-label="Select all valid skills"
              />
            </TableHead>
            <TableHead className="w-8" />
            <TableHead>Name</TableHead>
            <TableHead className="w-24">Status</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-32">Conflict</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result, index) => {
            const sel = selections.get(index);
            const isExpanded = expandedRows.has(index);
            return (
              <ResultRow
                key={result.source}
                result={result}
                index={index}
                selected={sel?.selected ?? false}
                overwrite={sel?.overwrite ?? false}
                expanded={isExpanded}
                onToggleSelect={toggleSelect}
                onToggleExpand={toggleExpand}
                onToggleOverwrite={toggleOverwrite}
              />
            );
          })}
        </TableBody>
      </Table>

      <p className="text-sm text-muted-foreground">
        {selectedCount > 0
          ? `${selectedCount} of ${results.length} skills selected`
          : "No skills selected"}
      </p>
    </div>
  );
}

interface ResultRowProps {
  result: ScanResult;
  index: number;
  selected: boolean;
  overwrite: boolean;
  expanded: boolean;
  onToggleSelect: (index: number) => void;
  onToggleExpand: (index: number) => void;
  onToggleOverwrite: (index: number) => void;
}

function ResultRow({
  result,
  index,
  selected,
  overwrite,
  expanded,
  onToggleSelect,
  onToggleExpand,
  onToggleOverwrite,
}: ResultRowProps) {
  const { skill, errors, valid, conflict } = result;
  const name = skill.frontmatter.name || "(unnamed)";
  const description = skill.frontmatter.description || "";

  return (
    <>
      <TableRow className="cursor-pointer" onClick={() => onToggleExpand(index)}>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect(index)}
            disabled={!valid}
            aria-label={`Select ${name}`}
          />
        </TableCell>
        <TableCell>
          {expanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell className="font-medium">{name}</TableCell>
        <TableCell>
          {valid ? (
            <Badge
              className="text-xs"
              style={{
                backgroundColor: "var(--status-success-bg)",
                color: "var(--status-success-text)",
              }}
            >
              Valid
            </Badge>
          ) : (
            <Badge
              className="text-xs"
              style={{
                backgroundColor: "var(--status-error-bg)",
                color: "var(--status-error-text)",
              }}
            >
              Invalid
            </Badge>
          )}
        </TableCell>
        <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
          {description.length > 120 ? `${description.slice(0, 120)}...` : description}
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          {conflict && (
            <div className="flex items-center gap-1.5">
              <AlertTriangle
                className="size-3.5 shrink-0"
                style={{ color: "var(--status-error-text)" }}
              />
              <Button
                variant={overwrite ? "destructive" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => onToggleOverwrite(index)}
              >
                {overwrite ? "Will overwrite" : "Overwrite?"}
              </Button>
            </div>
          )}
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/30 p-0">
            <ImportPreview
              frontmatter={skill.frontmatter}
              content={skill.content}
              errors={errors}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
