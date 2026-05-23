import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Send, Mail, CheckCircle, Clock } from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuthStore } from "../../src/store/auth";
import { supabase } from "../../src/lib/supabase";
import Header from "@/components/Header";

interface Invitation {
  id: string;
  email: string;
  status: "pending" | "accepted" | "expired";
  created_at: string;
  accepted_at: string | null;
}

export default function InvitationsScreen() {
  const { profile } = useAuthStore();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInvitations = useCallback(async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from("invitations")
      .select("*")
      .eq("inviter_id", profile.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setInvitations(data as Invitation[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      fetchInvitations();
    }, [fetchInvitations]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInvitations();
  };

  const handleSendInvitation = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert("Error", "Please enter an email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    setSending(true);
    try {
      const response = await supabase.functions.invoke("send-invitation", {
        body: { email: trimmed },
      });

      if (response.error) {
        const errorMsg = response.error.message || "Failed to send invitation.";
        Alert.alert("Error", errorMsg);
      } else if (response.data?.error) {
        Alert.alert("Error", response.data.error);
      } else {
        Alert.alert("Success", `Invitation sent to ${trimmed}`);
        setEmail("");
        fetchInvitations();
      }
    } catch (err) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return <CheckCircle size={18} color="#10B981" />;
      case "pending":
        return <Clock size={18} color="#F59E0B" />;
      default:
        return <Clock size={18} color="#9CA3AF" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "#10B981";
      case "pending":
        return "#F59E0B";
      default:
        return "#9CA3AF";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderInvitation = ({ item }: { item: Invitation }) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: "#F3F4F6",
          justifyContent: "center",
          alignItems: "center",
          marginRight: 12,
        }}
      >
        <Mail size={18} color="#6B7280" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "500", color: "#1B2A4A" }}>
          {item.email}
        </Text>
        <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
          Sent {formatDate(item.created_at)}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {getStatusIcon(item.status)}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "500",
            color: getStatusColor(item.status),
            textTransform: "capitalize",
          }}
        >
          {item.status}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <Header title="Invite Coaches" />

      <View style={{ padding: 16 }}>
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            padding: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 2,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: "#1B2A4A",
              marginBottom: 4,
            }}
          >
            Invite a Coach
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: "#6B7280",
              marginBottom: 12,
            }}
          >
            Send an invitation email to help a fellow coach join Daylo.
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              style={{
                flex: 1,
                backgroundColor: "#F9FAFB",
                borderWidth: 1,
                borderColor: "#D1D5DB",
                borderRadius: 8,
                padding: 12,
                fontSize: 15,
              }}
              placeholder="coach@school.edu"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!sending}
            />
            <TouchableOpacity
              onPress={handleSendInvitation}
              disabled={sending}
              style={{
                backgroundColor: "#F97316",
                borderRadius: 8,
                paddingHorizontal: 16,
                justifyContent: "center",
                alignItems: "center",
                opacity: sending ? 0.7 : 1,
              }}
            >
              {sending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Send size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: "#6B7280",
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Sent Invitations
        </Text>
        <View
          style={{
            flex: 1,
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 2,
          }}
        >
          {loading ? (
            <View
              style={{
                padding: 40,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator color="#F97316" />
            </View>
          ) : invitations.length === 0 ? (
            <View
              style={{
                padding: 40,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Mail size={32} color="#D1D5DB" />
              <Text
                style={{
                  color: "#9CA3AF",
                  fontSize: 14,
                  marginTop: 8,
                  textAlign: "center",
                }}
              >
                No invitations sent yet.{"\n"}Invite a coach to get started!
              </Text>
            </View>
          ) : (
            <FlatList
              data={invitations}
              keyExtractor={(item) => item.id}
              renderItem={renderInvitation}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor="#F97316"
                />
              }
            />
          )}
        </View>
      </View>
    </View>
  );
}
