"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveResultAction, type ActionResult } from "@/app/actions";

export interface ExistingSet {
  winner: "a" | "b";
  loserPoints: number;
}

interface Props {
  matchId: string;
  nameA: string;
  nameB: string;
  scoringType: "sets" | "goals";
  setsToWin: number;
  pointsPerSet: number;
  lastSetPoints: number;
  knockout: boolean;
  penaltiesOnDraw: boolean;
  finished: boolean;
  existingSets: ExistingSet[];
  existingGoals: {
    a: number | null;
    b: number | null;
    pa: number | null;
    pb: number | null;
  };
}

export default function ResultDialog(props: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    saveResultAction,
    {}
  );

  useEffect(() => {
    if (state.ok) {
      dialogRef.current?.close();
      router.refresh();
    }
  }, [state, router]);

  const maxSets = props.setsToWin * 2 - 1;

  return (
    <>
      <button
        type="button"
        className={props.finished ? "mini secondary" : "mini"}
        onClick={() => dialogRef.current?.showModal()}
      >
        {props.finished ? "popraw wynik" : "wpisz wynik"}
      </button>
      <dialog ref={dialogRef} className="result-dialog">
        <form action={formAction} suppressHydrationWarning>
          <input type="hidden" name="matchId" value={props.matchId} />
          <h3 style={{ marginTop: 0 }}>
            {props.nameA} — {props.nameB}
          </h3>

          {props.scoringType === "sets" ? (
            <>
              <p className="hint">
                {props.setsToWin === 1
                  ? `Gra do ${props.lastSetPoints}`
                  : `Do ${props.setsToWin} wygranych setów, set do ${props.pointsPerSet}` +
                    (props.lastSetPoints !== props.pointsPerSet
                      ? `, decydujący do ${props.lastSetPoints}`
                      : "")}
                . Zaznacz, kto wygrał{props.setsToWin > 1 && " seta"}, i wpisz punkty
                przegranego — wynik wyliczy się sam.
              </p>
              <div>
                {Array.from({ length: maxSets }, (_, i) => {
                  const existing = props.existingSets[i];
                  return (
                    <div className="set-row" key={i}>
                      <span className="set-no">
                        Set {i + 1}
                        {i + 1 === maxSets && maxSets > 1 && " · dec."}
                      </span>
                      <div className="seg-group">
                        <label className="seg">
                          <input
                            type="radio"
                            name={`set${i + 1}w`}
                            value="a"
                            defaultChecked={existing?.winner === "a"}
                          />
                          {props.nameA}
                        </label>
                        <label className="seg">
                          <input
                            type="radio"
                            name={`set${i + 1}w`}
                            value="b"
                            defaultChecked={existing?.winner === "b"}
                          />
                          {props.nameB}
                        </label>
                        <label className="seg seg-none" title="set nie był grany">
                          <input
                            type="radio"
                            name={`set${i + 1}w`}
                            value=""
                            defaultChecked={!existing}
                          />
                          —
                        </label>
                      </div>
                      <div className="set-pts">
                        <span className="label">pkt przegr.</span>
                        <input
                          className="score"
                          type="number"
                          min={0}
                          name={`set${i + 1}p`}
                          defaultValue={existing?.loserPoints ?? ""}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="goals-grid">
                <label>
                  {props.nameA}
                  <input
                    className="score"
                    type="number"
                    min={0}
                    name="goalsA"
                    defaultValue={props.existingGoals.a ?? ""}
                    required
                  />
                </label>
                <label>
                  {props.nameB}
                  <input
                    className="score"
                    type="number"
                    min={0}
                    name="goalsB"
                    defaultValue={props.existingGoals.b ?? ""}
                    required
                  />
                </label>
              </div>
              {props.knockout && !props.penaltiesOnDraw && (
                <p className="hint">
                  Remis niemożliwy — przy remisie po regulaminowym czasie wpisz wynik po dogrywce.
                </p>
              )}
              {props.knockout && props.penaltiesOnDraw && (
                <>
                  <p className="hint">Przy remisie wpisz rzuty karne (muszą wyłonić zwycięzcę):</p>
                  <div className="goals-grid">
                    <label>
                      karne
                      <input
                        className="score"
                        type="number"
                        min={0}
                        name="penaltyA"
                        defaultValue={props.existingGoals.pa ?? ""}
                      />
                    </label>
                    <label>
                      karne
                      <input
                        className="score"
                        type="number"
                        min={0}
                        name="penaltyB"
                        defaultValue={props.existingGoals.pb ?? ""}
                      />
                    </label>
                  </div>
                </>
              )}
            </>
          )}

          {state.error && <p className="error">{state.error}</p>}

          <div className="dialog-actions">
            <button type="submit" disabled={pending}>
              {pending ? "Zapisywanie..." : "Zapisz wynik"}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => dialogRef.current?.close()}
            >
              Anuluj
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
