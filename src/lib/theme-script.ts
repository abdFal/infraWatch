/**
 * Light/dark theme, applied as `data-theme` on <html>.
 *
 * The choice is a per-browser convenience, so it lives in localStorage (not the
 * database). With no saved choice, the operating system's setting is used.
 */
export const THEME_STORAGE_KEY = "infrawatch-theme";

export type Theme = "light" | "dark";

/**
 * Inserted into the server HTML by ThemeSync and run while the page is parsed,
 * before the first paint, so a dark page never flashes light. See
 * node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t!=="light"&&t!=="dark")t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
