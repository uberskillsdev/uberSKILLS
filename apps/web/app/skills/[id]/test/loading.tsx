import { Skeleton } from "@uberskills/ui";

/** Loading skeleton for the Skill Test page (config panel, response panel, history table). */
export default function SkillTestLoading() {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <Skeleton className="h-4 w-24" />

      {/* Two-panel split layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Config panel (left) */}
        <div className="space-y-4 rounded-lg border p-6">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-24 w-full rounded-md" />
          </div>
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        {/* Response panel (right) */}
        <div className="space-y-4 rounded-lg border p-6">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>

      {/* Test history table */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-28" />
        <div className="rounded-lg border">
          {/* Header row */}
          <div className="flex gap-4 border-b px-4 py-3">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-20" />
          </div>
          {/* Data rows */}
          {Array.from({ length: 3 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders never reorder
            <div key={i} className="flex gap-4 px-4 py-3">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
