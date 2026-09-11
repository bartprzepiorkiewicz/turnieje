"use client";

import { useRef } from "react";
import { generateKnockoutAction } from "@/app/actions";

interface Props {
  tournamentId: string;
  ready: boolean;
  unfinishedCount: number;
}

export default function GenerateKnockoutForm({ tournamentId, ready, unfinishedCount }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <div className="card">
      <p>
        {ready
          ? "Wszystkie mecze grupowe rozegrane — można generować drabinkę."
          : `Pozostały nierozegrane mecze grupowe (${unfinishedCount}).`}
      </p>
      <button type="button" disabled={!ready} onClick={() => dialogRef.current?.showModal()}>
        Generuj fazę pucharową
      </button>

      <dialog ref={dialogRef} className="result-dialog">
        <h3 style={{ marginTop: 0 }}>Przejście do fazy pucharowej</h3>
        <p>Czy na pewno wszystkie wyniki grupowe są poprawne?</p>
        <p className="hint">
          Po wygenerowaniu drabinki faza grupowa zostaje zamknięta i nie da się już
          poprawiać jej wyników.
        </p>
        <form action={generateKnockoutAction} suppressHydrationWarning>
          <input type="hidden" name="tournamentId" value={tournamentId} />
          <div className="dialog-actions">
            <button type="submit">Tak, generuj drabinkę</button>
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
    </div>
  );
}
