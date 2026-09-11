import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import {
  DISCIPLINE_LABELS,
  GOALS_WORD,
  PARTICIPANT,
  parseSettings,
  type MatchFormat,
} from "@/lib/disciplines";
import { computeStandings } from "@/lib/standings";
import { roundName } from "@/lib/bracket";
import DisciplineArt, { DISCIPLINE_COLOR, disciplineTint, disciplineWash } from "@/components/DisciplineArt";
import type { Group, Match, MatchSet, Team, Tournament } from "@/lib/types";
import ResultDialog, { type ExistingSet } from "@/components/ResultDialog";
import GenerateKnockoutForm from "@/components/GenerateKnockoutForm";
import DeleteTournamentForm from "@/components/DeleteTournamentForm";
import { archiveTournamentAction, finishTournamentAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = await isAdmin();
  const supabase = db();

  const { data: tData } = await supabase.from("tournaments").select().eq("id", id).single();
  if (!tData) notFound();
  const tournament = tData as Tournament;
  const settings = parseSettings(tournament.settings, tournament.discipline);
  const participant = PARTICIPANT[tournament.discipline];
  const color = DISCIPLINE_COLOR[tournament.discipline];
  const onStepColor = `color-mix(in srgb, ${color} 55%, var(--text))`;
  const isSets = settings.scoringType === "sets";

  const [{ data: gData }, { data: teamData }, { data: mData }] = await Promise.all([
    supabase.from("groups").select().eq("tournament_id", id).order("sort_order"),
    supabase.from("teams").select().eq("tournament_id", id),
    supabase
      .from("matches")
      .select()
      .eq("tournament_id", id)
      .order("round")
      .order("position"),
  ]);
  const groups = (gData ?? []) as Group[];
  const teams = (teamData ?? []) as Team[];
  const matches = (mData ?? []) as Match[];

  const matchIds = matches.map((m) => m.id);
  const { data: setData } =
    matchIds.length > 0
      ? await supabase.from("match_sets").select().in("match_id", matchIds).order("set_no")
      : { data: [] };
  const sets = (setData ?? []) as MatchSet[];

  const teamName = (teamId: string | null) =>
    teamId ? teams.find((t) => t.id === teamId)?.name ?? "?" : "—";

  const setsLabel = (matchId: string) => {
    const s = sets.filter((x) => x.match_id === matchId);
    if (s.length === 0) return null;
    return s.map((x) => `${x.points_a}:${x.points_b}`).join(" · ");
  };

  const existingSetsFor = (matchId: string): ExistingSet[] =>
    sets
      .filter((x) => x.match_id === matchId)
      .map((x) => ({
        winner: x.points_a > x.points_b ? ("a" as const) : ("b" as const),
        loserPoints: Math.min(x.points_a, x.points_b),
      }));

  const resultLabel = (m: Match) => {
    if (m.status !== "finished") return "–:–";
    if (m.score_a === null || m.score_b === null) return "w/o";
    let label = `${m.score_a}:${m.score_b}`;
    if (m.penalty_a !== null && m.penalty_b !== null) {
      label += ` (k. ${m.penalty_a}:${m.penalty_b})`;
    }
    return label;
  };

  const matchById = new Map(matches.map((m) => [m.id, m]));

  // mecz mozna edytowac, dopoki faza nie poszla dalej
  const isEditable = (m: Match): boolean => {
    if (tournament.status === "finished") return false;
    if (m.phase === "group") return tournament.status === "group";
    const next = m.next_match_id ? matchById.get(m.next_match_id) : null;
    const loserNext = m.loser_next_match_id ? matchById.get(m.loser_next_match_id) : null;
    return next?.status !== "finished" && loserNext?.status !== "finished";
  };

  const dialogFor = (m: Match, fmt: MatchFormat) =>
    admin &&
    m.team_a &&
    m.team_b &&
    isEditable(m) && (
      <ResultDialog
        matchId={m.id}
        nameA={teamName(m.team_a)}
        nameB={teamName(m.team_b)}
        scoringType={settings.scoringType}
        setsToWin={fmt.setsToWin}
        pointsPerSet={fmt.pointsPerSet}
        lastSetPoints={fmt.lastSetPoints}
        knockout={m.phase === "knockout"}
        penaltiesOnDraw={settings.penaltiesOnDraw}
        finished={m.status === "finished"}
        existingSets={existingSetsFor(m.id)}
        existingGoals={{ a: m.score_a, b: m.score_b, pa: m.penalty_a, pb: m.penalty_b }}
      />
    );

  const groupMatches = matches.filter((m) => m.phase === "group");
  const koMatches = matches.filter((m) => m.phase === "knockout");
  const groupById = new Map(groups.map((g) => [g.id, g]));

  // globalny terminarz: mecze przeplatane miedzy grupami
  const scheduleRounds = [...new Set(groupMatches.map((m) => m.round))].sort((a, b) => a - b);
  const scheduleForRound = (r: number) =>
    groupMatches
      .filter((m) => m.round === r)
      .sort(
        (a, b) =>
          a.position - b.position ||
          (groupById.get(a.group_id!)?.sort_order ?? 0) -
            (groupById.get(b.group_id!)?.sort_order ?? 0)
      );
  const orderedSchedule = scheduleRounds.flatMap(scheduleForRound);
  const nextUpId = orderedSchedule.find((m) => m.status !== "finished")?.id ?? null;
  let matchNo = 0;

  // drabinka dwustronna: rundy > 4 dzielone na lewo/prawo, final + 3. miejsce w srodku
  const nonThird = koMatches.filter((m) => !m.is_third_place);
  const koSizes = [...new Set(nonThird.map((m) => m.round_size ?? 2))].sort((a, b) => b - a);
  const leftCols: { rs: number; ms: Match[] }[] = [];
  const rightCols: { rs: number; ms: Match[] }[] = [];
  for (const rs of koSizes.filter((s) => s > 2)) {
    const ms = nonThird
      .filter((m) => m.round_size === rs)
      .sort((a, b) => a.position - b.position);
    const half = Math.ceil(ms.length / 2);
    leftCols.push({ rs, ms: ms.slice(0, half) });
    rightCols.unshift({ rs, ms: ms.slice(half) });
  }
  const thirdPlace = koMatches.find((m) => m.is_third_place) ?? null;
  const finalMatch = nonThird.find((m) => m.round_size === 2) ?? null;

  const allGroupFinished =
    groupMatches.length > 0 && groupMatches.every((m) => m.status === "finished");
  const knockoutDone =
    koMatches.length > 0 && koMatches.every((m) => m.status === "finished");
  const groupsDone = groupMatches.filter((m) => m.status === "finished").length;

  const fmtLabel = (fmt: MatchFormat) =>
    isSets
      ? `BO${fmt.setsToWin * 2 - 1} · ${fmt.setsToWin === 1 ? `gra do ${fmt.lastSetPoints}` : `set do ${fmt.pointsPerSet}`}` +
        (fmt.setsToWin > 1 && fmt.lastSetPoints !== fmt.pointsPerSet
          ? ` (dec. ${fmt.lastSetPoints})`
          : "")
      : `${fmt.matchMinutes} min`;

  const koCard = (m: Match, extraClass = "", extraStyle?: React.CSSProperties) => (
    <div className={`ko ${extraClass}`} style={extraStyle} key={m.id}>
      <div className="r">
        <span className={m.winner_id && m.winner_id === m.team_a ? "winner" : m.team_a ? "" : "hint"}>
          {teamName(m.team_a)}
        </span>
        <span className="score">{m.status === "finished" ? m.score_a ?? "" : ""}</span>
      </div>
      <div className="r">
        <span className={m.winner_id && m.winner_id === m.team_b ? "winner" : m.team_b ? "" : "hint"}>
          {teamName(m.team_b)}
        </span>
        <span className="score">{m.status === "finished" ? m.score_b ?? "" : ""}</span>
      </div>
      <div className="ko-actions">
        <span className="sets-note">
          {m.status === "finished" && m.score_a === null && "wolny los "}
          {isSets && setsLabel(m.id)}
          {m.penalty_a !== null && m.penalty_b !== null && ` karne ${m.penalty_a}:${m.penalty_b}`}
        </span>{" "}
        {dialogFor(m, settings.knockout)}
      </div>
    </div>
  );

  return (
    <div className="tint-scope" style={{ "--tint": color } as React.CSSProperties}>
      {/* BANNER */}
      <div
        className="banner"
        style={{
          borderColor: disciplineTint(tournament.discipline, 55),
          background: `linear-gradient(135deg, ${disciplineWash(tournament.discipline, 18)} 0%, ${disciplineWash(tournament.discipline, 34)} 100%)`,
        }}
      >
        <DisciplineArt discipline={tournament.discipline} size={230} strokeWidth={1.1} className="banner-art" />
        <div className="inner">
          <div>
            <div className="label">
              {DISCIPLINE_LABELS[tournament.discipline]} · {teams.length}{" "}
              {participant.genitivePlural}
              {groups.length > 0 && ` · ${groups.length} grup${groups.length === 1 ? "a" : "y"}`}
            </div>
            <h1 style={{ marginTop: 4 }}>{tournament.name}</h1>
            <div className="stepper" style={{ marginTop: 10 }}>
              <span
                className={"step" + (tournament.status === "group" ? " on" : "")}
                style={tournament.status === "group" ? { color: onStepColor } : undefined}
              >
                {tournament.status === "group" && <span className="dot" style={{ background: color }} />}GRUPY
              </span>
              <span className="sep" />
              <span
                className={"step" + (tournament.status === "knockout" ? " on" : "")}
                style={tournament.status === "knockout" ? { color: onStepColor } : undefined}
              >
                {tournament.status === "knockout" && <span className="dot" style={{ background: color }} />}PUCHAR
              </span>
              <span className="sep" />
              <span
                className={"step" + (tournament.status === "finished" ? " on" : "")}
                style={tournament.status === "finished" ? { color: onStepColor } : undefined}
              >
                {tournament.status === "finished" && <span className="dot" style={{ background: color }} />}FINAŁ
              </span>
            </div>
          </div>
          <div className="chips">
            {groupMatches.length > 0 && <span className="chip">grupa · {fmtLabel(settings.group)}</span>}
            <span className="chip">puchar · {fmtLabel(settings.knockout)}</span>
            {groupMatches.length > 0 && (
              <span className="chip">
                pkt {settings.groupPoints.win}
                {settings.drawAllowed && ` / ${settings.groupPoints.draw}`} / {settings.groupPoints.loss}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* PODIUM */}
      {tournament.status === "finished" && finalMatch?.winner_id && (
        <div className="podium-card">
          <div className="podium-cols">
            <div className="podium-col second">
              <span className="medal">2</span>
              <span className="p-name">
                {teamName(
                  finalMatch.winner_id === finalMatch.team_a ? finalMatch.team_b : finalMatch.team_a
                )}
              </span>
              <span className="label">2. miejsce</span>
              <span className="pedestal" />
            </div>
            <div className="podium-col first">
              <span className="medal">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
                  <path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" />
                  <path d="M12 14v4M8 20h8" />
                </svg>
              </span>
              <span className="p-name">{teamName(finalMatch.winner_id)}</span>
              <span className="label" style={{ color: "var(--gold)" }}>
                mistrz turnieju
              </span>
              <span className="pedestal" />
            </div>
            <div className="podium-col third">
              <span className="medal">3</span>
              <span className="p-name">
                {thirdPlace?.winner_id ? teamName(thirdPlace.winner_id) : "—"}
              </span>
              <span className="label">3. miejsce</span>
              <span className="pedestal" />
            </div>
          </div>
        </div>
      )}

      {/* DRABINKA DWUSTRONNA - nad grupami */}
      {koMatches.length > 0 && (
        <div className="bracket-card">
          <div className="sched-head">
            <h2>Drabinka</h2>
            <span className="label">
              {tournament.status === "group" ? "podgląd · aktywna po zamknięciu grup" : "faza pucharowa"}
              <span className="scroll-hint"> · przewiń →</span>
            </span>
          </div>
          <div className="bracket">
            <div className="bracket-inner">
            {leftCols.map((col) => (
              <div className="bracket-col" key={"l" + col.rs}>
                <span className="label col-label">{roundName(col.rs)}</span>
                {col.ms.map((m) => koCard(m))}
              </div>
            ))}
            <div className="bracket-center">
              <span className="label" style={{ color, display: "flex", alignItems: "center", gap: 7 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
                  <path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" />
                  <path d="M12 14v4M8 20h8" />
                </svg>
                Finał
              </span>
              {finalMatch &&
                koCard(finalMatch, "final", {
                  borderColor: disciplineTint(tournament.discipline, 45),
                  boxShadow: `0 0 34px ${disciplineTint(tournament.discipline, 10)}`,
                })}
              {thirdPlace && (
                <>
                  <span className="label">o 3. miejsce</span>
                  {koCard(thirdPlace, "third")}
                </>
              )}
            </div>
            {rightCols.map((col) => (
              <div className="bracket-col" key={"r" + col.rs}>
                <span className="label col-label">{roundName(col.rs)}</span>
                {col.ms.map((m) => koCard(m))}
              </div>
            ))}
            </div>
          </div>
        </div>
      )}

      {/* TABELE GRUP */}
      {groups.length > 0 && (
        <div className="groups-grid">
          {groups.map((g) => {
            const gTeams = teams.filter((t) => t.group_id === g.id);
            const gMatches = groupMatches.filter((m) => m.group_id === g.id);
            const gDone = gMatches.filter((m) => m.status === "finished").length;
            const standings = computeStandings(gTeams, gMatches, settings, sets);
            return (
              <div className="group-card" key={g.id}>
                <div
                  className="group-head"
                  style={{ background: disciplineTint(tournament.discipline, 8) }}
                >
                  <h2>{g.name}</h2>
                  <span
                    className="mono"
                    style={{ fontSize: 10, color: gDone === gMatches.length ? "var(--faint)" : "var(--tint)" }}
                  >
                    {gDone} / {gMatches.length} meczów
                  </span>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 30 }}>#</th>
                      <th className="tl">{participant.singular}</th>
                      <th title="mecze">M</th>
                      <th title="zwycięstwa">Z</th>
                      {settings.drawAllowed && <th title="remisy">R</th>}
                      <th title="porażki">P</th>
                      <th>{GOALS_WORD[tournament.discipline]}</th>
                      {isSets && <th title="małe punkty zdobyte:stracone">Małe</th>}
                      <th>Pkt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row, i) => {
                      const advances = i < settings.advancePerGroup;
                      return (
                        <tr
                          key={row.team.id}
                          style={advances ? { background: disciplineTint(tournament.discipline, 5) } : undefined}
                        >
                          <td className="rank" style={advances ? { color } : undefined}>
                            {i + 1}
                          </td>
                          <td className="tl" style={{ fontWeight: advances ? 600 : 400, color: advances ? "var(--text)" : "var(--muted)" }}>
                            {row.team.name}
                          </td>
                          <td>{row.played}</td>
                          <td>{row.wins}</td>
                          {settings.drawAllowed && <td>{row.draws}</td>}
                          <td>{row.losses}</td>
                          <td>
                            {row.scoreFor}:{row.scoreAgainst}
                          </td>
                          {isSets && (
                            <td style={{ color: "var(--muted)" }}>
                              {row.smallFor}:{row.smallAgainst}
                            </td>
                          )}
                          <td>
                            <strong style={{ color: advances ? color : undefined }}>{row.points}</strong>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* TERMINARZ */}
      {groupMatches.length > 0 && (
        <div className="sched-card">
          <div className="sched-head">
            <h2>Kolejność gier</h2>
            <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
              rozegrano {groupsDone} / {groupMatches.length}
            </span>
          </div>
          <div className="sched-body">
            {scheduleRounds.map((r) => (
              <div key={r}>
                <span className="round-label">Kolejka {r}</span>
                {scheduleForRound(r).map((m) => {
                  matchNo++;
                  const isNext = m.id === nextUpId;
                  return (
                    <div className={"match-row" + (isNext ? " next-up" : "")} key={m.id}>
                      <span className="match-head">
                        <span className="schedule-nr">{matchNo}</span>
                        <span className="schedule-group">
                          {(groupById.get(m.group_id!)?.name ?? "").replace("Grupa ", "")}
                        </span>
                      </span>
                      <span className="match-body">
                        <span className="teams">
                          <span className={m.winner_id && m.winner_id === m.team_a ? "winner" : ""}>
                            {teamName(m.team_a)}
                          </span>
                          <span style={{ color: "var(--faint)" }}> — </span>
                          <span className={m.winner_id && m.winner_id === m.team_b ? "winner" : ""}>
                            {teamName(m.team_b)}
                          </span>
                          {isNext && tournament.status === "group" && (
                            <span className="na-stole">
                              <span className="dot" style={{ background: "var(--tint)" }} />
                              GRAMY
                            </span>
                          )}
                        </span>
                        <span className="match-meta">
                          <span className={"result" + (m.status !== "finished" ? " pending" : "")}>
                            {resultLabel(m)}
                          </span>
                          {isSets && <span className="sets-note">{setsLabel(m.id)}</span>}
                          {admin && tournament.status === "group" && (
                            <span className="action">{dialogFor(m, settings.group)}</span>
                          )}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* generowanie fazy pucharowej */}
      {admin && tournament.status === "group" && (
        <GenerateKnockoutForm
          tournamentId={id}
          ready={allGroupFinished}
          unfinishedCount={groupMatches.length - groupsDone}
        />
      )}

      {/* akcje organizatora */}
      {admin && (
        <div className="card" style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {tournament.status === "knockout" && knockoutDone && (
            <form action={finishTournamentAction} className="inline-form" suppressHydrationWarning>
              <input type="hidden" name="tournamentId" value={id} />
              <button type="submit" style={{ marginTop: 0 }}>
                Zakończ turniej
              </button>
            </form>
          )}
          {tournament.status === "finished" && !tournament.archived_at && (
            <form action={archiveTournamentAction} className="inline-form" suppressHydrationWarning>
              <input type="hidden" name="tournamentId" value={id} />
              <button type="submit" className="secondary" style={{ marginTop: 0 }}>
                Archiwizuj
              </button>
            </form>
          )}
          <DeleteTournamentForm tournamentId={id} tournamentName={tournament.name} />
        </div>
      )}
    </div>
  );
}
