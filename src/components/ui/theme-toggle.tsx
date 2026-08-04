"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Listen for system preference changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    function updateFromSystem(e: MediaQueryListEvent | MediaQueryList) {
      const stored = localStorage.getItem("theme");
      if (stored !== "light" && stored !== "dark") {
        // Auto mode: follow system
        const isDark = e.matches;
        setDark(isDark);
        setAuto(true);
        document.documentElement.classList.toggle("dark", isDark);
      } else {
        setAuto(false);
      }
    }
    
    // Initial setup
    const stored = localStorage.getItem("theme");
    if (stored === "light") {
      setDark(false);
      setAuto(false);
      document.documentElement.classList.remove("dark");
    } else if (stored === "dark") {
      setDark(true);
      setAuto(false);
      document.documentElement.classList.add("dark");
    } else {
      // Auto: follow system
      const isDark = mediaQuery.matches;
      setDark(isDark);
      setAuto(true);
      document.documentElement.classList.toggle("dark", isDark);
    }
    
    // Listen for system changes
    mediaQuery.addEventListener("change", updateFromSystem);
    return () => mediaQuery.removeEventListener("change", updateFromSystem);
  }, []);

  function toggleTheme() {
    if (auto) {
      // If in auto mode, switch to explicit dark
      setAuto(false);
      setDark(true);
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      const next = !dark;
      setDark(next);
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
    }
  }

  if (!mounted) {
    return <div className="h-9 w-9" />;
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      aria-label="Alternar tema"
    >
      {auto ? (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ) : dark ? (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}
