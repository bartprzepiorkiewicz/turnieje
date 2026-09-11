import type { Discipline } from "./disciplines";

export interface Tournament {
  id: string;
  name: string;
  discipline: Discipline;
  status: "setup" | "group" | "knockout" | "finished";
  settings: Record<string, unknown>;
  created_at: string;
}

export interface Group {
  id: string;
  tournament_id: string;
  name: string;
  sort_order: number;
}

export interface Team {
  id: string;
  tournament_id: string;
  group_id: string | null;
  name: string;
  seed: number;
}

export interface Match {
  id: string;
  tournament_id: string;
  phase: "group" | "knockout";
  group_id: string | null;
  round: number;
  position: number;
  round_size: number | null;
  is_third_place: boolean;
  team_a: string | null;
  team_b: string | null;
  score_a: number | null;
  score_b: number | null;
  penalty_a: number | null;
  penalty_b: number | null;
  winner_id: string | null;
  status: "scheduled" | "finished";
  next_match_id: string | null;
  next_slot: "a" | "b" | null;
  loser_next_match_id: string | null;
  loser_next_slot: "a" | "b" | null;
}

export interface MatchSet {
  id: string;
  match_id: string;
  set_no: number;
  points_a: number;
  points_b: number;
}
