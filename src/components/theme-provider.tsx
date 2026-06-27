"use client";

import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readStoredTheme(): Theme {
  const stored = localStorage.getItem("potentially-theme") as Theme | null;
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system";
}

function getResolvedTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always start with "system" so server HTML matches the first client render.
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    const stored = readStoredTheme();
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate theme from localStorage on mount */
    setThemeState(stored);
    setResolvedTheme(getResolvedTheme(stored));
    setMounted(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useLayoutEffect(() => {
    if (!mounted) return;
    const resolved = getResolvedTheme(theme);
    /* eslint-disable react-hooks/set-state-in-effect -- sync DOM class when theme changes */
    setResolvedTheme(resolved);
    /* eslint-enable react-hooks/set-state-in-effect */
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(resolved);
    localStorage.setItem("potentially-theme", theme);
  }, [theme, mounted]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
