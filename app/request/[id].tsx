import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "../../src/store/auth";
import { supabase } from "../../src/lib/supabase";
import { Tables } from "../../src/types/database";
import { exportGameToCalendar } from "../../src/lib/calendar";
import moment from "moment";
import PageHeader from "@/components/PageHeader";

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

export default function RequestDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuthStore();
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchRequest = async () => {
      const { data: requestData } = await supabase
        .from("requests")
        .select("*")
        .eq("id", id)
        .single();

      if (requestData) {
        // Fetch schools separately due to relationship detection issues
        const schoolIds = [
          requestData.requester_school_id,
          requestData.recipient_school_id,
        ].filter(Boolean) as string[];

        const { data: schoolsData } = await supabase
          .from("schools")
          .select("id, name, city, state")
          .in("id", schoolIds);

        const schoolMap = new Map(schoolsData?.map((s) => [s.id, s]) || []);

        setRequest({
          ...requestData,
          requester_school: schoolMap.get(requestData.requester_school_id),
          recipient_school: schoolMap.get(requestData.recipient_school_id),
        });
      }

      setLoading(false);
    };

    fetchRequest();
  }, [id]);

  const handleAction = async (action: "accepted" | "declined") => {
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
              .eq("id", id);
            if (error) {
              Alert.alert("Error", error.message);
            } else {
              router.back();
            }
          },
        },
      ],
    );
  };

  const handleMessage = async () => {
    // Navigate to chat with the other coach
    if (!request || !profile) return;

    const otherUserId =
      request.requester_id === profile.id
        ? request.recipient_id
        : request.requester_id;

    // Check if a conversation already exists between the two users
    const { data: existingConvo } = await supabase
      .from("conversations")
      .select("id")
      .or(`participant_a.eq.${profile.id},participant_b.eq.${profile.id}`)
      .or(`participant_a.eq.${otherUserId},participant_b.eq.${otherUserId}`)
      .limit(1);

    let conversationId;

    if (existingConvo && existingConvo.length > 0) {
      conversationId = existingConvo[0].id;
    } else {
      // Create a new conversation
      const { data: newConvo, error } = await supabase
        .from("conversations")
        .insert({
          participant_a: profile.id,
          participant_b: otherUserId,
        })
        .select("id")
        .single();

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      conversationId = newConvo.id;
    }

    router.push(`/chat/${conversationId}`);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1B2A4A" />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Request not found</Text>
      </View>
    );
  }

  const isIncoming = request.recipient_id === profile?.id;
  const isPending = request.status === "pending";
  const isAccepted = request.status === "accepted";

  const displaySchool = isIncoming
    ? request.requester_school
    : request.recipient_school;

  return (
    <>
      <PageHeader
        title="Request"
        onBack={() => router.replace("/(drawer)/(tabs)/requests")}
      />
      <ScrollView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
        <View style={{ padding: 16 }}>
          {/* Status Badge */}
          <View
            style={{
              backgroundColor:
                request.status === "pending"
                  ? "#FFF7ED"
                  : request.status === "accepted"
                    ? "#F0FDF4"
                    : request.status === "declined"
                      ? "#FEE2E2"
                      : "#F3F4F6",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 12,
              alignSelf: "flex-start",
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color:
                  request.status === "pending"
                    ? "#F97316"
                    : request.status === "accepted"
                      ? "#10B981"
                      : request.status === "declined"
                        ? "#EF4444"
                        : "#6B7280",
              }}
            >
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </Text>
          </View>

          {/* Sport */}
          <Text style={{ fontSize: 28, fontWeight: "800", color: "#1B2A4A" }}>
            {request.sport.charAt(0).toUpperCase() + request.sport.slice(1)}
          </Text>

          {/* School */}
          {displaySchool && (
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                padding: 16,
                marginTop: 16,
              }}
            >
              <Text style={{ fontSize: 14, color: "#6B7280", marginBottom: 4 }}>
                {isIncoming ? "Requesting School" : "Your School"}
              </Text>
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: "#1B2A4A" }}
              >
                {displaySchool.name}
              </Text>
              {displaySchool.city && displaySchool.state && (
                <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 2 }}>
                  {displaySchool.city}, {displaySchool.state}
                </Text>
              )}
            </View>
          )}

          {/* Date & Time */}
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 16,
              marginTop: 12,
            }}
          >
            <Text style={{ fontSize: 14, color: "#6B7280", marginBottom: 4 }}>
              Date & Time
            </Text>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1B2A4A" }}>
              {moment(request.date).format("MMMM D, YYYY")}
            </Text>
            <Text style={{ fontSize: 16, color: "#374151", marginTop: 4 }}>
              {moment(request.time_start, "HH:mm:ss").format("h:mm A")} –{" "}
              {moment(request.time_end, "HH:mm:ss").format("h:mm A")}
            </Text>
          </View>

          {/* Location */}
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 16,
              marginTop: 12,
            }}
          >
            <Text style={{ fontSize: 14, color: "#6B7280", marginBottom: 4 }}>
              Location
            </Text>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1B2A4A" }}>
              {request.home_away.charAt(0).toUpperCase() +
                request.home_away.slice(1)}
            </Text>
            {request.venue && (
              <Text style={{ fontSize: 16, color: "#374151", marginTop: 4 }}>
                {request.venue}
              </Text>
            )}
          </View>

          {/* Actions */}
          {isPending && isIncoming && (
            <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
              <TouchableOpacity
                onPress={() => handleAction("accepted")}
                style={{
                  flex: 1,
                  backgroundColor: "#10B981",
                  borderRadius: 8,
                  padding: 14,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}
                >
                  Accept
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleAction("declined")}
                style={{
                  flex: 1,
                  backgroundColor: "#EF4444",
                  borderRadius: 8,
                  padding: 14,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}
                >
                  Decline
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Message Button */}
          <TouchableOpacity
            onPress={handleMessage}
            style={{
              backgroundColor: "#1B2A4A",
              borderRadius: 8,
              padding: 14,
              alignItems: "center",
              marginTop: 12,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>
              Message Coach
            </Text>
          </TouchableOpacity>

          {/* Export to Calendar for accepted requests */}
          {isAccepted && (
            <TouchableOpacity
              onPress={() =>
                exportGameToCalendar({
                  title: `${request.sport} game`,
                  date: request.date,
                  timeStart: request.time_start,
                  timeEnd: request.time_end,
                  venue: request.venue,
                  sport: request.sport,
                })
              }
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                backgroundColor: "#EFF6FF",
                borderRadius: 8,
                padding: 14,
                marginTop: 12,
              }}
            >
              <Text style={{ fontSize: 20 }}>📅</Text>
              <Text
                style={{ color: "#3B82F6", fontWeight: "700", fontSize: 16 }}
              >
                Export to Calendar
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </>
  );
}
