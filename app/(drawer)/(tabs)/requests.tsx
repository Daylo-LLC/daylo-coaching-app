import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../../src/store/auth";
import { supabase } from "../../../src/lib/supabase";
import { Tables } from "../../../src/types/database";
import { exportGameToCalendar } from "../../../src/lib/calendar";
import moment from "moment";
import {
  fetchScheduledGames,
  scheduledGameSchool,
  type ScheduledGame,
} from "../../../src/lib/scheduledGames";

type Request = Tables<"requests"> & {
  requester_school?: {
    name: string;
    city: string | null;
    state: string | null;
  };
  recipient_school?: {
    name: string;
    city: string | null;
    state: string | null;
  };
};

type Tab = "incoming" | "outgoing" | "confirmed" | "acknowledge";

export default function RequestsScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [tab, setTab] = useState<Tab>("incoming");
  const [requests, setRequests] = useState<Request[]>([]);
  const [scheduledGames, setScheduledGames] = useState<ScheduledGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!profile) return;

    if (tab === "acknowledge") {
      const { data } = await fetchScheduledGames(profile.school_id || "");
      setScheduledGames(
        (data || []).filter((game) => {
          const ownSideUnclaimed =
            profile.school_id === game.home_school_id
              ? !game.home_coach_id
              : !game.away_coach_id;
          return ownSideUnclaimed && game.entered_by_coach_id !== profile.id;
        }),
      );
      setRequests([]);
      setLoading(false);
      return;
    }

    let q = supabase.from("requests").select("*");

    if (tab === "incoming") {
      q = q.eq("recipient_id", profile.id).eq("status", "pending");
    } else if (tab === "outgoing") {
      q = q
        .eq("requester_id", profile.id)
        .in("status", ["pending", "countered"]);
    } else {
      q = q
        .eq("status", "accepted")
        .or(`requester_id.eq.${profile.id},recipient_id.eq.${profile.id}`);
    }

    q = q.order("created_at", { ascending: false });

    const { data: requestsData } = await q;

    // Fetch schools for all unique school IDs in the requests
    if (requestsData && requestsData.length > 0) {
      const schoolIds = new Set<string>();
      requestsData.forEach((r) => {
        if (r.requester_school_id) schoolIds.add(r.requester_school_id);
        if (r.recipient_school_id) schoolIds.add(r.recipient_school_id);
      });

      const { data: schoolsData } = await supabase
        .from("schools")
        .select("id, name, city, state")
        .in("id", Array.from(schoolIds));

      const schoolMap = new Map(schoolsData?.map((s) => [s.id, s]) || []);

      const requestsWithSchools = requestsData.map((r) => ({
        ...r,
        requester_school: schoolMap.get(r.requester_school_id),
        recipient_school: schoolMap.get(r.recipient_school_id),
      }));

      setRequests(requestsWithSchools);
    } else {
      setRequests([]);
    }
    setScheduledGames([]);

    setLoading(false);
  }, [profile, tab]);

  useEffect(() => {
    setLoading(true);
    fetchRequests();
  }, [fetchRequests]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  }, [fetchRequests]);

  const handleAction = async (
    request: Request,
    action: "accepted" | "declined",
  ) => {
    const label = action === "accepted" ? "Accept" : "Decline";
    Alert.alert(
      `${label} Request`,
      `Are you sure you want to ${label.toLowerCase()} this request?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: label,
          style: action === "declined" ? "destructive" : "default",
          onPress: async () => {
            const { error } = await supabase
              .from("requests")
              .update({ status: action })
              .eq("id", request.id);
            if (error) {
              if (error.message?.includes("Schedule conflict")) {
                Alert.alert(
                  "Schedule Conflict",
                  "There is already a confirmed game within 2 hours of this time slot. Please decline this request or reschedule.",
                );
              } else {
                Alert.alert("Error", error.message);
              }
            } else {
              if (action === "accepted") {
                const opponent =
                  profile?.id === request.requester_id
                    ? request.recipient_school
                    : request.requester_school;
                exportGameToCalendar({
                  title: `${request.sport} game`,
                  date: request.date,
                  timeStart: request.time_start,
                  timeEnd: request.time_end,
                  venue: request.venue,
                  sport: request.sport,
                  opponentSchool: opponent?.name ?? null,
                  url: `daylo:///request/${request.id}`,
                });
              }
              fetchRequests();
            }
          },
        },
      ],
    );
  };

  const handleCancel = async (requestId: string) => {
    Alert.alert(
      "Cancel Request",
      "Are you sure you want to cancel this request?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            await supabase
              .from("requests")
              .update({ status: "cancelled" })
              .eq("id", requestId);
            fetchRequests();
          },
        },
      ],
    );
  };

  const renderScheduledGame = ({ item }: { item: ScheduledGame }) => (
    <TouchableOpacity
      onPress={() => router.push(`/scheduled-game/${item.id}`)}
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#1B2A4A" }}>
          {item.sport.charAt(0).toUpperCase() + item.sport.slice(1)}
        </Text>
        <Text style={{ color: "#F97316", fontWeight: "700" }}>
          To acknowledge
        </Text>
      </View>
      <Text style={{ fontSize: 14, color: "#374151", marginTop: 8 }}>
        From: {scheduledGameSchool(item, profile?.school_id)?.name || "Unknown"}
      </Text>
      <Text style={{ fontSize: 14, color: "#374151", marginTop: 4 }}>
        {moment(item.date).format("MMMM D, YYYY")} ·{" "}
        {moment(item.time_start, "HH:mm:ss").format("h:mm A")}
      </Text>
      <Text style={{ color: "#6B7280", marginTop: 4 }}>
        Open the game to acknowledge it and add it to your schedule.
      </Text>
    </TouchableOpacity>
  );

  const renderRequest = ({ item }: { item: Request }) => {
    const isIncoming = item.recipient_id === profile?.id;
    const statusColors: Record<string, { bg: string; text: string }> = {
      pending: { bg: "#FFF7ED", text: "#F97316" },
      accepted: { bg: "#F0FDF4", text: "#10B981" },
      declined: { bg: "#FEE2E2", text: "#EF4444" },
      countered: { bg: "#EFF6FF", text: "#3B82F6" },
      cancelled: { bg: "#F3F4F6", text: "#6B7280" },
    };
    const sc = statusColors[item.status] || statusColors.pending;

    // Determine which school to show
    const displaySchool = isIncoming
      ? item.requester_school
      : item.recipient_school;

    return (
      <TouchableOpacity
        onPress={() => router.push(`/request/${item.id}`)}
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 2,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#1B2A4A" }}>
            {item.sport.charAt(0).toUpperCase() + item.sport.slice(1)}
          </Text>
          <View
            style={{
              backgroundColor: sc.bg,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 12,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "600", color: sc.text }}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        {displaySchool && (
          <Text style={{ fontSize: 14, color: "#374151", marginTop: 8 }}>
            {isIncoming ? "From" : "To"}: {displaySchool.name}
            {displaySchool.city && displaySchool.state
              ? ` (${displaySchool.city}, ${displaySchool.state})`
              : ""}
          </Text>
        )}

        <Text style={{ fontSize: 14, color: "#374151", marginTop: 4 }}>
          {moment(item.date).format("MMMM D, YYYY")} •{" "}
          {moment(item.time_start, "HH:mm:ss").format("h:mm A")} –{" "}
          {moment(item.time_end, "HH:mm:ss").format("h:mm A")}
        </Text>
        <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
          {item.home_away.charAt(0).toUpperCase() + item.home_away.slice(1)}
          {item.venue ? ` • ${item.venue}` : " • TBD"}
        </Text>

        {tab === "incoming" && item.status === "pending" && (
          <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleAction(item, "accepted");
              }}
              style={{
                flex: 1,
                backgroundColor: "#10B981",
                borderRadius: 8,
                padding: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                Accept
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleAction(item, "declined");
              }}
              style={{
                flex: 1,
                backgroundColor: "#EF4444",
                borderRadius: 8,
                padding: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                Decline
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {tab === "outgoing" && item.status === "pending" && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleCancel(item.id);
            }}
            style={{ marginTop: 12 }}
          >
            <Text style={{ color: "#EF4444", fontWeight: "600", fontSize: 13 }}>
              Cancel Request
            </Text>
          </TouchableOpacity>
        )}

        {tab === "confirmed" && item.status === "accepted" && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              exportGameToCalendar({
                title: `${item.sport} game`,
                date: item.date,
                timeStart: item.time_start,
                timeEnd: item.time_end,
                venue: item.venue,
                sport: item.sport,
              });
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginTop: 12,
              backgroundColor: "#EFF6FF",
              borderRadius: 8,
              padding: 10,
            }}
          >
            <Text style={{ fontSize: 16 }}>📅</Text>
            <Text style={{ color: "#3B82F6", fontWeight: "700", fontSize: 13 }}>
              Export to Calendar
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      {/* Tab bar */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: "#FFFFFF",
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        }}
      >
        {(["incoming", "outgoing", "confirmed", "acknowledge"] as Tab[]).map(
          (t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={{
                flex: 1,
                paddingVertical: 15,
                alignItems: "center",
                borderBottomWidth: 2,
                borderBottomColor: tab === t ? "#F97316" : "transparent",
              }}
            >
              <Text
                style={{
                  fontWeight: "600",
                  color: tab === t ? "#F97316" : "#6B7280",
                  fontSize: 14,
                }}
              >
                {t === "acknowledge"
                  ? "Acknowledge"
                  : t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ),
        )}
      </View>

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#1B2A4A" />
        </View>
      ) : (
        <FlatList<any>
          data={(tab === "acknowledge" ? scheduledGames : requests) as any[]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#1B2A4A"
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 48 }}>
              <Text style={{ fontSize: 16, color: "#9CA3AF" }}>
                No {tab} requests
              </Text>
            </View>
          }
          renderItem={
            tab === "acknowledge" ? renderScheduledGame : renderRequest
          }
        />
      )}
    </View>
  );
}
