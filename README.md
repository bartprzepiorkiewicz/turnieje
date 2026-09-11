# Turnieje

Aplikacja webowa do prowadzenia turniejów sportowych: **ping-pong, tenis ziemny, siatkówka, piłka nożna, koszykówka, bule (singlowe i drużynowe)**.
Faza grupowa (każdy z każdym) + faza pucharowa (drabinka z meczem o 3. miejsce).

Stack: Next.js (App Router) + Supabase (PostgreSQL). Organizator loguje się prostym hasłem,
widzowie oglądają wyniki bez logowania.

## Konfiguracja (jednorazowa)

1. **Supabase** — załóż nowy projekt na [supabase.com](https://supabase.com).
2. W Supabase otwórz **SQL Editor → New query**, wklej zawartość pliku
   [`supabase/schema.sql`](supabase/schema.sql) i kliknij **Run**.
3. Skopiuj `.env.local.example` do `.env.local` i uzupełnij:
   - `SUPABASE_URL` — Project Settings → API → Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API → `service_role` (secret!)
   - `ADMIN_PASSWORD` — wymyślone hasło organizatora

## Uruchomienie lokalnie

```bash
npm install
npm run dev
```

Aplikacja: http://localhost:3000

## Deploy na Vercel

1. Wypchnij repo na GitHub i podłącz projekt w Vercel.
2. W Vercel → Settings → Environment Variables ustaw te same trzy zmienne co w `.env.local`.
3. Na Hostingerze ustaw przekierowanie domeny na adres z Vercel (jak w poprzedniej aplikacji).

## Jak przebiega turniej

1. **Zaloguj się** (link „Logowanie organizatora") i kliknij **+ Nowy turniej**.
2. Wybierz dyscyplinę — formularz podpowie sensowne wartości domyślne. Format meczu
   ustawia się **osobno dla fazy grupowej** (krótsze mecze) **i pucharowej**:
   | Dyscyplina | Grupa | Puchar | Punkty w grupie |
   |---|---|---|---|
   | Ping-pong | best-of-3, set do 11 | best-of-5, set do 11 | 2/0 (Z/P) |
   | Tenis | 1 set do 6 gemów | best-of-3 | 2/0 |
   | Siatkówka | best-of-3, set do 25, tie-break do 15 | jak grupa | 3/0 |
   | Piłka nożna | 15 min, remisy dozwolone | 15 min, karne przy remisie | 3/1/0 (Z/R/P) |
   | Koszykówka | 20 min, bez remisów (dogrywka) | jak grupa | 2/1 (system FIBA) |
   | Bule (singlowe i drużynowe) | gra do 13 pkt | jak grupa | 1/0 |
3. Wpisz uczestników (jeden na linię — kolejność decyduje o rozstawieniu), liczbę grup
   (0 = od razu drabinka) i ilu awansuje z grupy.
4. Terminarz generuje się automatycznie — sekcja „Kolejność gier" pokazuje mecze
   wszystkich grup naprzemiennie, więc wiadomo, kogo wołać do gry. Wynik wpisuje się
   w okienku: zaznaczasz, kto wygrał seta, i punkty przegranego — reszta liczy się sama.
5. Po rozegraniu wszystkich meczów grupowych kliknij **Generuj fazę pucharową** —
   drabinka powstaje z par krzyżowych (zwycięzca grupy gra z drugą drużyną innej grupy),
   przy niepełnej drabince najwyżej rozstawieni dostają wolny los.
6. Wpisz wyniki drabinki (w piłce nożnej przy remisie — rzuty karne) i kliknij **Zakończ turniej**.

## Zasady w tabeli grupowej

Kolejność: punkty → wynik bezpośredniego meczu → bilans setów/bramek → bilans małych
punktów (punkty/gemy w setach) → zdobyte małe punkty.
