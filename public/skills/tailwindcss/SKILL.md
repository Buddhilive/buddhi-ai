---
name: tailwindcss
description: "TailwindCSS v4 CSS-first styling guidelines for Next.js in Buddhi AI."
---

# TailwindCSS v4 Guidelines

## Core Principles
- TailwindCSS v4 uses CSS-first configuration: `@import "tailwindcss";` and `@theme` directives in `app/globals.css`.
- Avoid legacy v3 `@tailwind base;` directives or `tailwind.config.js` content arrays.
- Define custom tokens, colors, and fonts directly inside `@theme` blocks.

## Primary Stylesheet: `app/globals.css`
```css
@import "tailwindcss";

@theme {
  --color-primary: #3b82f6;
  --color-primary-foreground: #ffffff;
  --color-background: #ffffff;
  --color-foreground: #09090b;
  --color-muted: #f4f4f5;
  --color-muted-foreground: #71717a;
  --color-border: #e4e4e7;
  --color-input: #e4e4e7;
}

@layer base {
  body {
    background-color: var(--color-background);
    color: var(--color-foreground);
  }
}
```

## PostCSS: `postcss.config.mjs`
```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```
