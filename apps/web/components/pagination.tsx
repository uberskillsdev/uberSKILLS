"use client";

import { Button, cn } from "@uberskillz/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface PaginationProps {
  /** Current 1-based page number. */
  page: number;
  /** Total number of pages. */
  totalPages: number;
  /** Total number of items across all pages. */
  total: number;
  /** Items per page. */
  limit: number;
}

/** A page number or an ellipsis gap between page numbers. */
type PageItem = { type: "page"; page: number } | { type: "ellipsis"; key: string };

/**
 * Generates a compact array of page items with ellipsis gaps.
 * Always shows first page, last page, and pages around the current page.
 *
 * Example for page=5, totalPages=10: [1, "...", 4, 5, 6, "...", 10]
 */
function getPageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => ({
      type: "page" as const,
      page: i + 1,
    }));
  }

  const items: PageItem[] = [{ type: "page", page: 1 }];

  if (page > 3) {
    items.push({ type: "ellipsis", key: "start-ellipsis" });
  }

  // Pages around the current page
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  for (let i = start; i <= end; i++) {
    items.push({ type: "page", page: i });
  }

  if (page < totalPages - 2) {
    items.push({ type: "ellipsis", key: "end-ellipsis" });
  }

  items.push({ type: "page", page: totalPages });

  return items;
}

/**
 * Pagination controls with previous/next buttons, page numbers, and a "Showing X-Y of Z" label.
 * Syncs the current page to URL search params for direct linking and shareability.
 */
export function Pagination({ page, totalPages, total, limit }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /** Navigate to a specific page by updating the `page` URL param. */
  const goToPage = useCallback(
    (targetPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (targetPage <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(targetPage));
      }
      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Don't render if there's only one page
  if (totalPages <= 1) return null;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);
  const pageItems = getPageItems(page, totalPages);

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      {/* "Showing X-Y of Z" label */}
      <p className="text-sm text-muted-foreground">
        Showing {startItem}–{endItem} of {total}
      </p>

      {/* Page controls */}
      <nav className="flex items-center gap-1" aria-label="Pagination">
        {/* Previous button */}
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={page <= 1}
          onClick={() => goToPage(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>

        {/* Page number buttons */}
        {pageItems.map((item) =>
          item.type === "ellipsis" ? (
            <span
              key={item.key}
              className="flex size-8 items-center justify-center text-sm text-muted-foreground"
              aria-hidden
            >
              ...
            </span>
          ) : (
            <Button
              key={item.page}
              variant={item.page === page ? "secondary" : "ghost"}
              size="icon"
              className={cn("size-8 text-sm", item.page === page && "font-semibold shadow-sm")}
              onClick={() => goToPage(item.page)}
              aria-label={`Page ${item.page}`}
              aria-current={item.page === page ? "page" : undefined}
            >
              {item.page}
            </Button>
          ),
        )}

        {/* Next button */}
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={page >= totalPages}
          onClick={() => goToPage(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
      </nav>
    </div>
  );
}
