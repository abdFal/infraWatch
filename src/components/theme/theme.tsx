"use client";

import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { Toaster } from "sonner";
import { THEME_INIT_SCRIPT, THEME_STORAGE_KEY, type Theme } from "@/lib/theme-script";
import { cn } from "@/lib/utils";

const SYSTEM_DARK = "(prefers-color-scheme: dark)";

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function resolvedTheme(): Theme {
  return storedTheme() ?? (window.matchMedia(SYSTEM_DARK).matches ? "dark" : "light");
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

/** The theme currently on <html>. Re-renders when it changes. */
export function useTheme(): Theme {
  return useSyncExternalStore(
    (onChange) => {
      const observer = new MutationObserver(onChange);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      return () => observer.disconnect();
    },
    () => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"),
    () => "light",
  );
}

/**
 * Mounted once at the top of the root layout.
 *
 * 1. Puts the theme script into the server HTML (useServerInsertedHTML), so it
 *    runs while the page is parsed, before the first paint. Rendering a <script>
 *    element directly would make React warn in the browser.
 * 2. Re-applies the theme after React's development remount (which resets <html>
 *    attributes) and follows OS changes while the user hasn't picked a theme.
 */
export function ThemeSync() {
  const inserted = useRef(false);
  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
  });

  useLayoutEffect(() => {
    applyTheme(resolvedTheme());
    const media = window.matchMedia(SYSTEM_DARK);
    const onSystemChange = () => {
      if (!storedTheme()) applyTheme(media.matches ? "dark" : "light");
    };
    media.addEventListener("change", onSystemChange);
    return () => media.removeEventListener("change", onSystemChange);
  }, []);
  return null;
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();
  const next: Theme = theme === "dark" ? "light" : "dark";
  const label = next === "dark" ? "Switch to dark mode" : "Switch to light mode";

  function toggle() {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage blocked (private mode): the theme still changes for this page view.
    }
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-lg text-navy-600 transition-colors hover:bg-navy-100 hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-400 dark:text-navy-400 dark:hover:bg-navy-800 dark:hover:text-navy-100",
        className,
      )}
    >
      {theme === "dark" ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </button>
  );
}

/** Sonner toasts in the same theme as the page. */
export function ThemedToaster() {
  const theme = useTheme();
  return <Toaster position="top-right" richColors closeButton theme={theme} />;
}
