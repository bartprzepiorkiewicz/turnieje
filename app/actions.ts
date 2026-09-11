"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { loginWithPassword, logout, requireAdmin } from "@/lib/auth";
import {
  DEFAULT_SETTINGS,
  formatForPhase,
  parseSettings,
  type Discipline,
  type TournamentSettings,
} from "@/lib/disciplines";
import { winnerPoints } from "@/lib/score";
import { roundRobin } from "@/lib/roundrobin";
import { bracketSize, seedOrder } from "@/lib/bracket";
import { computeStandings } from "@/lib/standings";
import type { Match, MatchSet, Team, Tournament } from "@/lib/types";

export interface ActionResult {
  error?: string;
  ok?: boolean;
}

// ---------- logowanie ----------

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const ok = await loginWithPassword(password);
  if (!ok) redirect("/login?blad=1");
  redirect("/");
}

export async function logoutAction() {
  await logout();
  redirect("/");
}

// ---------- tworzenie turnieju ----------

export async function createTournamentAction(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const discipline = String(formData.get("discipline")) as Discipline;
  if (!name) throw new Error("Podaj nazwę turnieju");
  if (!DEFAULT_SETTINGS[discipline]) throw new Error("Nieznana dyscyplina");

  const num = (key: string, fallback: number) => {
    const v = Number(formData.get(key));
    return Number.isFinite(v) && v >= 0 ? v : fallback;
  };

  const base = DEFAULT_SETTINGS[discipline];
  const settings: TournamentSettings = {
    ...base,
    group: {
      setsToWin: num("gSetsToWin", base.group.setsToWin),
      pointsPerSet: num("gPointsPerSet", base.group.pointsPerSet),
      lastSetPoints: num("gLastSetPoints", base.group.lastSetPoints),
      matchMinutes: num("gMatchMinutes", base.group.matchMinutes),
    },
    knockout: {
      setsToWin: num("koSetsToWin", base.knockout.setsToWin),
      pointsPerSet: num("koPointsPerSet", base.knockout.pointsPerSet),
      lastSetPoints: num("koLastSetPoints", base.knockout.lastSetPoints),
      matchMinutes: num("koMatchMinutes", base.knockout.matchMinutes),
    },
    groupPoints: {
      win: num("pointsWin", base.groupPoints.win),
      draw: num("pointsDraw", base.groupPoints.draw),
      loss: num("pointsLoss", base.groupPoints.loss),
    },
    advancePerGroup: Math.max(1, num("advancePerGroup", base.advancePerGroup)),
    thirdPlaceMatch: formData.get("thirdPlaceMatch") === "on",
  };

  const teamNames = String(formData.get("teams") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (teamNames.length < 2) throw new Error("Podaj co najmniej 2 uczestników (każdy w osobnej linii)");

  const groupCount = num("groupCount", 0); // 0 = bez fazy grupowej, od razu drabinka
  if (groupCount > 0 && teamNames.length / groupCount < 2) {
    throw new Error("Za dużo grup jak na tę liczbę uczestników (w grupie muszą być min. 2)");
  }

  const supabase = db();

  const { data: tournament, error: tErr } = await supabase
    .from("tournaments")
    .insert({
      name,
      discipline,
      status: groupCount > 0 ? "group" : "knockout",
      settings,
    })
    .select()
    .single();
  if (tErr) throw new Error("Błąd zapisu turnieju: " + tErr.message);
  const tournamentId = tournament.id as string;

  // grupy
  let groupIds: string[] = [];
  if (groupCount > 0) {
    const groupRows = Array.from({ length: groupCount }, (_, i) => ({
      tournament_id: tournamentId,
      name: "Grupa " + String.fromCharCode(65 + i),
      sort_order: i,
    }));
    const { data: groups, error: gErr } = await supabase
      .from("groups")
      .insert(groupRows)
      .select();
    if (gErr) throw new Error("Błąd zapisu grup: " + gErr.message);
    groupIds = groups
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((g) => g.id as string);
  }

  // uczestnicy - przydzial do grup wezykiem (serpentyna), zeby grupy byly wyrownane
  const teamRows = teamNames.map((teamName, i) => {
    let groupId: string | null = null;
    if (groupCount > 0) {
      const cycle = i % (groupCount * 2);
      const idx = cycle < groupCount ? cycle : groupCount * 2 - 1 - cycle;
      groupId = groupIds[idx];
    }
    return {
      tournament_id: tournamentId,
      name: teamName,
      seed: i + 1,
      group_id: groupId,
    };
  });
  const { data: teams, error: teamErr } = await supabase
    .from("teams")
    .insert(teamRows)
    .select();
  if (teamErr) throw new Error("Błąd zapisu uczestników: " + teamErr.message);

  if (groupCount > 0) {
    // terminarz "kazdy z kazdym" w kazdej grupie
    const matchRows: Record<string, unknown>[] = [];
    for (const groupId of groupIds) {
      const groupTeams = (teams as Team[]).filter((t) => t.group_id === groupId);
      const rounds = roundRobin(groupTeams);
      rounds.forEach((pairs, roundIdx) => {
        pairs.forEach(([a, b], posIdx) => {
          matchRows.push({
            tournament_id: tournamentId,
            phase: "group",
            group_id: groupId,
            round: roundIdx + 1,
            position: posIdx,
            team_a: a.id,
            team_b: b.id,
          });
        });
      });
    }
    if (matchRows.length > 0) {
      const { error: mErr } = await supabase.from("matches").insert(matchRows);
      if (mErr) throw new Error("Błąd zapisu terminarza: " + mErr.message);
    }
  } else {
    // od razu drabinka wedlug kolejnosci wpisania uczestnikow
    await createBracket(tournamentId, teams as Team[], settings);
  }

  revalidatePath("/");
  redirect(`/turniej/${tournamentId}`);
}

// ---------- zapis wyniku meczu ----------

export async function saveResultAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = db();

  const matchId = String(formData.get("matchId"));
  const { data: mData, error: mErr } = await supabase
    .from("matches")
    .select()
    .eq("id", matchId)
    .single();
  if (mErr || !mData) return { error: "Nie znaleziono meczu" };
  const m = mData as Match;
  if (!m.team_a || !m.team_b) return { error: "Mecz nie ma jeszcze ustalonych par" };

  const { data: tData } = await supabase
    .from("tournaments")
    .select()
    .eq("id", m.tournament_id)
    .single();
  if (!tData) return { error: "Nie znaleziono turnieju" };
  const tournament = tData as Tournament;
  const settings = parseSettings(tournament.settings, tournament.discipline);
  const fmt = formatForPhase(settings, m.phase);

  // blokada edycji, gdy turniej poszedl dalej
  if (tournament.status === "finished") return { error: "Turniej jest już zakończony" };
  if (m.phase === "group" && tournament.status !== "group") {
    return { error: "Faza grupowa jest zamknięta — wyników nie można już zmieniać" };
  }
  if (m.phase === "knockout") {
    const nextIds = [m.next_match_id, m.loser_next_match_id].filter(Boolean) as string[];
    if (nextIds.length > 0) {
      const { data: nextMatches } = await supabase
        .from("matches")
        .select("id,status")
        .in("id", nextIds);
      if ((nextMatches ?? []).some((n) => n.status === "finished")) {
        return { error: "Kolejny mecz drabinki jest już rozegrany — tego wyniku nie można zmienić" };
      }
    }
  }

  let scoreA: number;
  let scoreB: number;
  let penaltyA: number | null = null;
  let penaltyB: number | null = null;
  let winnerId: string | null = null;

  if (settings.scoringType === "sets") {
    // formularz: set{i}w = kto wygral seta ('a'/'b'), set{i}p = punkty przegranego
    const maxSets = fmt.setsToWin * 2 - 1;
    const sets: { points_a: number; points_b: number }[] = [];
    let winsA = 0;
    let winsB = 0;

    for (let i = 1; i <= maxSets; i++) {
      const who = String(formData.get(`set${i}w`) ?? "");
      const rawLoser = String(formData.get(`set${i}p`) ?? "").trim();
      if (who !== "a" && who !== "b") {
        if (rawLoser !== "") {
          return { error: `Set ${i}: zaznacz, kto wygrał seta` };
        }
        continue;
      }
      if (sets.length < i - 1) {
        return { error: "Sety muszą być wypełnione po kolei, bez przerw" };
      }
      if (winsA === fmt.setsToWin || winsB === fmt.setsToWin) {
        return {
          error: `Mecz kończy się po ${fmt.setsToWin} wygranych setach — usuń nadmiarowy set ${i}`,
        };
      }
      const loserPts = rawLoser === "" ? 0 : Number(rawLoser);
      const target = i === maxSets ? fmt.lastSetPoints : fmt.pointsPerSet;
      const winPts = winnerPoints(tournament.discipline, settings.winByTwo, target, loserPts);
      if (winPts === null) {
        return {
          error: `Set ${i}: nieprawidłowa liczba punktów przegranego (${rawLoser}) przy secie do ${target}`,
        };
      }
      if (who === "a") {
        winsA++;
        sets.push({ points_a: winPts, points_b: loserPts });
      } else {
        winsB++;
        sets.push({ points_a: loserPts, points_b: winPts });
      }
    }

    if (sets.length === 0) return { error: "Zaznacz wynik co najmniej jednego seta" };
    if (winsA !== fmt.setsToWin && winsB !== fmt.setsToWin) {
      return {
        error: `Mecz gra się do ${fmt.setsToWin} wygranych setów — obecnie jest ${winsA}:${winsB}, dokończ wpisywanie`,
      };
    }

    scoreA = winsA;
    scoreB = winsB;
    winnerId = winsA > winsB ? m.team_a : m.team_b;

    await supabase.from("match_sets").delete().eq("match_id", matchId);
    const { error: sErr } = await supabase.from("match_sets").insert(
      sets.map((s, i) => ({
        match_id: matchId,
        set_no: i + 1,
        points_a: s.points_a,
        points_b: s.points_b,
      }))
    );
    if (sErr) return { error: "Błąd zapisu setów: " + sErr.message };
  } else {
    // bramki
    scoreA = Number(formData.get("goalsA"));
    scoreB = Number(formData.get("goalsB"));
    if (
      !Number.isInteger(scoreA) ||
      !Number.isInteger(scoreB) ||
      scoreA < 0 ||
      scoreB < 0
    ) {
      return { error: "Wpisz prawidłowy wynik bramkowy (liczby całkowite)" };
    }
    if (scoreA > scoreB) winnerId = m.team_a;
    else if (scoreB > scoreA) winnerId = m.team_b;
    else if (m.phase === "group") {
      if (!settings.drawAllowed) return { error: "Remis nie jest dozwolony w tej dyscyplinie" };
      winnerId = null;
    } else if (!settings.penaltiesOnDraw) {
      // np. koszykowka: remis rozstrzyga dogrywka - wpisuje sie wynik koncowy
      return { error: "Remis niemożliwy w fazie pucharowej — wpisz wynik po dogrywce" };
    } else {
      // faza pucharowa: remis rozstrzygany karnymi
      const rawPa = String(formData.get("penaltyA") ?? "").trim();
      const rawPb = String(formData.get("penaltyB") ?? "").trim();
      penaltyA = Number(rawPa);
      penaltyB = Number(rawPb);
      if (
        rawPa === "" ||
        rawPb === "" ||
        !Number.isInteger(penaltyA) ||
        !Number.isInteger(penaltyB) ||
        penaltyA < 0 ||
        penaltyB < 0 ||
        penaltyA === penaltyB
      ) {
        return {
          error: "Remis w fazie pucharowej: wpisz wynik rzutów karnych, który wyłania zwycięzcę",
        };
      }
      winnerId = penaltyA > penaltyB ? m.team_a : m.team_b;
    }
  }

  const { error: upErr } = await supabase
    .from("matches")
    .update({
      score_a: scoreA,
      score_b: scoreB,
      penalty_a: penaltyA,
      penalty_b: penaltyB,
      winner_id: winnerId,
      status: "finished",
    })
    .eq("id", matchId);
  if (upErr) return { error: "Błąd zapisu wyniku: " + upErr.message };

  // awans w drabince
  if (m.phase === "knockout" && winnerId) {
    const loserId = winnerId === m.team_a ? m.team_b : m.team_a;
    if (m.next_match_id && m.next_slot) {
      await supabase
        .from("matches")
        .update({ [m.next_slot === "a" ? "team_a" : "team_b"]: winnerId })
        .eq("id", m.next_match_id);
    }
    if (m.loser_next_match_id && m.loser_next_slot) {
      await supabase
        .from("matches")
        .update({ [m.loser_next_slot === "a" ? "team_a" : "team_b"]: loserId })
        .eq("id", m.loser_next_match_id);
    }
  }

  revalidatePath(`/turniej/${m.tournament_id}`);
  return { ok: true };
}

