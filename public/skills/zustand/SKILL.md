---
name: zustand
description: "Zustand v5 client state management guide for Next.js in Buddhi AI."
---

# Zustand v5 State Management Guidelines

## Core Principles
- Always use `create<State>()(...)` hook pattern from `zustand`.
- Use granular selectors in components: `useStore(s => s.item)` instead of destructuring the whole store.
- Always use immutable state updates in setters.
- Prohibited: Never use Redux, MobX, or global Context-only state wrappers.

## App Store: `store/use-app-store.ts`
```ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface AppState {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        theme: 'system',
        sidebarOpen: true,
        setTheme: (theme) => set({ theme }),
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      }),
      { name: 'app-storage' }
    )
  )
);
```

## Component Usage: `components/theme-toggle.tsx`
```tsx
'use client';

import { useAppStore } from '@/store/use-app-store';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);

  return (
    <Button
      variant="outline"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      Theme: {theme}
    </Button>
  );
}
```
