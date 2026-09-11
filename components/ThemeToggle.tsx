"use client";

import { useEffect, useState } from "react";

/** Przelacznik motywu ciemny/jasny - zapisywany w localStorage, domyslnie ciemny. */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Tylko odczyt/synchronizacja stanu przy montowaniu - zapis nastepuje wylacznie
  // w apply() (klik uzytkownika), zeby nie wyscigac sie z tym efektem i nie
  // nadpisywac poprawnie zapisanego motywu domyslnym "dark" przy kazdym wejsciu.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("turnieje-theme");
      if (saved === "light" || saved === "dark") {
        setTheme(saved);
        return;
      }
    } catch {}
    const current = document.documentElement.dataset.theme;
    if (current === "light" || current === "dark") setTheme(current);
  }, []);

  function apply(next: "dark" | "light") {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("turnieje-theme", next);
    } catch {}
  }

  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => apply(next)}
      title={next === "light" ? "Przełącz na jasny motyw" : "Przełącz na ciemny motyw"}
    >
      {theme === "dark" ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9L19 19M19 5l-2.1 2.1M7.1 16.9L5 19" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M20 13.5A8.5 8.5 0 0 1 10.5 4 7.5 7.5 0 1 0 20 13.5z" />
        </svg>
      )}
    </button>
  );
}