// ---------- generowanie fazy pucharowej ----------

export async function generateKnockoutAction(formData: FormData) {
  await requireAdmin();
  const supabase = db();
  const tournamentId = String(formData.get("tournamentId"));

  const { data: tData } = await supabase
    .from("tournaments")
    .select()
    .eq("id", tournamentId)
    .single();
  if (!tData) throw new Error("Nie znaleziono turnieju");
  const tournament = tData as Tournament;
  if (tournament.status !== "group") throw new Error("Turniej nie jest w fazie grupowej");
  const settings = parseSettings(tournament.settings, tournament.discipline);

  const [{ data: groups }, { data: teams }, { data: matches }] = await Promise.all([
    supabase.from("groups").select().eq("tournament_id", tournamentId).order("sort_order"),
    supabase.from("teams").select().eq("tournament_id", tournamentId),
    supabase.from("matches").select().eq("tournament_id", tournamentId).eq("phase", "group"),
  ]);
  if (!groups || !teams || !matches) throw new Error("Błąd odczytu danych turnieju");

  const unfinished = (matches as Match[]).filter((m) => m.status !== "finished");
  if (unfinished.length > 0) {
    throw new Error(
      `Nie można wygenerować fazy pucharowej: ${unfinished.length} mecz(e/ów) grupowych bez wyniku`
    );
  }

  const matchIds = (matches as Match[]).map((m) => m.id);
  const { data: setData } =
    matchIds.length > 0
      ? await supabase.from("match_sets").select().in("match_id", matchIds)
      : { data: [] };
  const matchSets = (setData ?? []) as MatchSet[];

  // kwalifikanci: najpierw wszyscy zwyciezcy grup, potem 2. miejsca itd.
  // Kolejnosc rozstawienia + standardowa drabinka daje pary krzyzowe (A1-B2, B1-A2).
  const standingsByGroup = (groups as { id: string }[]).map((g) =>
    computeStandings(
      (teams as Team[]).filter((t) => t.group_id === g.id),
      (matches as Match[]).filter((m) => m.group_id === g.id),
      settings,
      matchSets
    )
  );
  const qualifiers: Team[] = [];
  for (let rank = 0; rank < settings.advancePerGroup; rank++) {
    for (const standings of standingsByGroup) {
      if (standings[rank]) qualifiers.push(standings[rank].team);
    }
  }
  if (qualifiers.length < 2) throw new Error("Za mało awansujących, by utworzyć drabinkę");

  await createBracket(tournamentId, qualifiers, settings);
  await supabase.from("tournaments").update({ status: "knockout" }).eq("id", tournamentId);

  revalidatePath(`/turniej/${tournamentId}`);
}

