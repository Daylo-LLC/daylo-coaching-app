import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Button,
  StyleSheet,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import moment from "moment";

import { useAuthStore } from "../../../src/store/auth";
import { supabase } from "../../../src/lib/supabase";
import { Tables } from "../../../src/types/database";
import Header from "@/components/Header";
import { Calendar } from "lucide-react-native";

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
type Availability = Tables<"availability">;

type SchoolWithCoachSchools = Tables<"schools"> & {
  coach_schools: Array<{
    sport: string;
  }>;
};

export default function Home() {
  const { profile } = useAuthStore();
  const [upcomingGames, setUpcomingGames] = useState<Request[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Request[]>([]);
  const [school, setSchool] = useState<SchoolWithCoachSchools | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"schedule" | "requests">(
    "schedule",
  );

  const fetchDashboard = useCallback(async () => {
    if (!profile || !profile.school_id) return;

    const today = new Date().toISOString().split("T")[0];

    const [gamesRes, requestsRes, slotsRes, schoolRes] = await Promise.all([
      supabase
        .from("requests")
        .select("*")
        .eq("status", "accepted")
        .or(`requester_id.eq.${profile.id},recipient_id.eq.${profile.id}`)
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(5),
      supabase
        .from("requests")
        .select("*")
        .eq("status", "pending")
        .eq("recipient_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("availability")
        .select("*")
        .eq("coach_id", profile.id)
        .eq("is_booked", false)
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(5),
      supabase
        .from("schools")
        .select("*, coach_schools (sport)")
        .eq("id", profile.school_id),
    ]);

    setSchool(schoolRes.data?.[0] || null);

    // Collect all school IDs from both accepted games and pending requests
    const allRequests = [...(gamesRes.data || []), ...(requestsRes.data || [])];
    const schoolIds = new Set<string>();
    allRequests.forEach((r) => {
      if (r.requester_school_id) schoolIds.add(r.requester_school_id);
      if (r.recipient_school_id) schoolIds.add(r.recipient_school_id);
    });

    let schoolMap = new Map<
      string,
      { id: string; name: string; city: string | null; state: string | null }
    >();
    if (schoolIds.size > 0) {
      const { data: schoolsData } = await supabase
        .from("schools")
        .select("id, name, city, state")
        .in("id", Array.from(schoolIds));
      schoolMap = new Map(schoolsData?.map((s) => [s.id, s]) || []);
    }

    const attachSchools = (r: any) => ({
      ...r,
      requester_school: schoolMap.get(r.requester_school_id),
      recipient_school: schoolMap.get(r.recipient_school_id),
    });

    setUpcomingGames((gamesRes.data || []).map(attachSchools));
    setPendingRequests((requestsRes.data || []).map(attachSchools));

    setLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  }, [fetchDashboard]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1B2A4A" />
      </View>
    );
  }

  return (
    <>
      <Header title="Daylo" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1B2A4A"
          />
        }
      >
        <View style={styles.schoolInfo}>
          <View style={{ width: "70%" }}>
            <Text style={styles.schoolName}>{school?.name}</Text>
            <Text>{school?.county}</Text>
            <Text style={{ color: "#6B7280", marginVertical: 4 }}>
              {school?.coach_schools?.[0]?.sport
                ? school?.coach_schools[0].sport.charAt(0).toUpperCase() +
                  school?.coach_schools[0].sport.slice(1)
                : ""}{" "}
              • {school?.division}
            </Text>
          </View>
          <View style={{ width: "30%" }}>
            <Pressable style={styles.addButton } onPress={() => {router.push("/search")}}>
              <Text style={styles.buttonText}>Add Game</Text>
            </Pressable>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "schedule" && styles.activeTab]}
            onPress={() => setActiveTab("schedule")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "schedule" && styles.activeTabText,
              ]}
            >
              My Schedule
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "requests" && styles.activeTab]}
            onPress={() => setActiveTab("requests")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "requests" && styles.activeTabText,
              ]}
            >
              Game Requests
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "schedule" ? (
          <>
            {/* Upcoming Games */}
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 2,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#1B2A4A",
                  marginBottom: 12,
                }}
              >
                Season Schedule
              </Text>
              {upcomingGames.length === 0 ? (
                <Text style={{ color: "#9CA3AF", fontSize: 14 }}>
                  No upcoming games scheduled
                </Text>
              ) : (
                upcomingGames.map((game) => {
                  const opposingSchool =
                    game.requester_id === profile?.id
                      ? game.recipient_school
                      : game.requester_school;
                  return (
                    <View
                      key={game.id}
                      style={{
                        borderBottomWidth: 1,
                        borderBottomColor: "#F3F4F6",
                        paddingVertical: 10,
                        flexDirection: "row",
                        justifyContent: "flex-start",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Calendar size={40} color="#F97316" />
                      <TouchableOpacity
                        onPress={() => router.push(`/request/${game.id}`)}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: "#374151",
                          }}
                        >
                          {game.sport.charAt(0).toUpperCase() +
                            game.sport.slice(1)}{" "}
                          — {moment(game.date).format("MMM D, YYYY")}
                        </Text>
                        {opposingSchool && (
                          <Text
                            style={{
                              fontSize: 12,
                              color: "#6B7280",
                              marginTop: 2,
                            }}
                          >
                            vs. {opposingSchool.name}
                          </Text>
                        )}
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#9CA3AF",
                            marginTop: 2,
                          }}
                        >
                          {moment(game.time_start, "HH:mm").format("h:mm A")} –{" "}
                          {moment(game.time_end, "HH:mm").format("h:mm A")} •{" "}
                          {game.venue || "TBD"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          </>
        ) : (
          <>
            {/* Pending Requests */}
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 2,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{ fontSize: 18, fontWeight: "700", color: "#1B2A4A" }}
                >
                  Pending Requests
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/(tabs)/requests")}
                >
                  <Text
                    style={{
                      color: "#F97316",
                      fontWeight: "600",
                      fontSize: 14,
                    }}
                  >
                    View All
                  </Text>
                </TouchableOpacity>
              </View>
              {pendingRequests.length === 0 ? (
                <Text style={{ color: "#9CA3AF", fontSize: 14 }}>
                  No pending requests
                </Text>
              ) : (
                pendingRequests.map((req) => (
                  <View
                    key={req.id}
                    style={{
                      borderBottomWidth: 1,
                      borderBottomColor: "#F3F4F6",
                      paddingVertical: 10,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => router.push(`/request/${req.id}`)}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: "#374151",
                        }}
                      >
                        {req.sport.charAt(0).toUpperCase() + req.sport.slice(1)}{" "}
                        — {moment(req.date).format("MMM D, YYYY")}
                      </Text>
                      {req.requester_school && (
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#6B7280",
                            marginTop: 2,
                          }}
                        >
                          From: {req.requester_school.name}
                        </Text>
                      )}
                      <Text
                        style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}
                      >
                        {moment(req.time_start, "HH:mm").format("h:mm A")} –{" "}
                        {moment(req.time_end, "HH:mm").format("h:mm A")} •{" "}
                        {req.home_away}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 16,
  },
  schoolInfo: {
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  schoolName: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1B2A4A",
    flexWrap: "wrap",
    paddingVertical: 15,
  },
  addButton: {
    backgroundColor: "#1B2A4A",
    padding: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    textAlign: "center",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#dbe2ef",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: "#F97316",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  activeTabText: {
    color: "#fff",
  },
});
