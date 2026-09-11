/**
 * Narzedzia do budowy drabinki pucharowej.
 */

/** Najmniejsza potega dwojki >= n (minimum 2). */
export function bracketSize(n: number): number {
  let size = 2;
  while (size < n) size *= 2;
  return size;
}

/**
 * Standardowa kolejnosc rozstawienia w drabince o rozmiarze `size` (potega 2).
 * Zwraca numery rozstawienia (1-indeksowane) w kolejnosci pozycji drabinki,
 * np. dla 8: [1, 8, 4, 5, 2, 7, 3, 6] -> pary (1v8), (4v5), (2v7), (3v6).
 * Gwarantuje, ze najwyzsze rozstawienia spotkaja sie najpozniej.
 */
export function seedOrder(size: number): number[] {
  let order = [1, 2];
  while (order.length < size) {
    const next: number[] = [];
    const opponentSum = order.length * 2 + 1;
    for (const seed of order) {
      next.push(seed, opponentSum - seed);
    }
    order = next;
  }
  return order;
}

export function roundName(roundSize: number, isThirdPlace = false): string {
  if (isThirdPlace) return "Mecz o 3. miejsce";
  if (roundSize === 2) return "Finał";
  if (roundSize === 4) return "Półfinał";
  if (roundSize === 8) return "Ćwierćfinał";
  return `1/${roundSize / 2} finału`;
}
