"use client";

import { Input, Label } from "@uberskillz/ui";

interface ArgumentInputsProps {
  /** Placeholder names detected in the skill content (without $ prefix). */
  placeholders: string[];
  /** Current values keyed by placeholder name. */
  values: Record<string, string>;
  /** Called when a placeholder value changes. */
  onChange: (values: Record<string, string>) => void;
  /** Disables all inputs (e.g. while a test is running). */
  disabled?: boolean;
}

/**
 * Renders a labeled text input for each detected `$VARIABLE_NAME` placeholder
 * in the skill content. If there are no placeholders, nothing is rendered.
 */
export function ArgumentInputs({
  placeholders,
  values,
  onChange,
  disabled = false,
}: ArgumentInputsProps) {
  if (placeholders.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Arguments</h3>
      <p className="text-xs text-muted-foreground">
        Provide values for the placeholders found in the skill content.
      </p>
      <div className="space-y-3">
        {placeholders.map((name) => (
          <div key={name} className="space-y-1.5">
            <Label htmlFor={`arg-${name}`} className="text-xs font-mono">
              ${name}
            </Label>
            <Input
              id={`arg-${name}`}
              value={values[name] ?? ""}
              onChange={(e) => onChange({ ...values, [name]: e.target.value })}
              placeholder={`Value for $${name}`}
              disabled={disabled}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
