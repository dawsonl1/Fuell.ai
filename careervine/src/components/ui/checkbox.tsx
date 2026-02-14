/**
 * M3 Checkbox component
 *
 * Follows Material Design 3 checkbox specs:
 *   - 18×18 container with 2px rounded corners
 *   - Primary fill when checked, outline when unchecked
 *   - Animated check icon
 *   - Optional label text
 */

"use client";

import { Check } from "lucide-react";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({ checked, onChange, label, disabled = false, className = "" }: CheckboxProps) {
  return (
    <label
      className={`inline-flex items-center gap-2 select-none ${disabled ? "opacity-38 pointer-events-none" : "cursor-pointer"} ${className}`}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative shrink-0 w-[18px] h-[18px] rounded-[2px] border-2 transition-all duration-150 cursor-pointer
          flex items-center justify-center
          ${checked
            ? "bg-primary border-primary"
            : "bg-transparent border-outline hover:border-foreground"
          }
          ${disabled ? "cursor-default" : ""}
        `}
      >
        {checked && (
          <Check className="h-3.5 w-3.5 text-on-primary" strokeWidth={3} />
        )}
      </button>
      {label && (
        <span className="text-sm text-foreground">{label}</span>
      )}
    </label>
  );
}
