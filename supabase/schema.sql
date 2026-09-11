-- Schemat bazy dla aplikacji turniejowej.
-- Uruchom ten plik w Supabase: SQL Editor -> New query -> wklej -> Run.

create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  discipline text not null check (discipline in ('ping-pong', 'tenis', 'siatkowka', 'pilka-nozna', 'koszykowka', 'bule', 'bule-druzynowe')),
  status text not null default 'setup' check (status in ('setup', 'group', 'knockout', 'finished')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  group_id uuid references groups(id) on delete set null,
  name text not null,
  seed int not null default 0
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  phase text not null check (phase in ('group', 'knockout')),
  group_id uuid references groups(id) on delete cascade,
  round int not null default 1,       -- faza grupowa: numer kolejki; pucharowa: 1 = pierwsza runda drabinki
  position int not null default 0,    -- kolejnosc meczu w rundzie
  round_size int,                     -- pucharowa: liczba druzyn w rundzie (2 = final, 4 = polfinaly...)
  is_third_place boolean not null default false,
  team_a uuid references teams(id) on delete set null,
  team_b uuid references teams(id) on delete set null,
  score_a int,                        -- wygrane sety lub bramki
  score_b int,
  penalty_a int,                      -- pilka nozna, faza pucharowa: rzuty karne
  penalty_b int,
  winner_id uuid references teams(id) on delete set null,
  status text not null default 'scheduled' check (status in ('scheduled', 'finished')),
  next_match_id uuid references matches(id) on delete set null,       -- dokad idzie zwyciezca
  next_slot text check (next_slot in ('a', 'b')),
  loser_next_match_id uuid references matches(id) on delete set null, -- dokad idzie przegrany (polfinal -> mecz o 3. miejsce)
  loser_next_slot text check (loser_next_slot in ('a', 'b'))
);

create table if not exists match_sets (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  set_no int not null,
  points_a int not null default 0,
  points_b int not null default 0,
  unique (match_id, set_no)
);

create index if not exists idx_groups_tournament on groups(tournament_id);
create index if not exists idx_teams_tournament on teams(tournament_id);
create index if not exists idx_matches_tournament on matches(tournament_id);
create index if not exists idx_match_sets_match on match_sets(match_id);

-- Aplikacja laczy sie wylacznie z serwera (service role key), wiec blokujemy dostep anonimowy.
alter table tournaments enable row level security;
alter table groups enable row level security;
alter table teams enable row level security;
alter table matches enable row level security;
alter table match_sets enable row level security;
