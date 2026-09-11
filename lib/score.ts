import type { Discipline } from "./disciplines";

/**
 * Punkty zwyciezcy seta wyliczone z punktow przegranego.
 * - tenis: set do `target` gemow; przy stanie target-1 lub target -> target+1 (7:5 albo 7:6 po tie-breaku)
 * - przewaga 2 (ping-pong, siatkowka): ponizej target-1 -> target, inaczej loser+2 (np. 12:10)
 * - bez przewagi: zawsze co najmniej target i wiecej niz przegrany
 * Zwraca null, gdy punkty przegranego sa niemozliwe przy tych ustawieniach.
 */
export function winnerPoints(
  discipline: Discipline,
  winByTwo: boolean,
  target: number,
  loserPoints: number
): number | null {
  if (!Number.isInteger(loserPoints) || loserPoints < 0) return null;
  if (discipline === "tenis") {
    if (loserPoints > target) return null; // maks. 7:6
    if (loserPoints <= target - 2) return target;
    return target + 1;
  }
  if (winByTwo) {
    if (loserPoints > 199) return null;
    return loserPoints <= target - 2 ? target : loserPoints + 2;
  }
  // bez przewagi (np. bule do 13): gra konczy sie dokladnie na target
  if (loserPoints >= target) return null;
  return target;
}
