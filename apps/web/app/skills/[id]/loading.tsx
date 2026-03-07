import { Skeleton } from "@uberskills/ui";

/** Loading skeleton for the Skill Editor page (back link, title, tabs, form). */
export default function SkillEditorLoading() {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <Skeleton className="h-4 w-24" />

      {/* Title row: name + badge + actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </div>

      {/* Separator */}
      <Skeleton className="h-px w-full" />

      {/* Two-column layout: tab list + form content */}
      <div className="flex gap-6">
        {/* Tab sidebar */}
        <div className="flex w-48 shrink-0 flex-col gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders never reorder
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>

        {/* Form content area */}
        <div className="flex-1 space-y-6">
          {Array.from({ length: 4 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders never reorder
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
