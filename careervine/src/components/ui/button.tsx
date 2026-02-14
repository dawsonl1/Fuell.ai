/**
 * M3 Button component
 *
 * Variants map to Material Design 3 button types:
 *   filled  → Primary filled button (high emphasis)
 *   tonal   → Filled tonal / secondary container (medium emphasis)
 *   outline → Outlined button (medium emphasis)
 *   text    → Text button (low emphasis)
 *   danger  → Error-colored filled button
 *
 * "primary" kept as alias for "filled" so existing call-sites still work.
 * "secondary" kept as alias for "tonal".
 * "ghost" kept as alias for "text".
 */

import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "filled" | "secondary" | "tonal" | "outline" | "text" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", loading = false, children, disabled, ...props }, ref) => {
    const baseClasses =
      "state-layer inline-flex items-center justify-center font-medium tracking-wide cursor-pointer transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-38 disabled:pointer-events-none select-none";

    const variants: Record<string, string> = {
      primary:   "bg-primary text-primary-foreground rounded-[20px] shadow-sm hover:shadow-md",
      filled:    "bg-primary text-primary-foreground rounded-[20px] shadow-sm hover:shadow-md",
      secondary: "bg-secondary text-secondary-foreground rounded-[20px]",
      tonal:     "bg-secondary text-secondary-foreground rounded-[20px]",
      outline:   "border border-outline bg-transparent text-foreground rounded-[20px] hover:bg-surface-container-low",
      text:      "bg-transparent text-primary rounded-[20px]",
      ghost:     "bg-transparent text-foreground rounded-[20px] hover:bg-surface-container-high",
      danger:    "bg-destructive text-destructive-foreground rounded-[20px] shadow-sm hover:shadow-md",
    };

    const sizes: Record<string, string> = {
      sm: "h-8 px-4 text-xs gap-1.5",
      md: "h-10 px-6 text-sm gap-2",
      lg: "h-12 px-8 text-base gap-2.5",
    };

    const classes = `${baseClasses} ${variants[variant] ?? variants.primary} ${sizes[size]} ${className}`;

    return (
      <button
        className={classes}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
