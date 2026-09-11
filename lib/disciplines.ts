export type Discipline =
  | "ping-pong"
  | "tenis"
  | "siatkowka"
  | "pilka-nozna"
  | "koszykowka"
  | "bule"
  | "bule-druzynowe";

export interface MatchFormat {
  setsToWin: number; // ile wygranych setow konczy mecz (sporty setowe)
  pointsPerSet: number; // punkty (lub gemy w tenisie) potrzebne do wygrania seta
  lastSetPoints: number; // punkty w secie decydujacym (siatkowka: 15); przy 1 secie to jedyny set
  matchMinutes: number; // czas meczu (pilka nozna, koszykowka) - informacyjnie
}

export interface TournamentSettings {
  scoringType: "sets" | "goals";
  winByTwo: boolean; // wymagana przewaga 2 punktow w secie
  penaltiesOnDraw: boolean; // remis w pucharze: true = rzuty karne, false = wynik musi byc rozstrzygniety (dogrywka)
  group: MatchFormat; // format meczu w fazie grupowej (zwykle krotszy)
  knockout: MatchFormat; // format meczu w fazie pucharowej
  groupPoints: { win: number; draw: number; loss: number };
  drawAllowed: boolean; // czy remis jest mozliwy w fazie grupowej (tylko pilka nozna)
  advancePerGroup: number; // ilu uczestnikow awansuje z grupy
  thirdPlaceMatch: boolean;
}

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  "ping-pong": "Ping-pong",
  tenis: "Tenis ziemny",
  siatkowka: "Siatkówka",
  "pilka-nozna": "Piłka nożna",
  koszykowka: "Koszykówka",
  bule: "Bule (singlowe)",
  "bule-druzynowe": "Bule (drużynowe)",
};

export const SET_UNIT: Record<Discipline, string> = {
  "ping-pong": "punktów w secie",
  tenis: "gemów w secie",
  siatkowka: "punktów w secie",
  "pilka-nozna": "",
  koszykowka: "",
  bule: "punktów",
  "bule-druzynowe": "punktów",
};

/** Slowo na "duze punkty" meczu w sportach bramkowych/punktowych. */
export const GOALS_WORD: Record<Discipline, string> = {
  "ping-pong": "Sety",
  tenis: "Sety",
  siatkowka: "Sety",
  "pilka-nozna": "Bramki",
  koszykowka: "Punkty",
  bule: "Sety",
  "bule-druzynowe": "Sety",
};

/** Nazewnictwo uczestnika zalezne od dyscypliny. */
export const PARTICIPANT: Record<
  Discipline,
  { singular: string; plural: string; genitivePlural: string }
> = {
  "ping-pong": { singular: "Zawodnik", plural: "Zawodnicy", genitivePlural: "zawodników" },
  tenis: { singular: "Zawodnik", plural: "Zawodnicy", genitivePlural: "zawodników" },
  siatkowka: { singular: "Drużyna", plural: "Drużyny", genitivePlural: "drużyn" },
  "pilka-nozna": { singular: "Drużyna", plural: "Drużyny", genitivePlural: "drużyn" },
  koszykowka: { singular: "Drużyna", plural: "Drużyny", genitivePlural: "drużyn" },
  bule: { singular: "Zawodnik", plural: "Zawodnicy", genitivePlural: "zawodników" },
  "bule-druzynowe": { singular: "Drużyna", plural: "Drużyny", genitivePlural: "drużyn" },
};

const BULE: TournamentSettings = {
  scoringType: "sets",
  winByTwo: false, // gra konczy sie dokladnie na 13
  penaltiesOnDraw: false,
  group: { setsToWin: 1, pointsPerSet: 13, lastSetPoints: 13, matchMinutes: 0 },
  knockout: { setsToWin: 1, pointsPerSet: 13, lastSetPoints: 13, matchMinutes: 0 },
  groupPoints: { win: 1, draw: 0, loss: 0 },
  drawAllowed: false,
  advancePerGroup: 2,
  thirdPlaceMatch: true,
};

