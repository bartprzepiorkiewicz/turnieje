-- Migracja: czytelne adresy turniejow (np. /turniej/kalwa-ping26 zamiast UUID).
-- Uruchom w Supabase: SQL Editor -> New query -> wklej -> Run.
-- (Dla nowej bazy wystarczy sam schema.sql - ta migracja jest dla juz istniejacej.)

alter table tournaments add column if not exists slug text;

with base as (
  select
    id,
    nullif(
      regexp_replace(
        regexp_replace(
          lower(translate(name, 'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ', 'acelnoszzACELNOSZZ')),
          '[^a-z0-9]+', '-', 'g'
        ),
        '(^-+|-+$)', '', 'g'
      ),
      ''
    ) as base_slug
  from tournaments
  where slug is null
),
numbered as (
  select id, coalesce(base_slug, 'turniej') as base_slug,
    row_number() over (partition by coalesce(base_slug, 'turniej') order by id) as rn
  from base
)
update tournaments t
set slug = case when n.rn = 1 then n.base_slug else n.base_slug || '-' || n.rn end
from numbered n
where t.id = n.id;

alter table tournaments alter column slug set not null;
alter table tournaments add constraint tournaments_slug_key unique (slug);