/**
 * Tworzy pelna drabinke dla podanych uczestnikow (w kolejnosci rozstawienia),
 * z wolnymi losami, meczem o 3. miejsce i powiazaniami awansu.
 */
async function createBracket(
  tournamentId: string,
  seededTeams: Team[],
  settings: TournamentSettings
) {
  const supabase = db();
  const size = bracketSize(seededTeams.length);
  const totalRounds = Math.log2(size);

  // budujemy od finalu wstecz, zeby znac id meczu docelowego
  let nextRoundIds: string[] = [];
  let firstRoundMatches: Match[] = [];

  for (let roundSize = 2; roundSize <= size; roundSize *= 2) {
    const roundNumber = totalRounds - Math.log2(roundSize) + 1;
    const matchCount = roundSize / 2;
    const rows: Record<string, unknown>[] = [];

    for (let i = 0; i < matchCount; i++) {
      rows.push({
        tournament_id: tournamentId,
        phase: "knockout",
        round: roundNumber,
        position: i,
        round_size: roundSize,
        next_match_id: roundSize === 2 ? null : nextRoundIds[Math.floor(i / 2)],
        next_slot: roundSize === 2 ? null : i % 2 === 0 ? "a" : "b",
      });
    }

    const { data: created, error } = await supabase.from("matches").insert(rows).select();
    if (error) throw new Error("Błąd tworzenia drabinki: " + error.message);
    const sorted = (created as Match[]).sort((a, b) => a.position - b.position);

    // mecz o 3. miejsce - przegrani polfinalow
    if (roundSize === 4 && settings.thirdPlaceMatch) {
      const { data: third, error: thErr } = await supabase
        .from("matches")
        .insert({
          tournament_id: tournamentId,
          phase: "knockout",
          round: totalRounds,
          position: 1,
          round_size: 2,
          is_third_place: true,
        })
        .select()
        .single();
      if (thErr) throw new Error("Błąd tworzenia meczu o 3. miejsce: " + thErr.message);
      for (let i = 0; i < sorted.length; i++) {
        await supabase
          .from("matches")
          .update({
            loser_next_match_id: third.id,
            loser_next_slot: i === 0 ? "a" : "b",
          })
          .eq("id", sorted[i].id);
        sorted[i].loser_next_match_id = third.id;
        sorted[i].loser_next_slot = i === 0 ? "a" : "b";
      }
    }

    nextRoundIds = sorted.map((m) => m.id);
    if (roundSize === size) firstRoundMatches = sorted;
  }

  // obsada pierwszej rundy wg standardowego rozstawienia; braki = wolny los
  const order = seedOrder(size);
  for (let i = 0; i < firstRoundMatches.length; i++) {
    const teamA = seededTeams[order[i * 2] - 1] ?? null;
    const teamB = seededTeams[order[i * 2 + 1] - 1] ?? null;
    const match = firstRoundMatches[i];

    const update: Record<string, unknown> = {
      team_a: teamA?.id ?? null,
      team_b: teamB?.id ?? null,
    };

    // wolny los: uczestnik przechodzi dalej automatycznie
    const walkover = teamA && !teamB ? teamA : !teamA && teamB ? teamB : null;
    if (walkover) {
      update.winner_id = walkover.id;
      update.status = "finished";
    }
    await supabase.from("matches").update(update).eq("id", match.id);

    if (walkover && match.next_match_id && match.next_slot) {
      await supabase
        .from("matches")
        .update({ [match.next_slot === "a" ? "team_a" : "team_b"]: walkover.id })
        .eq("id", match.next_match_id);
    }
  }
}

// ---------- pozostale ----------

export async function finishTournamentAction(formData: FormData) {
  await requireAdmin();
  const tournamentId = String(formData.get("tournamentId"));
  await db().from("tournaments").update({ status: "finished" }).eq("id", tournamentId);
  revalidatePath(`/turniej/${tournamentId}`);
}

export async function archiveTournamentAction(formData: FormData) {
  await requireAdmin();
  const tournamentId = String(formData.get("tournamentId"));
  await db().from("tournaments").update({ archived_at: new Date().toISOString() }).eq("id", tournamentId);
  revalidatePath("/");
  revalidatePath(`/turniej/${tournamentId}`);
}

export async function deleteTournamentAction(formData: FormData) {
  await requireAdmin();
  const tournamentId = String(formData.get("tournamentId"));
  await db().from("tournaments").delete().eq("id", tournamentId);
  revalidatePath("/");
  redirect("/");
}
