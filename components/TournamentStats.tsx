"use client";

import { useEffect, useRef, useState } from "react";

interface Stats {
  participants: number;
  groupsLabel: string;
  groupMatches: number;
  qualifiers: number;
  knockoutMatches: number;
  hasThird: boolean;
  total: number;
  warning: string | null;
}

/**
 * Panel podsumowania nowego turnieju: czyta pola formularza, w ktorym jest
 * osadzony, i na zywo przelicza liczbe meczow. Zawiera przycisk "Utworz".
 */
export default function TournamentStats({ participantWord }: { participantWord: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;

    const update = () => {
      const fd = new FormData(form);
      const n = String(fd.get("teams") ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean).length;
      const g = Math.max(0, Number(fd.get("groupCount")) || 0);
      const adv = Math.max(1, Number(fd.get("advancePerGroup")) || 1);
      const third = fd.get("thirdPlaceMatch") === "on";

      if (n < 2) {
        setStats(null);
        return;
      }

      // podzial wezykiem daje grupy rozniace sie najwyzej o 1
      const groupSizes: number[] = [];
      if (g > 0) {
        const base = Math.floor(n / g);
        const extra = n % g;
        for (let i = 0; i < g; i++) groupSizes.push(i < extra ? base + 1 : base);
      }

      const groupMatches = groupSizes.reduce((sum, k) => sum + (k * (k - 1)) / 2, 0);
      const qualifiers =
        g > 0 ? groupSizes.reduce((sum, k) => sum + Math.min(adv, k), 0) : n;
      const hasThird = third && qualifiers >= 3;
      let knockoutMatches = qualifiers >= 2 ? qualifiers - 1 : 0;
      if (hasThird) knockoutMatches += 1;

      const uniqueSizes = [...new Set(groupSizes)];
      const groupsLabel =
        g === 0
          ? "bez grup"
          : uniqueSizes.length === 1
            ? `${g} × ${uniqueSizes[0]}`
            : groupSizes.join(" + ");

      let warning: string | null = null;
      if (g > 0 && Math.min(...groupSizes) < 2) {
        warning = "Za dużo grup — w grupie musi być co najmniej 2 uczestników.";
      } else if (g > 0 && adv > Math.min(...groupSizes)) {
        warning = "Liczba awansujących jest większa niż najmniejsza grupa.";
      }

      setStats({
        participants: n,
        groupsLabel,
        groupMatches,
        qualifiers,
        knockoutMatches,
        hasThird,
        total: groupMatches + knockoutMatches,
        warning,
      });
    };

    update();
    form.addEventListener("input", update);
    form.addEventListener("change", update);
    return () => {
      form.removeEventListener("input", update);
      form.removeEventListener("change", update);
    };
  }, []);

  return (
    <div ref={ref} className="rail-card">
      <div className="label" style={{ marginBottom: 10 }}>
        podsumowanie
      </div>
      {stats === null ? (
        <p className="hint" style={{ margin: "4px 0" }}>
          Wpisz co najmniej 2 uczestników, żeby zobaczyć liczbę meczów.
        </p>
      ) : (
        <>
          <div className="srow">
            <span className="k" style={{ textTransform: "capitalize" }}>{participantWord}</span>
            <span className="v">{stats.participants}</span>
          </div>
          <div className="srow">
            <span className="k">Grupy</span>
            <span className="v">{stats.groupsLabel}</span>
          </div>
          <div className="srow">
            <span className="k">Mecze grupowe</span>
            <span className="v">{stats.groupMatches}</span>
          </div>
          <div className="srow">
            <span className="k">Awansuje do drabinki</span>
            <span className="v">{stats.qualifiers}</span>
          </div>
          <div className="srow" style={{ borderBottom: "none" }}>
            <span className="k">
              Mecze pucharowe{stats.hasThird && <span style={{ color: "var(--faint)" }}> (z meczem o 3. msc)</span>}
            </span>
            <span className="v">{stats.knockoutMatches}</span>
          </div>
          <div className="total-row">
            <span style={{ fontWeight: 600 }}>Razem</span>
            <span className="big">
              {stats.total} <small>meczów</small>
            </span>
          </div>
          {stats.warning && (
            <p className="error" style={{ fontSize: 12, margin: "10px 0 0" }}>
              {stats.warning}
            </p>
          )}
        </>
      )}
      <button type="submit" disabled={stats === null || stats.warning !== null}>
        Utwórz turniej →
      </button>
      <div className="rail-note">terminarz i drabinka wygenerują się automatycznie</div>
    </div>
  );
}
