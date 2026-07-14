import { supabase } from "./supabase";
import { Tables } from "../types/database";

type ScheduledGameRow = Tables<"scheduled_games">;
type School = Pick<
  Tables<"schools">,
  "id" | "name" | "city" | "state" | "address"
>;

export type ScheduledGame = ScheduledGameRow & {
  home_school: School | null;
  away_school: School | null;
};

export const scheduledGameSchool = (
  game: ScheduledGame,
  schoolId: string | null | undefined,
) => (game.home_school_id === schoolId ? game.away_school : game.home_school);

export const scheduledGameIsClaimed = (game: ScheduledGame) =>
  Boolean(game.home_coach_id && game.away_coach_id);

export const fetchScheduledGames = async (schoolId: string) => {
  if (!schoolId) {
    return { data: [] as ScheduledGame[], error: null };
  }

  const { data, error } = await supabase
    .from("scheduled_games")
    .select(
      "*, home_school:schools!scheduled_games_home_school_id_fkey(id,name,city,state,address), away_school:schools!scheduled_games_away_school_id_fkey(id,name,city,state,address)",
    )
    .or(`home_school_id.eq.${schoolId},away_school_id.eq.${schoolId}`)
    .eq("status", "scheduled")
    .order("date", { ascending: true });

  return { data: (data || []) as ScheduledGame[], error };
};

export const claimScheduledGame = async (gameId: string) => {
  const { data, error } = await supabase.rpc("claim_scheduled_game", {
    p_game_id: gameId,
  });
  return { data: data as ScheduledGameRow | null, error };
};
