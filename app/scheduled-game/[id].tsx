import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import moment from "moment";
import PageHeader from "@/components/PageHeader";
import { useAuthStore } from "../../src/store/auth";
import { supabase } from "../../src/lib/supabase";
import {
  claimScheduledGame,
  type ScheduledGame,
} from "../../src/lib/scheduledGames";
import { exportGameToCalendar } from "../../src/lib/calendar";

export default function ScheduledGameDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();
  const [game, setGame] = useState<ScheduledGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  const load = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("scheduled_games")
      .select(
        "*, home_school:schools!scheduled_games_home_school_id_fkey(id,name,city,state,address), away_school:schools!scheduled_games_away_school_id_fkey(id,name,city,state,address)",
      )
      .eq("id", id)
      .single();
    setGame((data as ScheduledGame) || null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [id]);

  const acknowledge = async () => {
    if (!id) return;
    setClaiming(true);
    const { error } = await claimScheduledGame(id);
    setClaiming(false);
    if (error) {
      Alert.alert("Could not acknowledge game", error.message);
      return;
    }
    await load();
    if (game) {
      const opponent =
        profile?.school_id === game.home_school_id
          ? game.away_school
          : game.home_school;
      exportGameToCalendar({
        title: `${game.sport} game`,
        date: game.date,
        timeStart: game.time_start,
        timeEnd: game.time_end || null,
        venue: game.venue,
        sport: game.sport,
        opponentSchool: opponent?.name ?? null,
        url: `daylo:///scheduled-game/${game.id}`,
      });
    }
    Alert.alert("Game acknowledged", "The game is now attached to your team.");
  };

  const cancel = () => {
    if (!id) return;
    Alert.alert(
      "Cancel scheduled game",
      "Remove this game from the shared schedule?",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Game",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("scheduled_games")
              .update({ status: "cancelled" })
              .eq("id", id);
            if (error) Alert.alert("Could not cancel game", error.message);
            else await load();
          },
        },
      ],
    );
  };

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1B2A4A" />
      </View>
    );
  if (!game)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Game not found</Text>
      </View>
    );

  const ownSchool =
    profile?.school_id === game.home_school_id
      ? game.home_school
      : game.away_school;
  const opponent =
    profile?.school_id === game.home_school_id
      ? game.away_school
      : game.home_school;
  const opponentCoach =
    profile?.school_id === game.home_school_id
      ? game.away_coach_id
      : game.home_coach_id;
  const isOwner = game.entered_by_coach_id === profile?.id;
  const canAcknowledge = !opponentCoach && !isOwner;

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <PageHeader title="Scheduled Game" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View
          style={{ backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16 }}
        >
          <Text style={{ fontSize: 26, fontWeight: "800", color: "#1B2A4A" }}>
            {game.sport.charAt(0).toUpperCase() + game.sport.slice(1)} ·{" "}
            {game.gender}
          </Text>
          <Text style={{ color: "#10B981", fontWeight: "700", marginTop: 8 }}>
            Scheduled
          </Text>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: "#1B2A4A",
              marginTop: 20,
            }}
          >
            {moment(game.date).format("MMMM D, YYYY")}
          </Text>
          <Text style={{ color: "#374151", marginTop: 4 }}>
            {moment(game.time_start, "HH:mm:ss").format("h:mm A")}{" "}
            {game.time_end
              ? `– ${moment(game.time_end, "HH:mm:ss").format("h:mm A")}`
              : ""}
          </Text>
          <Text style={{ color: "#374151", marginTop: 16 }}>
            Your school: {ownSchool?.name || "Unknown"}
          </Text>
          <Text style={{ color: "#374151", marginTop: 4 }}>
            Opponent: {opponent?.name || "Unknown"}
          </Text>
          <Text
            style={{
              color: opponentCoach ? "#10B981" : "#F97316",
              marginTop: 8,
              fontWeight: "600",
            }}
          >
            {opponentCoach
              ? "Opponent acknowledged"
              : "Opponent coach not on Daylo yet"}
          </Text>
          <Text style={{ color: "#6B7280", marginTop: 12 }}>
            {game.venue || "Venue TBD"}
          </Text>
          {game.notes && (
            <Text style={{ color: "#6B7280", marginTop: 12 }}>
              {game.notes}
            </Text>
          )}
          {canAcknowledge && (
            <TouchableOpacity
              onPress={acknowledge}
              disabled={claiming}
              style={{
                backgroundColor: claiming ? "#9CA3AF" : "#F97316",
                borderRadius: 8,
                padding: 14,
                alignItems: "center",
                marginTop: 24,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                {claiming
                  ? "Acknowledging..."
                  : "Acknowledge and Add to My Schedule"}
              </Text>
            </TouchableOpacity>
          )}
          {isOwner && (
            <TouchableOpacity
              onPress={cancel}
              style={{
                backgroundColor: "#EF4444",
                borderRadius: 8,
                padding: 14,
                alignItems: "center",
                marginTop: 12,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                Cancel Game
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
