import type { Config } from "tailwindcss";
import path from "path";

export default {
  content: [
    path.join(__dirname, "index.html"),
    path.join(__dirname, "src/**/*.{ts,tsx,js,jsx}"),
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        "md-surface": "var(--md-surface)",
        "md-surface-dim": "var(--md-surface-dim)",
        "md-surface-container": "var(--md-surface-container)",
        "md-surface-container-high": "var(--md-surface-container-high)",
        "md-surface-container-highest": "var(--md-surface-container-highest)",
        "md-on-surface": "var(--md-on-surface)",
        "md-on-surface-variant": "var(--md-on-surface-variant)",
        "md-outline": "var(--md-outline)",
        "md-outline-variant": "var(--md-outline-variant)",
        primary: "var(--md-primary)",
        "primary-foreground": "var(--md-on-primary)",
        "primary-container": "var(--md-primary-container)",
        "on-primary-container": "var(--md-on-primary-container)",
        "secondary-container": "var(--md-secondary-container)",
        "on-secondary-container": "var(--md-on-secondary-container)",
      },
      borderRadius: {
        "md-xs": "var(--md-shape-xs)",
        "md-sm": "var(--md-shape-sm)",
        "md-md": "var(--md-shape-md)",
        "md-lg": "var(--md-shape-lg)",
        "md-xl": "var(--md-shape-xl)",
        "md-full": "var(--md-shape-full)",
      },
      boxShadow: {
        "md-1": "var(--md-elevation-1)",
        "md-2": "var(--md-elevation-2)",
        "md-3": "var(--md-elevation-3)",
      },
    },
  },
  plugins: [],
} satisfies Config;
