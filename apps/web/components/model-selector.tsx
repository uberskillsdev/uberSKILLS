"use client";

import {
  Button,
  cn,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
} from "@uberskillz/ui";
import { AlertCircleIcon, CheckIcon, ChevronDownIcon, Loader2Icon, SearchIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { invalidateModelCache, type Model, useModels } from "@/hooks/use-models";

/** Groups a flat model list by provider name. */
function groupByProvider(models: Model[]): Map<string, Model[]> {
  const groups = new Map<string, Model[]>();
  for (const model of models) {
    const existing = groups.get(model.provider);
    if (existing) {
      existing.push(model);
    } else {
      groups.set(model.provider, [model]);
    }
  }
  return groups;
}

export interface ModelSelectorProps {
  /** Currently selected model ID. */
  value: string;
  /** Called when the user selects a different model. */
  onChange: (modelId: string) => void;
  /** Disables the selector entirely (e.g. when no API key is set). */
  disabled?: boolean;
  /** Additional CSS class names for the trigger button. */
  className?: string;
}

/**
 * Reusable model selector dropdown with provider grouping and search.
 * Used across skill creation (FR2), testing (FR4), and settings (FR7).
 */
export function ModelSelector({
  value,
  onChange,
  disabled = false,
  className,
}: ModelSelectorProps) {
  const { models, isLoading, error } = useModels();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Filter models by search query (matches against name, id, or provider).
  const filtered = useMemo(() => {
    if (!search) return models;
    const q = search.toLowerCase();
    return models.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q),
    );
  }, [models, search]);

  // Group filtered models by provider for sectioned display.
  const groups = useMemo(() => groupByProvider(filtered), [filtered]);

  // Resolve the display label for the currently selected model.
  const selectedModel = useMemo(() => models.find((m) => m.id === value), [models, value]);

  const handleSelect = useCallback(
    (modelId: string) => {
      onChange(modelId);
      setOpen(false);
      setSearch("");
    },
    [onChange],
  );

  const handleRetry = useCallback(() => {
    invalidateModelCache();
    // Force a re-render by toggling the popover.
    setOpen(false);
    setTimeout(() => setOpen(true), 100);
  }, []);

  // Reset search when popover closes.
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setSearch("");
  }, []);

  const triggerLabel = selectedModel ? selectedModel.name : "Select a model\u2026";

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select a model"
          disabled={disabled || isLoading}
          className={cn("w-full justify-between font-normal", className)}
        >
          {isLoading ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Loading models…
            </span>
          ) : (
            <span className="truncate">{triggerLabel}</span>
          )}
          <ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        {/* Error state */}
        {error ? (
          <div className="flex flex-col items-center gap-2 p-4 text-center text-sm">
            <AlertCircleIcon className="size-5 text-destructive" />
            <p className="text-muted-foreground">Failed to load models</p>
            <p className="text-xs text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            {/* Search input pinned at the top of the dropdown. */}
            <div className="border-b p-2">
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search models…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-sm"
                  // Prevent popover from closing when interacting with the input.
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setOpen(false);
                    }
                    e.stopPropagation();
                  }}
                />
              </div>
            </div>

            {/* Scrollable model list grouped by provider. */}
            <div
              className="max-h-60 overflow-y-auto p-1"
              role="listbox"
              aria-label="Available models"
            >
              {isLoading ? (
                <div className="space-y-2 p-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  {search ? "No models matching your search." : "No models available."}
                </p>
              ) : (
                Array.from(groups.entries()).map(([provider, providerModels]) => (
                  <fieldset key={provider} className="border-none p-0 m-0">
                    <legend className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      {provider}
                    </legend>
                    {providerModels.map((model) => {
                      const isSelected = model.id === value;
                      return (
                        <button
                          key={model.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          className={cn(
                            "flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                            isSelected && "bg-accent",
                          )}
                          onClick={() => handleSelect(model.id)}
                        >
                          <CheckIcon
                            className={cn(
                              "size-4 shrink-0",
                              isSelected ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <div className="flex flex-col items-start overflow-hidden">
                            <span className="truncate font-medium">{model.name}</span>
                            <span className="truncate text-xs text-muted-foreground">
                              {model.id}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </fieldset>
                ))
              )}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
