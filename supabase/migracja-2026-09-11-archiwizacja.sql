-- Migracja: reczna archiwizacja turniejow (niezalezna od statusu "zakonczony").
-- Uruchom w Supabase: SQL Editor -> New query -> wklej -> Run.
-- (Dla nowej bazy wystarczy sam schema.sql - ta migracja jest dla juz istniejacej.)

alter table tournaments add column if not exists archived_at timestamptz;
