import type { Match, MatchSet, Team } from "./types";
import type { TournamentSettings } from "./disciplines";

export interface StandingRow {
  team: Team;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  scoreFor: number; // wygrane sety lub strzelone bramki
  scoreAgainst: number;
  smallFor: number; // male punkty: punkty/gemy zdobyte w setach (0 dla pilki noznej)
  smallAgainst: number;
}

/**
 * Tabela grupy liczona z zakonczonych meczow.
 * Kolejnosc: punkty -> bezposredni mecz (przy dwoch druzynach) -> bilans setow/bramek
 * -> bilans malych punktow -> zdobyte male punkty -> nazwa.
 */
export function computeStandings(
  teams: Team[],
  matches: Match[],
  settings: TournamentSettings,
  matchSets: MatchSet[] = []
): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const team of teams) {
    rows.set(team.id, {
      team,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0,
      scoreFor: 0,
      scoreAgainst: 0,
      smallFor: 0,
      smallAgainst: 0,
    });
  }

  const finished = matches.filter(
    (m) => m.status === "finished" && m.team_a && m.team_b
  );

  for (const m of finished) {
    const a = rows.get(m.team_a!);
    const b = rows.get(m.team_b!);
    if (!a || !b) continue;
    const scoreA = m.score_a ?? 0;
    const scoreB = m.score_b ?? 0;

    a.played++;
    b.played++;
    a.scoreFor += scoreA;
    a.scoreAgainst += scoreB;
    b.scoreFor += scoreB;
    b.scoreAgainst += scoreA;

    for (const s of matchSets.filter((x) => x.match_id === m.id)) {
      a.smallFor += s.points_a;
      a.smallAgainst += s.points_b;
      b.smallFor += s.points_b;
      b.smallAgainst += s.points_a;
    }

    if (scoreA === scoreB) {
      a.draws++;
      b.draws++;
      a.points += settings.groupPoints.draw;
      b.points += settings.groupPoints.draw;
    } else if (scoreA > scoreB) {
      a.wins++;
      b.losses++;
      a.points += settings.groupPoints.win;
      b.points += settings.groupPoints.loss;
    } else {
      b.wins++;
      a.losses++;
      b.points += settings.groupPoints.win;
      a.points += settings.groupPoints.loss;
    }
  }

  const result = [...rows.values()];

  const headToHead = (x: StandingRow, y: StandingRow): number => {
    const direct = finished.filter(
      (m) =>
        (m.team_a === x.team.id && m.team_b === y.team.id) ||
        (m.team_a === y.team.id && m.team_b === x.team.id)
    );
    let xWins = 0;
    let yWins = 0;
    for (const m of direct) {
      if (m.winner_id === x.team.id) xWins++;
      if (m.winner_id === y.team.id) yWins++;
    }
    return yWins - xWins;
  };

  result.sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    const h2h = headToHead(x, y);
    if (h2h !== 0) return h2h;
    const diffX = x.scoreFor - x.scoreAgainst;
    const diffY = y.scoreFor - y.scoreAgainst;
    if (diffY !== diffX) return diffY - diffX;
    const smallDiffX = x.smallFor - x.smallAgainst;
    const smallDiffY = y.smallFor - y.smallAgainst;
    if (smallDiffY !== smallDiffX) return smallDiffY - smallDiffX;
    if (y.smallFor !== x.smallFor) return y.smallFor - x.smallFor;
    return x.team.name.localeCompare(y.team.name, "pl");
  });

  return result;
}
