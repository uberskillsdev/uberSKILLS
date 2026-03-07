import { Skeleton } from "@uberskills/ui";

import { LoadingSkeleton } from "@/components/loading-skeleton";

/** Loading skeleton for the Dashboard page (title, actions, stats, recent skills). */
export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <section>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </section>

      {/* Quick actions */}
      <section className="flex flex-wrap gap-3">
        <Skeleton className="h-10 w-28 rounded-md" />
        <Skeleton className="h-10 w-36 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </section>

      {/* Quick stats */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders never reorder
          <div key={i} className="rounded-lg border p-6">
            <Skeleton className="h-7 w-12" />
            <Skeleton className="mt-2 h-4 w-20" />
          </div>
        ))}
      </section>

      {/* Recent skills */}
      <section>
        <Skeleton className="mb-4 h-6 w-32" />
        <LoadingSkeleton variant="card-grid" count={3} className="lg:grid-cols-3" />
      </section>
    </div>
  );
}
