import type { SkillFrontmatter, ValidationError } from "@uberskills/types";
import { Badge, Separator } from "@uberskills/ui";

interface ImportPreviewProps {
  frontmatter: SkillFrontmatter;
  content: string;
  errors: ValidationError[];
}

/**
 * Expandable preview of a parsed skill's frontmatter and content.
 * Shown inside the results table when a row is expanded.
 */
export function ImportPreview({ frontmatter, content, errors }: ImportPreviewProps) {
  return (
    <div className="space-y-4 px-2 py-3">
      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs font-medium uppercase text-muted-foreground">
            Validation Issues
          </span>
          <ul className="space-y-1">
            {errors.map((err) => (
              <li
                key={`${err.field}-${err.message}`}
                className="flex items-center gap-2 text-sm"
                style={{
                  color:
                    err.severity === "error"
                      ? "var(--status-error-text)"
                      : "var(--status-draft-text)",
                }}
              >
                <Badge
                  variant={err.severity === "error" ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {err.severity}
                </Badge>
                <span>
                  <strong>{err.field}:</strong> {err.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Frontmatter fields */}
      <div className="space-y-1">
        <span className="text-xs font-medium uppercase text-muted-foreground">Frontmatter</span>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="font-medium">Name</dt>
          <dd>{frontmatter.name || <span className="text-muted-foreground italic">empty</span>}</dd>

          <dt className="font-medium">Description</dt>
          <dd className="line-clamp-2">
            {frontmatter.description || <span className="text-muted-foreground italic">empty</span>}
          </dd>

          <dt className="font-medium">Trigger</dt>
          <dd className="font-mono text-xs">
            {frontmatter.trigger || <span className="text-muted-foreground italic">empty</span>}
          </dd>

          {frontmatter.model_pattern && (
            <>
              <dt className="font-medium">Model Pattern</dt>
              <dd className="font-mono text-xs">{frontmatter.model_pattern}</dd>
            </>
          )}
        </dl>
      </div>

      <Separator />

      {/* Content preview */}
      <div className="space-y-1">
        <span className="text-xs font-medium uppercase text-muted-foreground">
          Instructions Preview
        </span>
        <pre className="max-h-48 overflow-auto rounded-md border bg-muted/50 p-3 font-mono text-xs leading-relaxed">
          {content.slice(0, 2000) || "(empty)"}
          {content.length > 2000 && "\n..."}
        </pre>
      </div>
    </div>
  );
}
