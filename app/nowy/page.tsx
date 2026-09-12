import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import {
  DEFAULT_SETTINGS,
  DISCIPLINE_LABELS,
  PARTICIPANT,
  SET_UNIT,
  type Discipline,
} from "@/lib/disciplines";
import DisciplineArt, { DISCIPLINE_COLOR, disciplineTint, disciplineWash } from "@/components/DisciplineArt";
import FormatFields from "@/components/FormatFields";
import TournamentStats from "@/components/TournamentStats";
import { createTournamentAction } from "../actions";

const GROUP_OPTIONS = [0, 1, 2, 3, 4, 6, 8];
const ADVANCE_OPTIONS = [1, 2, 3, 4];

function SectionHead({ no, title }: { no: string; title: string }) {
  return (
    <div className="sec-head">
      <span className="sec-no">{no}</span>
      <span className="sec-title">{title}</span>
      <span className="sec-rule" />
    </div>
  );
}

export default async function NewTournamentPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  if (!(await isAdmin())) redirect("/login");

  const params = await searchParams;
  const discipline = (params.d ?? "") as Discipline;
  const settings = DEFAULT_SETTINGS[discipline];
  if (!settings) redirect("/"); // dyscypline wybiera sie kafelkami na stronie glownej

  const isSets = settings.scoringType === "sets";
  const participant = PARTICIPANT[discipline];
  const isFootball = discipline === "pilka-nozna";

  return (
    <form
      action={createTournamentAction}
      className="nowy-grid"
      style={{ "--tint": DISCIPLINE_COLOR[discipline] } as React.CSSProperties}
      suppressHydrationWarning
    >
      <input type="hidden" name="discipline" value={discipline} />

      <div className="nowy-main">
        {/* mini banner dyscypliny */}
        <div
          className="banner"
          style={{
            margin: 0,
            borderColor: disciplineTint(discipline, 55),
            background: `linear-gradient(135deg, ${disciplineWash(discipline, 18)} 0%, ${disciplineWash(discipline, 34)} 100%)`,
          }}
        >
          <DisciplineArt discipline={discipline} size={100} className="banner-art-mini" />
          <div className="inner" style={{ padding: "16px 22px", alignItems: "center" }}>
            <div>
              <div className="label">nowy turniej · dyscyplina</div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}>
                {DISCIPLINE_LABELS[discipline]}
              </div>
            </div>
            <Link href="/" className="chip chip-action" style={{ textDecoration: "none" }}>
              zmień ↩
            </Link>
          </div>
        </div>

        {/* 01 podstawy */}
        <div className="form-section">
          <SectionHead no="01" title="Podstawy" />
          <span className="fld">Nazwa turnieju</span>
          <input type="text" name="name" required placeholder="np. Turniej firmowy 2026" style={{ maxWidth: "100%" }} />
          <span className="fld">
            {participant.plural} <span className="dim">· jeden na linię · kolejność = rozstawienie</span>
          </span>
          <textarea
            name="teams"
            rows={8}
            required
            style={{ maxWidth: "100%" }}
            placeholder={
              participant.plural === "Zawodnicy"
                ? "Jan Kowalski\nAnna Nowak\n..."
                : "Drużyna A\nDrużyna B\n..."
            }
          />
        </div>

        {/* 02 format meczu */}
        <div className="form-section">
          <SectionHead no="02" title="Format meczu" />
          <div className="format-grid">
            <div className="sub-card">
              <div className="label" style={{ marginBottom: 4 }}>
                faza grupowa · krótsze mecze
              </div>
              <FormatFields prefix="g" fmt={settings.group} setUnit={SET_UNIT[discipline]} isSets={isSets} />
            </div>
            <div className="sub-card">
              <div className="label" style={{ marginBottom: 4 }}>
                faza pucharowa
              </div>
              <FormatFields prefix="ko" fmt={settings.knockout} setUnit={SET_UNIT[discipline]} isSets={isSets} />
            </div>
          </div>
        </div>

        {/* 03 grupy i awans */}
        <div className="form-section">
          <SectionHead no="03" title="Grupy i awans" />
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <div>
              <span className="fld">
                Liczba grup <span className="dim">· 0 = od razu drabinka</span>
              </span>
              <div className="seg-group seg-fit">
                {GROUP_OPTIONS.map((v) => (
                  <label className="seg" key={v}>
                    <input type="radio" name="groupCount" value={v} defaultChecked={v === 2} />
                    {v}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <span className="fld">Awansuje z grupy</span>
              <div className="seg-group seg-fit">
                {ADVANCE_OPTIONS.map((v) => (
                  <label className="seg" key={v}>
                    <input
                      type="radio"
                      name="advancePerGroup"
                      value={v}
                      defaultChecked={v === settings.advancePerGroup}
                    />
                    {v}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <span className="fld">
                Punkty: zwycięstwo {isFootball && "/ remis "}/ porażka
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="num" type="number" name="pointsWin" defaultValue={settings.groupPoints.win} />
                {isFootball && (
                  <input className="num" type="number" name="pointsDraw" defaultValue={settings.groupPoints.draw} />
                )}
                <input className="num" type="number" name="pointsLoss" defaultValue={settings.groupPoints.loss} />
              </div>
            </div>
          </div>
        </div>

        {/* 04 faza pucharowa */}
        <div className="form-section">
          <SectionHead no="04" title="Faza pucharowa" />
          <label className="switch">
            <input type="checkbox" name="thirdPlaceMatch" defaultChecked={settings.thirdPlaceMatch} />
            <span className="track" />
            Rozegraj mecz o 3. miejsce
          </label>
        </div>
      </div>

      {/* prawa szyna: podsumowanie */}
      <div className="nowy-rail">
        <TournamentStats participantWord={participant.genitivePlural} />
        <div className="card" style={{ padding: "14px 18px", fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
          <span className="label" style={{ display: "block", marginBottom: 6 }}>
            podpowiedź
          </span>
          Ustawienia domyślne pochodzą z reguł dyscypliny — zmieniaj tylko to, co potrzebujesz.
          Nietypowe wartości (np. set do 21) wpisujesz wprost w pola liczbowe.
        </div>
      </div>
    </form>
  );
}
