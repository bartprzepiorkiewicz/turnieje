// Jednorazowy generator: czyta surowe SVG z components/icons-src/ (duotone,
// kolory #66CCFF/#4E5F80) i zapisuje components/discipline-icons.generated.ts
// z gotowymi stalymi (viewBox + wnetrze <g> z kolorami podmienionymi na zmienne
// CSS). Dzieki temu DisciplineArt.tsx nie czyta plikow w runtime (bezpieczne
// dla Vercela - brak ryzyka, ze file tracing pominie dynamiczna sciezke).
// Uruchom: node scripts/gen-discipline-icons.mjs (po zmianie plikow w icons-src/)

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ICON_DIR = path.join(ROOT, "components", "icons-src");
const OUT_FILE = path.join(ROOT, "components", "discipline-icons.generated.ts");

const ICON_FILES = {
  "ping-pong": "ping-pong.svg",
  tenis: "tenis.svg",
  siatkowka: "siatkowka.svg",
  "pilka-nozna": "pilka-nozna.svg",
  koszykowka: "koszykowka.svg",
  bule: "bule.svg",
  "bule-druzynowe": "bule-druzynowe.svg",
};

function loadIcon(file) {
  const raw = readFileSync(path.join(ICON_DIR, file), "utf8");
  const viewBox = raw.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 32 32";
  const inner = raw
    .slice(raw.indexOf("<g"), raw.lastIndexOf("</svg>"))
    .replace(/#66CCFF/g, "var(--icon-fill-2)")
    .replace(/#4E5F80/g, "var(--icon-fill-1)")
    .trim();
  return { viewBox, inner };
}

const entries = Object.entries(ICON_FILES).map(([discipline, file]) => {
  const { viewBox, inner } = loadIcon(file);
  return `  "${discipline}": {\n    viewBox: ${JSON.stringify(viewBox)},\n    inner: ${JSON.stringify(inner)},\n  },`;
});

const out = `// Wygenerowano automatycznie przez scripts/gen-discipline-icons.mjs - nie edytuj recznie.
// Zeby zaktualizowac ikony: podmien pliki w components/icons-src/ i uruchom skrypt ponownie.
import type { Discipline } from "@/lib/disciplines";

export const DISCIPLINE_ICONS: Record<Discipline, { viewBox: string; inner: string }> = {
${entries.join("\n")}
};
`;

writeFileSync(OUT_FILE, out, "utf8");
console.log("Zapisano:", OUT_FILE);
