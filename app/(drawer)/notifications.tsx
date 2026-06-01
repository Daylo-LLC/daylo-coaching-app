import { useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuthStore } from "../../src/store/auth";
import { useNotificationStore } from "../../src/store/notifications";
import { Tables } from "../../src/types/database";
import PageHeader from "@/components/PageHeader";
import { Bell } from "lucide-react-native";
import moment from "moment";

type Notification = Tables<"notifications">;

export default function NotificationsScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    fetchUnreadCount,
    markRead,
    markAllRead,
  } = useNotificationStore();

  useFocusEffect(
    useCallback(() => {
      if (profile?.id) {
        fetchNotifications(profile.id);
        fetchUnreadCount(profile.id);
      }
    }, [profile?.id]),
  );

  const handleTap = async (notification: Notification) => {
    if (!notification.read) {
      await markRead(notification.id);
    }

    const data = notification.data as Record<string, any> | null;

    switch (notification.type) {
      case "slot_filled":
        if (data?.recipient_school_id) {
          router.push(`/school/${data.recipient_school_id}`);
        }
        break;
      case "new_request":
      case "request_accepted":
      case "request_declined":
      case "game_cancelled":
        if (data?.request_id) {
          router.push(`/request/${data.request_id}`);
        }
        break;
      case "invitation_accepted":
        router.push("/(drawer)/invitations");
        break;
      case "new_message":
        if (data?.conversation_id) {
          router.push(`/chat/${data.conversation_id}`);
        }
        break;
      default:
        break;
    }
  };

  const handleMarkAllRead = () => {
    if (profile?.id) {
      markAllRead(profile.id);
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      onPress={() => handleTap(item)}
      style={{
        backgroundColor: item.read ? "#FFFFFF" : "#FFF7ED",
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        borderLeftWidth: item.read ? 0 : 3,
        borderLeftColor: "#F97316",
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <Text
          style={{
            fontSize: 15,
            fontWeight: item.read ? "600" : "700",
            color: "#1B2A4A",
            flex: 1,
          }}
        >
          {item.title}
        </Text>
        {!item.read && (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: "#F97316",
              marginLeft: 8,
            }}
          />
        )}
      </View>
      <Text
        style={{
          fontSize: 14,
          color: "#374151",
          lineHeight: 20,
        }}
      >
        {item.body}
      </Text>
      <Text
        style={{
          fontSize: 12,
          color: "#9CA3AF",
          marginTop: 8,
        }}
      >
        {moment(item.created_at).fromNow()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <PageHeader title="Notifications" onBack={() => router.back()} />

      {unreadCount > 0 && (
        <TouchableOpacity
          onPress={handleMarkAllRead}
          style={{
            alignSelf: "flex-end",
            paddingHorizontal: 16,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: "#F97316", fontWeight: "600", fontSize: 13 }}>
            Mark all as read
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: 16,
          paddingTop: unreadCount > 0 ? 0 : 16,
          paddingBottom: 32,
        }}
        renderItem={renderNotification}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 48 }}>
            <Bell size={40} color="#9CA3AF" style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 16, color: "#9CA3AF" }}>
              No notifications yet
            </Text>
          </View>
        }
      />
    </View>
  );
}
