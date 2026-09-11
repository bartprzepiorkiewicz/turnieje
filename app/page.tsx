import Link from "next/link";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { DISCIPLINE_LABELS, type Discipline } from "@/lib/disciplines";
import DisciplineArt, { DISCIPLINE_COLOR, DISCIPLINE_HINT, disciplineTint, disciplineWash } from "@/components/DisciplineArt";
import type { Match, Team, Tournament } from "@/lib/types";

export const dynamic = "force-dynamic";

const PHASE_LABELS: Record<Tournament["status"], string> = {
  setup: "przygotowanie",
  group: "faza grupowa",
  knockout: "faza pucharowa",
  finished: "zakończony",
};

export default async function HomePage() {
  const admin = await isAdmin();

  let tournaments: Tournament[] = [];
  let matches: Match[] = [];
  let teams: Team[] = [];
  let dbError: string | null = null;
  try {
    const supabase = db();
    const [tRes, mRes, teamRes] = await Promise.all([
      supabase.from("tournaments").select().order("created_at", { ascending: false }),
      supabase.from("matches").select("id,tournament_id,phase,round,position,status,team_a,team_b,winner_id,round_size,is_third_place"),
      supabase.from("teams").select("id,tournament_id,name"),
    ]);
    if (tRes.error) throw new Error(tRes.error.message);
    tournaments = (tRes.data ?? []) as Tournament[];
    matches = (mRes.data ?? []) as Match[];
    teams = (teamRes.data ?? []) as Team[];
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
  }

  const active = tournaments.filter((t) => !t.archived_at);
  const archived = tournaments.filter((t) => t.archived_at);
  const teamName = (id: string | null) => teams.find((t) => t.id === id)?.name ?? "?";

  const cardData = (t: Tournament) => {
    const ms = matches.filter((m) => m.tournament_id === t.id);
    const total = ms.length;
    const done = ms.filter((m) => m.status === "finished").length;
    const next = ms
      .filter((m) => m.status !== "finished" && m.team_a && m.team_b)
      .sort(
        (a, b) =>
          (a.phase === "group" ? 0 : 1) - (b.phase === "group" ? 0 : 1) ||
          a.round - b.round ||
          a.position - b.position
      )[0];
    const winner = ms.find(
      (m) => m.phase === "knockout" && m.round_size === 2 && !m.is_third_place && m.winner_id
    );
    return { total, done, next, winnerName: winner ? teamName(winner.winner_id) : null };
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="label">Panel turniejowy</div>
          <h1>Turnieje</h1>
        </div>
        {!dbError && (
          <div className="counters">
            <div className="counter">
              <div className="val">{active.length}</div>
              <div className="label">aktywne</div>
            </div>
            <div className="counter">
              <div className="val">{matches.length}</div>
              <div className="label">mecze łącznie</div>
            </div>
            <div className="counter">
              <div className="val">{teams.length}</div>
              <div className="label">uczestników</div>
            </div>
          </div>
        )}
      </div>

      {dbError && (
        <div className="card">
          <p className="error">Nie udało się połączyć z bazą danych.</p>
          <p className="hint">{dbError}</p>
          <p className="hint">
            Sprawdź plik <code>.env.local</code> (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) oraz
            czy w Supabase uruchomiono <code>supabase/schema.sql</code>.
          </p>
        </div>
      )}

      {!dbError && tournaments.length === 0 && (
        <p className="hint">
          Brak turniejów.{admin ? " Wybierz dyscyplinę poniżej, żeby utworzyć pierwszy." : " Organizator jeszcze żadnego nie utworzył."}
        </p>
      )}

      {active.length > 0 && (
        <div className="t-cards">
          {active.map((t) => {
            const { total, done, next, winnerName } = cardData(t);
            const color = DISCIPLINE_COLOR[t.discipline];
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <Link
                href={`/turniej/${t.id}`}
                key={t.id}
                className="t-card"
                style={{
                  "--tint": color,
                  background: `linear-gradient(135deg, ${disciplineWash(t.discipline, 18)} 0%, ${disciplineWash(t.discipline, 34)} 100%)`,
                  borderColor: disciplineTint(t.discipline, 55),
                } as React.CSSProperties}
              >
                <div className="row">
                  <span className="disc" style={{ color: `color-mix(in srgb, ${color} 55%, var(--text))` }}>
                    {DISCIPLINE_LABELS[t.discipline]}
                  </span>
                  <span className="phase" style={{ color: `color-mix(in srgb, ${color} 55%, var(--text))` }}>
                    <span className="dot" style={{ background: color }} />
                    {PHASE_LABELS[t.status]}
                  </span>
                </div>
                <span className="name">{t.name}</span>
                <div>
                  <div className="row" style={{ marginBottom: 6 }}>
                    <span className="label">postęp turnieju</span>
                    <span
                      className="mono"
                      style={{ fontSize: 11, color: "color-mix(in srgb, var(--text) 55%, var(--muted))" }}
                    >
                      {done} / {total} meczów
                    </span>
                  </div>
                  <div className="progress">
                    <div style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
                <div className="row">
                  <span className="hint" style={{ fontSize: 13 }}>
                    {next ? (
                      <>
                        gra:{" "}
                        <strong style={{ color: "var(--text)" }}>
                          {teamName(next.team_a)} — {teamName(next.team_b)}
                        </strong>
                      </>
                    ) : winnerName ? (
                      <>
                        wygrywa: <strong style={{ color: "var(--text)" }}>{winnerName}</strong>
                      </>
                    ) : (
                      "wszystkie mecze rozegrane"
                    )}
                  </span>
                  <span className="chip chip-action">otwórz →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {archived.length > 0 && (
        <>
          <div className="section-head">
            <span className="label">archiwum</span>
            <span className="rule" />
          </div>
          {archived.map((t) => {
            const { winnerName } = cardData(t);
            const color = DISCIPLINE_COLOR[t.discipline];
            return (
              <Link
                href={`/turniej/${t.id}`}
                key={t.id}
                className="archive-row"
                style={{
                  "--tint": color,
                  background: `linear-gradient(135deg, ${disciplineWash(t.discipline, 4)} 0%, ${disciplineWash(t.discipline, 8)} 100%)`,
                  borderColor: disciplineTint(t.discipline, 16),
                } as React.CSSProperties}
              >
                <span className="label" style={{ width: 110 }}>
                  {DISCIPLINE_LABELS[t.discipline]}
                </span>
                <span style={{ flex: 1, color: "color-mix(in srgb, var(--text) 55%, var(--muted))" }}>
                  {t.name}
                  {winnerName && (
                    <>
                      {" · "}
                      <span style={{ color: "var(--text)" }}>wygrywa {winnerName}</span>
                    </>
                  )}
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 11, color: "color-mix(in srgb, var(--text) 40%, var(--muted))" }}
                >
                  {new Date(t.created_at).toLocaleDateString("pl-PL")}
                </span>
              </Link>
            );
          })}
        </>
      )}

      {admin && !dbError && (
        <>
          <div className="section-head">
            <span className="label">nowy turniej</span>
            <span className="rule" />
          </div>
          <div className="tiles">
            {(Object.keys(DISCIPLINE_LABELS) as Discipline[]).map((d) => {
              const color = DISCIPLINE_COLOR[d];
              return (
                <Link
                  key={d}
                  href={`/nowy?d=${d}`}
                  className="tile"
                  style={{
                    background: `linear-gradient(135deg, ${disciplineWash(d, 18)} 0%, ${disciplineWash(d, 34)} 100%)`,
                    borderColor: disciplineTint(d, 55),
                    "--tint": color,
                  } as React.CSSProperties}
                >
                  <DisciplineArt
                    discipline={d}
                    size={130}
                    className="tile-art"
                    style={{ stroke: "var(--tile-icon-stroke)" }}
                  />
                  <span className="t-name">{DISCIPLINE_LABELS[d]}</span>
                  <span className="t-hint">{DISCIPLINE_HINT[d]}</span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