export const DEFAULT_SETTINGS: Record<Discipline, TournamentSettings> = {
  "ping-pong": {
    scoringType: "sets",
    winByTwo: true,
    penaltiesOnDraw: false,
    group: { setsToWin: 2, pointsPerSet: 11, lastSetPoints: 11, matchMinutes: 0 },
    knockout: { setsToWin: 3, pointsPerSet: 11, lastSetPoints: 11, matchMinutes: 0 },
    groupPoints: { win: 2, draw: 1, loss: 0 },
    drawAllowed: false,
    advancePerGroup: 2,
    thirdPlaceMatch: true,
  },
  tenis: {
    scoringType: "sets",
    winByTwo: true, // przewaga 2 gemow lub tie-break: wynik seta 7:6 jest dozwolony
    penaltiesOnDraw: false,
    group: { setsToWin: 1, pointsPerSet: 6, lastSetPoints: 6, matchMinutes: 0 },
    knockout: { setsToWin: 2, pointsPerSet: 6, lastSetPoints: 6, matchMinutes: 0 },
    groupPoints: { win: 2, draw: 0, loss: 0 },
    drawAllowed: false,
    advancePerGroup: 2,
    thirdPlaceMatch: true,
  },
  siatkowka: {
    scoringType: "sets",
    winByTwo: true,
    penaltiesOnDraw: false,
    group: { setsToWin: 2, pointsPerSet: 25, lastSetPoints: 15, matchMinutes: 0 },
    knockout: { setsToWin: 2, pointsPerSet: 25, lastSetPoints: 15, matchMinutes: 0 },
    groupPoints: { win: 3, draw: 0, loss: 0 },
    drawAllowed: false,
    advancePerGroup: 2,
    thirdPlaceMatch: true,
  },
  "pilka-nozna": {
    scoringType: "goals",
    winByTwo: false,
    penaltiesOnDraw: true,
    group: { setsToWin: 0, pointsPerSet: 0, lastSetPoints: 0, matchMinutes: 15 },
    knockout: { setsToWin: 0, pointsPerSet: 0, lastSetPoints: 0, matchMinutes: 15 },
    groupPoints: { win: 3, draw: 1, loss: 0 },
    drawAllowed: true,
    advancePerGroup: 2,
    thirdPlaceMatch: true,
  },
  koszykowka: {
    scoringType: "goals",
    winByTwo: false,
    penaltiesOnDraw: false, // remis rozstrzyga dogrywka - wpisuje sie wynik koncowy
    group: { setsToWin: 0, pointsPerSet: 0, lastSetPoints: 0, matchMinutes: 20 },
    knockout: { setsToWin: 0, pointsPerSet: 0, lastSetPoints: 0, matchMinutes: 20 },
    groupPoints: { win: 2, draw: 0, loss: 1 }, // system FIBA: przegrany dostaje 1 pkt
    drawAllowed: false,
    advancePerGroup: 2,
    thirdPlaceMatch: true,
  },
  bule: BULE,
  "bule-druzynowe": structuredClone(BULE),
};

export function parseSettings(raw: unknown, discipline: Discipline): TournamentSettings {
  const base = DEFAULT_SETTINGS[discipline];
  if (typeof raw !== "object" || raw === null) return structuredClone(base);
  const r = raw as Partial<TournamentSettings>;
  return {
    ...base,
    ...r,
    group: { ...base.group, ...(r.group ?? {}) },
    knockout: { ...base.knockout, ...(r.knockout ?? {}) },
    groupPoints: { ...base.groupPoints, ...(r.groupPoints ?? {}) },
  };
}

/** Format meczu wlasciwy dla fazy turnieju. */
export function formatForPhase(
  settings: TournamentSettings,
  phase: "group" | "knockout"
): MatchFormat {
  return phase === "group" ? settings.group : settings.knockout;
}
