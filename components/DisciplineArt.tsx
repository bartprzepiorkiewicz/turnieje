import type { CSSProperties } from "react";
import type { Discipline } from "@/lib/disciplines";

/** Kolor akcentu kazdej dyscypliny - zmienne CSS, wartosci per motyw w globals.css. */
export const DISCIPLINE_COLOR: Record<Discipline, string> = {
  "ping-pong": "var(--c-ping-pong)",
  tenis: "var(--c-tenis)",
  siatkowka: "var(--c-siatkowka)",
  "pilka-nozna": "var(--c-pilka)",
  koszykowka: "var(--c-kosz)",
  bule: "var(--c-bule)",
  "bule-druzynowe": "var(--c-bule)",
};

/** Polprzezroczysta wersja koloru dyscypliny (gradienty, obwodki). */
export function disciplineTint(discipline: Discipline, percent: number): string {
  return `color-mix(in srgb, ${DISCIPLINE_COLOR[discipline]} ${percent}%, transparent)`;
}

/** Nieprzezroczysty wash koloru dyscypliny wtopiony w tlo (mocne, kryjace tla kart). */
export function disciplineWash(discipline: Discipline, percent: number): string {
  return `color-mix(in srgb, ${DISCIPLINE_COLOR[discipline]} ${percent}%, var(--surface))`;
}

/** Krotki opis formatu na kafelku wyboru dyscypliny. */
export const DISCIPLINE_HINT: Record<Discipline, string> = {
  "ping-pong": "set do 11 · BO3 / BO5",
  tenis: "set do 6 gemów · tie-break",
  siatkowka: "set do 25 · tie-break do 15",
  "pilka-nozna": "2 × 15 min · karne w pucharze",
  koszykowka: "2 × 10 min · system FIBA",
  bule: "singlowe · gra do 13",
  "bule-druzynowe": "drużynowe · gra do 13",
};

const PATHS: Record<Discipline, React.ReactNode> = {
  "ping-pong": (
    <>
      <circle cx="46" cy="56" r="27" />
      <path d="M62 78l16 22M56 82l14 19" strokeLinecap="round" />
      <circle cx="92" cy="26" r="7" />
    </>
  ),
  tenis: (
    <>
      <circle cx="64" cy="52" r="32" />
      <path d="M40 30c16 13 16 31 0 44M88 30c-16 13-16 31 0 44" />
    </>
  ),
  siatkowka: (
    <>
      <circle cx="66" cy="50" r="32" />
      <path d="M66 18c-9 18-9 46 0 64M36 40c19 9 41 9 60 0M36 62c19-9 41-9 60 0" />
    </>
  ),
  "pilka-nozna": (
    <>
      <circle cx="66" cy="50" r="32" />
      <path d="M66 37l12.4 9-4.7 14.5H58.3L53.6 46 66 37z" />
      <path d="M66 37V21M78.4 46l15.2-5M73.7 60.5l9.3 13.4M58.3 60.5L49 73.9M53.6 46l-15.2-5" />
    </>
  ),
  koszykowka: (
    <>
      <circle cx="64" cy="50" r="32" />
      <path d="M64 18v64M32 50h64M41 27c11 13 35 13 46 0M41 73c11-13 35-13 46 0" />
    </>
  ),
  bule: (
    <>
      <circle cx="52" cy="62" r="24" />
      <path d="M32 51c13 9 28 9 40 0" strokeWidth="1.1" />
      <circle cx="94" cy="34" r="7" />
    </>
  ),
  "bule-druzynowe": (
    <>
      <circle cx="38" cy="72" r="18" />
      <circle cx="74" cy="78" r="18" />
      <circle cx="58" cy="42" r="18" />
      <path d="M46 36c8 5 16 5 24 0" strokeWidth="1" />
      <circle cx="100" cy="30" r="6" />
    </>
  ),
};

/** Liniowy motyw dyscypliny (SVG) — uzywany na kafelkach i w bannerze turnieju. */
export default function DisciplineArt({
  discipline,
  size = 130,
  strokeWidth = 1.5,
  style,
  className,
}: {
  discipline: Discipline;
  size?: number;
  strokeWidth?: number;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      strokeWidth={strokeWidth}
      className={className}
      style={{ stroke: DISCIPLINE_COLOR[discipline], ...style }}
      aria-hidden="true"
    >
      {PATHS[discipline]}
    </svg>
  );
}
