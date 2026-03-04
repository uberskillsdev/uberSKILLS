"use client";

import { useEffect, useRef, useState } from "react";

/** A model available via OpenRouter. */
export interface Model {
  id: string;
  name: string;
  provider: string;
}

/** Return type of the useModels() hook. */
export interface UseModelsReturn {
  models: Model[];
  isLoading: boolean;
  error: string | null;
}

/** How long the model list stays cached (5 minutes). */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Module-level cache shared across all hook instances. */
let cachedModels: Model[] | null = null;
let cacheExpiresAt = 0;

/**
 * Fetches available models from the `/api/models` proxy route and caches
 * the result for 5 minutes. Designed for use in model selector dropdowns
 * across skill creation (FR2), testing (FR4), and settings (FR7).
 *
 * Returns `{ models, isLoading, error }`. When no API key is configured,
 * returns an empty array with the error message from the server.
 */
export function useModels(): UseModelsReturn {
  const [models, setModels] = useState<Model[]>(cachedModels ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prevent duplicate concurrent fetches.
  const fetchingRef = useRef(false);

  useEffect(() => {
    async function fetchModels(): Promise<void> {
      // Serve from cache if still valid.
      if (cachedModels && Date.now() < cacheExpiresAt) {
        setModels(cachedModels);
        return;
      }

      if (fetchingRef.current) return;
      fetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/models");

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setError(data.error ?? `Failed to fetch models (${res.status})`);
          setModels([]);
          return;
        }

        const data = (await res.json()) as { models: Model[] };
        cachedModels = data.models;
        cacheExpiresAt = Date.now() + CACHE_TTL_MS;
        setModels(data.models);
      } catch {
        setError("Could not reach the server. Check your network connection.");
        setModels([]);
      } finally {
        setIsLoading(false);
        fetchingRef.current = false;
      }
    }

    fetchModels();
  }, []);

  return { models, isLoading, error };
}

/** Invalidates the model cache, forcing the next useModels() call to refetch. */
export function invalidateModelCache(): void {
  cachedModels = null;
  cacheExpiresAt = 0;
}
