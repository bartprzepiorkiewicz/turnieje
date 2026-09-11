-- Migracja: nowe dyscypliny (koszykowka, bule singlowe i druzynowe).
-- Uruchom w Supabase: SQL Editor -> New query -> wklej -> Run.
-- (Dla nowej bazy wystarczy sam schema.sql - ta migracja jest dla juz istniejacej.)

alter table tournaments drop constraint if exists tournaments_discipline_check;
alter table tournaments add constraint tournaments_discipline_check
  check (discipline in ('ping-pong', 'tenis', 'siatkowka', 'pilka-nozna', 'koszykowka', 'bule', 'bule-druzynowe'));
