import type { Discipline } from "@/lib/disciplines";
import { DISCIPLINE_ICONS } from "./discipline-icons.generated";

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

/**
 * Ikony "duotone" (SVG Repo, kolekcja sports-duotone-icons) wgrane recznie przez
 * uzytkownika do components/icons-src/, przetworzone raz przez
 * scripts/gen-discipline-icons.mjs na stale w discipline-icons.generated.ts -
 * dwa stale kolory zrodlowe (#66CCFF / #4E5F80) sa tam podmienione na zmienne CSS
 * --icon-fill-1/-2, ktore kaskaduja z .tile / .banner (patrz globals.css) i same
 * dbaja o kontrast wzgledem tla oraz motywu jasny/ciemny. Brak odczytu z dysku w
 * runtime - bezpieczne dla file tracingu na Vercelu.
 */
export default function DisciplineArt({
  discipline,
  size = 130,
  className,
}: {
  discipline: Discipline;
  size?: number;
  className?: string;
}) {
  const { viewBox, inner } = DISCIPLINE_ICONS[discipline];
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      className={className}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}
