/**
 * Terminarz "kazdy z kazdym" metoda karuzelowa (circle method).
 * Zwraca liste kolejek; kazda kolejka to lista par [a, b].
 * Dla nieparzystej liczby druzyn dodawany jest wolny los (pauza) - para z null jest pomijana.
 */
export function roundRobin<T>(teams: T[]): [T, T][][] {
  const list: (T | null)[] = [...teams];
  if (list.length < 2) return [];
  if (list.length % 2 === 1) list.push(null);

  const n = list.length;
  const roundsCount = n - 1;
  const half = n / 2;
  const rounds: [T, T][][] = [];

  const rotation = list.slice(1);
  for (let r = 0; r < roundsCount; r++) {
    const pairs: [T, T][] = [];
    const current = [list[0], ...rotation];
    for (let i = 0; i < half; i++) {
      const a = current[i];
      const b = current[n - 1 - i];
      if (a !== null && b !== null) {
        // naprzemiennie zamieniamy gospodarza, zeby druzyna nr 1 nie grala zawsze "u siebie"
        pairs.push(r % 2 === 0 ? [a, b] : [b, a]);
      }
    }
    rounds.push(pairs);
    rotation.unshift(rotation.pop()!);
  }
  return rounds;
}
