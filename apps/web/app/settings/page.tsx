"use client";

import type { AppSettings } from "@uberskillz/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@uberskillz/ui";
import { CheckCircle2, Eye, EyeOff, Key, Loader2, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";

type ConnectionStatus = "idle" | "testing" | "connected" | "error";

/**
 * Settings page -- API key management section (S3-2).
 *
 * Allows users to configure their OpenRouter API key with:
 * - Password-masked input that shows last 4 chars
 * - Show/hide toggle for the full key
 * - Test connectivity button that validates against OpenRouter
 * - Auto-save on blur (no form submit)
 * - Toast notifications for save/test feedback
 */
export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // API key form state
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [connectionError, setConnectionError] = useState("");
  const [saving, setSaving] = useState(false);

  // Track whether the user has edited the key (vs. just viewing the masked value)
  const [keyEdited, setKeyEdited] = useState(false);

  // Ref to prevent double-saving on blur when the save button is also clicked
  const savingRef = useRef(false);

  // Fetch current settings on mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) throw new Error("Failed to load settings");
        const data = (await res.json()) as AppSettings;
        setSettings(data);
        // Show masked key in the input (user sees dots + last 4 chars)
        setApiKey(data.openrouterApiKey ?? "");
      } catch {
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  /**
   * Saves the API key to the server via PUT /api/settings.
   * Only sends the key if the user has actually edited it
   * (avoids sending the masked value back).
   */
  const saveApiKey = useCallback(async () => {
    if (!keyEdited || savingRef.current) return;

    savingRef.current = true;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openrouterApiKey: apiKey }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error: string };
        throw new Error(err.error ?? "Failed to save API key");
      }

      const updated = (await res.json()) as AppSettings;
      setSettings(updated);
      setKeyEdited(false);
      // After saving, show the masked version returned by the server
      setApiKey(updated.openrouterApiKey ?? "");
      setShowKey(false);
      // Reset connection status since key changed
      setConnectionStatus("idle");
      toast.success("API key saved");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save API key";
      toast.error(message);
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  }, [apiKey, keyEdited]);

  /**
   * Tests the OpenRouter API key by calling their /api/v1/models endpoint.
   * A successful response means the key is valid and connected.
   */
  const testConnection = useCallback(async () => {
    setConnectionStatus("testing");
    setConnectionError("");

    try {
      const res = await fetch("/api/settings/test");

      if (!res.ok) {
        const err = (await res.json()) as { error: string };
        throw new Error(err.error ?? "Connection test failed");
      }

      setConnectionStatus("connected");
      toast.success("Connected to OpenRouter");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection test failed";
      setConnectionStatus("error");
      setConnectionError(message);
      toast.error(message);
    }
  }, []);

  /** Handles input change -- marks the key as user-edited. */
  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setApiKey(value);
    if (!keyEdited) setKeyEdited(true);
  };

  /** Saves on blur when the key has been edited. */
  const handleKeyBlur = () => {
    if (keyEdited) {
      saveApiKey();
    }
  };

  /** Handles Enter key to trigger save. */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (keyEdited) saveApiKey();
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Settings" description="Manage your API configuration and preferences." />
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasKey = settings?.openrouterApiKey !== null;

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Manage your API configuration and preferences." />

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="size-5" />
            API Configuration
          </CardTitle>
          <CardDescription>
            Connect your OpenRouter API key to enable AI-powered skill creation and testing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* API Key Input */}
          <div className="space-y-2">
            <label htmlFor="api-key" className="text-sm font-medium">
              OpenRouter API Key
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="api-key"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={handleKeyChange}
                  onBlur={handleKeyBlur}
                  onKeyDown={handleKeyDown}
                  placeholder="sk-or-v1-..."
                  className="pr-10 font-mono"
                  aria-describedby="api-key-help"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-1/2 right-1 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowKey(!showKey)}
                  aria-label={showKey ? "Hide API key" : "Show API key"}
                >
                  {showKey ? (
                    <EyeOff className="size-4 text-muted-foreground" />
                  ) : (
                    <Eye className="size-4 text-muted-foreground" />
                  )}
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={testConnection}
                disabled={!hasKey || connectionStatus === "testing"}
              >
                {connectionStatus === "testing" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Test
              </Button>

              {saving && (
                <Button variant="outline" disabled>
                  <Loader2 className="size-4 animate-spin" />
                  Saving
                </Button>
              )}
            </div>

            {/* Help text or connection status */}
            <div id="api-key-help">
              {!hasKey && !keyEdited ? (
                <p className="text-sm text-muted-foreground">
                  Get your API key from{" "}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                  >
                    openrouter.ai/keys
                  </a>
                  . Your key is encrypted before storage.
                </p>
              ) : null}

              <ConnectionStatusIndicator status={connectionStatus} error={connectionError} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Renders a connection status indicator with appropriate icon and message.
 * Only visible when the status is not "idle".
 */
function ConnectionStatusIndicator({ status, error }: { status: ConnectionStatus; error: string }) {
  if (status === "idle") return null;

  if (status === "testing") {
    return (
      <output className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Testing connection...
      </output>
    );
  }

  if (status === "connected") {
    return (
      <output
        className="flex items-center gap-2 text-sm"
        style={{ color: "var(--status-success-text)" }}
      >
        <CheckCircle2 className="size-4" />
        Connected
      </output>
    );
  }

  // status === "error"
  return (
    <div
      className="flex items-center gap-2 text-sm"
      style={{ color: "var(--status-error-text)" }}
      role="alert"
    >
      <XCircle className="size-4" />
      {error || "Connection failed"}
    </div>
  );
}
