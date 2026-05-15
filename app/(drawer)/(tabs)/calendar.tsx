import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { useRouter, useFocusEffect } from "expo-router";
import moment from "moment";
import { useAuthStore } from "../../../src/store/auth";
import { supabase } from "../../../src/lib/supabase";

type RequestRow = {
  id: string;
  requester_id: string;
  recipient_id: string;
  requester_school_id: string;
  recipient_school_id: string;
  sport: string;
  gender: string;
  date: string;
  time_start: string;
  time_end: string;
  home_away: string;
  venue: string | null;
  status: "pending" | "accepted" | "declined" | "countered" | "cancelled";
  requester_school: { name: string } | null;
  recipient_school: { name: string } | null;
};

type AgendaItem = {
  name: string;
  type: "accepted" | "pending";
  time: string;
  sport: string;
  gender: string;
  home_away: string;
  requestId: string;
};

const STATUS_COLORS = {
  accepted: "#10B981",
  pending: "#F97316",
} as const;

const fmtTime = (t: string) => moment(t, "HH:mm").format("h:mm A");
const genderLabel = (g: string) =>
  g === "coed" ? "Coed" : g.charAt(0).toUpperCase() + g.slice(1);

export default function CalendarScreen() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [itemsByDate, setItemsByDate] = useState<Record<string, AgendaItem[]>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    moment().format("YYYY-MM-DD"),
  );

  const fetchRequests = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("requests")
      .select(
        `id, requester_id, recipient_id, requester_school_id, recipient_school_id,
         sport, gender, date, time_start, time_end, home_away, venue, status,
         requester_school:schools!requests_requester_school_id_fkey(name),
         recipient_school:schools!requests_recipient_school_id_fkey(name)`,
      )
      .or(`requester_id.eq.${profile.id},recipient_id.eq.${profile.id}`)
      .in("status", ["accepted", "pending"])
      .order("date", { ascending: true });

    if (error) {
      console.warn("calendar fetch error", error.message);
      setLoading(false);
      return;
    }

    const rows = (data || []) as unknown as RequestRow[];
    const grouped: Record<string, AgendaItem[]> = {};
    for (const r of rows) {
      const opponentSchool =
        r.requester_id === profile.id
          ? r.recipient_school?.name
          : r.requester_school?.name;
      const item: AgendaItem = {
        name: `vs. ${opponentSchool || "Unknown"}`,
        type: r.status === "accepted" ? "accepted" : "pending",
        time: r.time_end
          ? `${fmtTime(r.time_start)} – ${fmtTime(r.time_end)}`
          : fmtTime(r.time_start),
        sport: r.sport,
        gender: r.gender || "boys",
        home_away: r.home_away || "",
        requestId: r.id,
      };
      if (!grouped[r.date]) grouped[r.date] = [];
      grouped[r.date].push(item);
    }
    setItemsByDate(grouped);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [fetchRequests]),
  );

  const markedDates = useMemo(() => {
    const m: Record<string, any> = {};
    Object.entries(itemsByDate).forEach(([date, list]) => {
      const hasAccepted = list.some((i) => i.type === "accepted");
      m[date] = {
        marked: true,
        dotColor: hasAccepted ? STATUS_COLORS.accepted : STATUS_COLORS.pending,
      };
    });
    m[selectedDate] = {
      ...(m[selectedDate] || {}),
      selected: true,
      selectedColor: "#1B2A4A",
    };
    return m;
  }, [itemsByDate, selectedDate]);

  const selectedItems = itemsByDate[selectedDate] || [];

  if (loading && Object.keys(itemsByDate).length === 0) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F9FAFB",
        }}
      >
        <ActivityIndicator size="large" color="#1B2A4A" />
      </View>
    );
  }

  const renderItem = ({ item }: { item: AgendaItem }) => {
    const accent = STATUS_COLORS[item.type];
    return (
      <TouchableOpacity
        onPress={() => router.push(`/request/${item.requestId}`)}
        style={{
          backgroundColor: "#FFFFFF",
          marginHorizontal: 16,
          marginTop: 12,
          padding: 14,
          borderRadius: 10,
          borderLeftWidth: 4,
          borderLeftColor: accent,
          shadowColor: "#000",
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 1,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: "#1B2A4A",
              flex: 1,
            }}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <View
            style={{
              backgroundColor: accent,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 8,
              marginLeft: 8,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "700" }}>
              {item.type === "accepted" ? "CONFIRMED" : "PENDING"}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
          {item.time}
        </Text>
        <View
          style={{
            flexDirection: "row",
            gap: 6,
            marginTop: 8,
            flexWrap: "wrap",
          }}
        >
          <View
            style={{
              backgroundColor: "#EFF6FF",
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 10,
            }}
          >
            <Text style={{ fontSize: 11, color: "#3B82F6", fontWeight: "600" }}>
              {item.sport.charAt(0).toUpperCase() + item.sport.slice(1)}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: "#F3E8FF",
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 10,
            }}
          >
            <Text style={{ fontSize: 11, color: "#7C3AED", fontWeight: "600" }}>
              {genderLabel(item.gender)}
            </Text>
          </View>
          {item.home_away ? (
            <View
              style={{
                backgroundColor: "#FFF7ED",
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 10,
              }}
            >
              <Text
                style={{ fontSize: 11, color: "#F97316", fontWeight: "600" }}
              >
                {item.home_away.charAt(0).toUpperCase() +
                  item.home_away.slice(1)}
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <Calendar
        current={selectedDate}
        onDayPress={(d) => setSelectedDate(d.dateString)}
        markedDates={markedDates}
        theme={{
          todayTextColor: "#F97316",
          arrowColor: "#1B2A4A",
          textMonthFontWeight: "700",
          textMonthFontSize: 16,
          monthTextColor: "#1B2A4A",
        }}
      />
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 4,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#1B2A4A" }}>
          {moment(selectedDate).format("dddd, MMM D")}
        </Text>
        <Text style={{ fontSize: 12, color: "#6B7280" }}>
          {selectedItems.length} {selectedItems.length === 1 ? "game" : "games"}
        </Text>
      </View>
      <FlatList
        data={selectedItems}
        keyExtractor={(i) => i.requestId}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchRequests} />
        }
        ListEmptyComponent={
          <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
            <Text
              style={{ color: "#9CA3AF", fontSize: 14, textAlign: "center" }}
            >
              No games scheduled for this day.
            </Text>
          </View>
        }
      />
    </View>
  );
}
