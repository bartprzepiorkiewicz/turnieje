"use client";

import { useRef } from "react";
import { deleteTournamentAction } from "@/app/actions";

interface Props {
  tournamentId: string;
  tournamentName: string;
}

export default function DeleteTournamentForm({ tournamentId, tournamentName }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        className="danger"
        style={{ marginTop: 0 }}
        onClick={() => dialogRef.current?.showModal()}
      >
        Usuń turniej
      </button>

      <dialog ref={dialogRef} className="result-dialog">
        <h3 style={{ marginTop: 0 }}>Usuń turniej</h3>
        <p>
          Czy na pewno chcesz usunąć turniej <strong style={{ color: "var(--text)" }}>{tournamentName}</strong>?
        </p>
        <p className="hint">Tej operacji nie da się cofnąć — znikną wszystkie drużyny, mecze i wyniki.</p>
        <form action={deleteTournamentAction} suppressHydrationWarning>
          <input type="hidden" name="tournamentId" value={tournamentId} />
          <div className="dialog-actions">
            <button type="submit" className="danger">
              Tak, usuń turniej
            </button>
            <button type="button" className="secondary" onClick={() => dialogRef.current?.close()}>
              Anuluj
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
