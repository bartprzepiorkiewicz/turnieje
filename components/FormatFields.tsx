"use client";

import { useState } from "react";
import type { MatchFormat } from "@/lib/disciplines";

interface Props {
  prefix: "g" | "ko";
  fmt: MatchFormat;
  setUnit: string; // np. "punktów w secie", "gemów w secie", "punktów"
  isSets: boolean;
}

const LENGTH_OPTIONS = [
  { value: 1, label: "1 set" },
  { value: 2, label: "BO3" },
  { value: 3, label: "BO5" },
  { value: 4, label: "BO7" },
];

/**
 * Pola formatu meczu: segmentowany wybor dlugosci + pola punktow.
 * Przy "1 set" mecz to jeden set decydujacy, wiec pole "set do" znika.
 */
export default function FormatFields({ prefix, fmt, setUnit, isSets }: Props) {
  const initial = Math.min(Math.max(fmt.setsToWin, 1), 4);
  const [setsToWin, setSetsToWin] = useState(initial);
  const singleSet = setsToWin <= 1;

  if (!isSets) {
    return (
      <div>
        <span className="fld">Czas meczu (minuty)</span>
        <input className="num" type="number" name={`${prefix}MatchMinutes`} min={1} defaultValue={fmt.matchMinutes} />
      </div>
    );
  }

  return (
    <>
      <span className="fld">Długość meczu</span>
      <div className="seg-group seg-fit">
        {LENGTH_OPTIONS.map((o) => (
          <label className="seg" key={o.value}>
            <input
              type="radio"
              name={`${prefix}SetsToWin`}
              value={o.value}
              defaultChecked={o.value === initial}
              onChange={() => setSetsToWin(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        {!singleSet && (
          <div>
            <span className="fld">Set do <span className="dim">({setUnit})</span></span>
            <input className="num" type="number" name={`${prefix}PointsPerSet`} min={1} defaultValue={fmt.pointsPerSet} />
          </div>
        )}
        <div>
          <span className="fld">
            {singleSet ? (
              <>Gra do <span className="dim">({setUnit})</span></>
            ) : (
              <>Set decydujący do</>
            )}
          </span>
          <input className="num" type="number" name={`${prefix}LastSetPoints`} min={1} defaultValue={fmt.lastSetPoints} />
        </div>
      </div>
    </>
  );
}
