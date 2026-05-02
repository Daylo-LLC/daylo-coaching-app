import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "../../../src/store/auth";
import { supabase } from "../../../src/lib/supabase";

interface ConversationWithDetails {
  id: string;
  participant_a: string;
  participant_b: string;
  created_at: string;
  other_user?: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
  school?: {
    name: string | null;
  };
  last_message?: {
    content: string | null;
    created_at: string;
    sender_id: string;
  };
  unread_count: number;
}

export default function MessagesScreen() {
  const { profile } = useAuthStore();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!profile) return;

    const { data: convos } = await supabase
      .from("conversations")
      .select("*")
      .or(`participant_a.eq.${profile.id},participant_b.eq.${profile.id}`)
      .order("created_at", { ascending: false });

    if (!convos || convos.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const enriched: ConversationWithDetails[] = [];

    for (const convo of convos) {
      const otherId =
        convo.participant_a === profile.id
          ? convo.participant_b
          : convo.participant_a;

      const [profileRes, schoolRes, msgRes, unreadRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("first_name, last_name, avatar_url, school_id")
          .eq("id", otherId)
          .single(),
        supabase
          .from("profiles")
          .select("school_id")
          .eq("id", otherId)
          .single(),
        supabase
          .from("messages")
          .select("content, created_at, sender_id")
          .eq("conversation_id", convo.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", convo.id)
          .eq("is_read", false)
          .neq("sender_id", profile.id),
      ]);

      let schoolData = null;
      if (schoolRes.data?.school_id) {
        const { data: school } = await supabase
          .from("schools")
          .select("name")
          .eq("id", schoolRes.data.school_id)
          .single();
        schoolData = school;
      }

      enriched.push({
        ...convo,
        other_user: profileRes.data || undefined,
        school: schoolData || undefined,
        last_message: msgRes.data || undefined,
        unread_count: unreadRes.count || 0,
      });
    }

    enriched.sort((a, b) => {
      const aTime = a.last_message?.created_at || a.created_at;
      const bTime = b.last_message?.created_at || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    setConversations(enriched);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  }, [fetchConversations]);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Now";
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1B2A4A" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1B2A4A"
          />
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 48, padding: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#374151" }}>
              No conversations yet
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#9CA3AF",
                marginTop: 4,
                textAlign: "center",
              }}
            >
              Conversations are created when you send or receive a game request
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              router.push({ pathname: "/chat/[id]", params: { id: item.id } })
            }
            style={{
              flexDirection: "row",
              padding: 16,
              backgroundColor: "#FFFFFF",
              borderBottomWidth: 1,
              borderBottomColor: "#F3F4F6",
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#1B2A4A",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              <Text
                style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 18 }}
              >
                {(item.other_user?.first_name?.[0] || "?").toUpperCase()}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: item.unread_count > 0 ? "700" : "600",
                      color: "#1B2A4A",
                    }}
                  >
                    {item.other_user
                      ? `${item.other_user.first_name || ""} ${item.other_user.last_name || ""}`.trim() ||
                        "Coach"
                      : "Coach"}
                  </Text>
                  {item.school?.name && (
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#6B7280",
                        marginTop: 2,
                      }}
                    >
                      {item.school.name}
                    </Text>
                  )}
                </View>
                {item.last_message && (
                  <Text
                    style={{ fontSize: 12, color: "#9CA3AF", marginLeft: 8 }}
                  >
                    {formatTime(item.last_message.created_at)}
                  </Text>
                )}
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginTop: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: item.unread_count > 0 ? "#374151" : "#9CA3AF",
                    fontWeight: item.unread_count > 0 ? "500" : "400",
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {item.last_message?.content || "No messages yet"}
                </Text>
                {item.unread_count > 0 && (
                  <View
                    style={{
                      backgroundColor: "#F97316",
                      borderRadius: 10,
                      minWidth: 20,
                      height: 20,
                      justifyContent: "center",
                      alignItems: "center",
                      paddingHorizontal: 6,
                      marginLeft: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 11,
                        fontWeight: "700",
                      }}
                    >
                      {item.unread_count}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
