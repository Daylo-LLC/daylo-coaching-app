import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useAuthStore } from "../../src/store/auth";
import { supabase } from "../../src/lib/supabase";
import { Tables } from "../../src/types/database";
import {
  Paperclip,
  Image as ImageIcon,
  Video as VideoIcon,
} from "lucide-react-native";
import { Image as ExpoImage } from "expo-image";
import { Video, ResizeMode } from "expo-av";
import * as Linking from "expo-linking";
import PageHeader from "@/components/PageHeader";

type Message = Tables<"messages">;

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB (allow videos)

const guessMimeFromName = (name: string, fallback: string): string => {
  const ext = name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
    gif: "image/gif",
    mp4: "video/mp4",
    mov: "video/quicktime",
    pdf: "application/pdf",
  };
  return (ext && map[ext]) || fallback;
};

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherName, setOtherName] = useState("Coach");
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const flatListRef = useRef<FlatList>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const videoRef = useRef<Video>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    setMessages(data || []);

    // Fetch sender names for all messages
    if (data && data.length > 0) {
      const senderIds = new Set<string>();
      data.forEach((msg) => {
        if (msg.sender_id !== profile?.id) {
          senderIds.add(msg.sender_id);
        }
      });

      if (senderIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", Array.from(senderIds));

        const namesMap: Record<string, string> = {};
        profiles?.forEach((p) => {
          namesMap[p.id] =
            `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Coach";
        });
        setUserNames(namesMap);
      }
    }

    setLoading(false);

    // Mark unread messages as read
    if (profile) {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", profile.id)
        .eq("is_read", false);
    }
  }, [conversationId, profile]);

  const fetchOtherUser = useCallback(async () => {
    if (!conversationId || !profile) return;
    const { data: convo } = await supabase
      .from("conversations")
      .select("participant_a, participant_b")
      .eq("id", conversationId)
      .single();

    if (convo) {
      const otherId =
        convo.participant_a === profile.id
          ? convo.participant_b
          : convo.participant_a;
      const { data: other } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", otherId)
        .single();
      if (other) {
        setOtherName(
          `${other.first_name || ""} ${other.last_name || ""}`.trim() ||
            "Coach",
        );
      }
    }
  }, [conversationId, profile]);

  useEffect(() => {
    fetchMessages();
    fetchOtherUser();
  }, [fetchMessages, fetchOtherUser]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          // Mark as read if from other user
          if (newMsg.sender_id !== profile?.id) {
            supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", newMsg.id);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, profile]);

  const handleSend = async () => {
    if (!input.trim() || !profile || !conversationId) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: profile.id,
      content: input.trim(),
    });
    setSending(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setInput("");
    }
  };

  const handleAttachImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
      Alert.alert("Error", "File must be under 50MB.");
      return;
    }

    const fileName = asset.fileName || `image-${Date.now()}.jpg`;
    const mimeType =
      asset.mimeType || guessMimeFromName(fileName, "image/jpeg");
    await uploadAndSendFile(asset.uri, fileName, mimeType);
  };

  const handleAttachVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
      Alert.alert("Error", "File must be under 50MB.");
      return;
    }

    const fileName = asset.fileName || `video-${Date.now()}.mp4`;
    const mimeType = asset.mimeType || guessMimeFromName(fileName, "video/mp4");
    await uploadAndSendFile(asset.uri, fileName, mimeType);
  };

  const handleAttachDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf"],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (asset.size && asset.size > MAX_FILE_SIZE) {
      Alert.alert("Error", "File must be under 50MB.");
      return;
    }

    await uploadAndSendFile(
      asset.uri,
      asset.name,
      asset.mimeType || "application/pdf",
    );
  };

  const uploadAndSendFile = async (
    uri: string,
    fileName: string,
    mimeType: string,
  ) => {
    if (!profile || !conversationId) return;
    setSending(true);

    try {
      // Sanitize filename (no spaces or special chars in object key)
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${conversationId}/${Date.now()}-${safeName}`;

      // Reliable RN upload: fetch -> arrayBuffer (avoids empty-blob bug)
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const fileSize = arrayBuffer.byteLength;

      if (fileSize === 0) {
        throw new Error("File is empty or could not be read.");
      }

      const { error: uploadErr } = await supabase.storage
        .from("message-attachments")
        .upload(filePath, arrayBuffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("message-attachments")
        .getPublicUrl(filePath);

      const { error: msgErr } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: profile.id,
        content: null,
        file_url: urlData.publicUrl,
        file_type: mimeType,
        file_name: fileName,
        file_size_bytes: fileSize,
      });

      if (msgErr) throw msgErr;
    } catch (err: any) {
      Alert.alert("Upload Error", err?.message || "Failed to upload file.");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // if (loading) {
  //   return (
  //     <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
  //       <ActivityIndicator size="large" color="#1B2A4A" />
  //     </View>
  //   );
  // }

  return (
    <>
      <PageHeader
        title="Chat"
        onBack={() => router.replace("/(drawer)/(tabs)/messages")}
      />

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#1B2A4A" />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, backgroundColor: "#F9FAFB" }}
          keyboardVerticalOffset={90}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            ListEmptyComponent={
              <View style={{ alignItems: "center", marginTop: 48 }}>
                <Text style={{ color: "#9CA3AF" }}>
                  No messages yet. Start the conversation!
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isMine = item.sender_id === profile?.id;
              return (
                <View
                  style={{
                    alignSelf: isMine ? "flex-end" : "flex-start",
                    maxWidth: "80%",
                    marginBottom: 8,
                  }}
                >
                  {!isMine && (
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: "#6B7280",
                        marginBottom: 4,
                        marginLeft: 4,
                      }}
                    >
                      {userNames[item.sender_id] || "Coach"}
                    </Text>
                  )}
                  <View
                    style={{
                      backgroundColor: isMine ? "#1B2A4A" : "#FFFFFF",
                      borderRadius: 16,
                      borderBottomRightRadius: isMine ? 4 : 16,
                      borderBottomLeftRadius: isMine ? 16 : 4,
                      padding: 12,
                      shadowColor: "#000",
                      shadowOpacity: 0.05,
                      shadowRadius: 4,
                      elevation: 1,
                    }}
                  >
                    {item.content && (
                      <Text
                        style={{
                          color: isMine ? "#FFFFFF" : "#374151",
                          fontSize: 15,
                          lineHeight: 20,
                        }}
                      >
                        {item.content}
                      </Text>
                    )}
                    {item.file_url && item.file_type?.startsWith("image/") && (
                      <TouchableOpacity
                        onPress={() => {
                          setModalImageUrl(item.file_url);
                          setImageModalVisible(true);
                        }}
                      >
                        <ExpoImage
                          source={{ uri: item.file_url }}
                          style={{
                            width: 220,
                            height: 220,
                            borderRadius: 12,
                            marginTop: item.content ? 8 : 0,
                          }}
                          contentFit="cover"
                        />
                      </TouchableOpacity>
                    )}
                    {item.file_url && item.file_type?.startsWith("video/") && (
                      <View style={{ marginTop: item.content ? 8 : 0 }}>
                        <Video
                          ref={videoRef}
                          source={{ uri: item.file_url }}
                          style={{ width: 280, height: 200, borderRadius: 12 }}
                          useNativeControls
                          resizeMode={ResizeMode.CONTAIN}
                          isLooping={false}
                        />
                      </View>
                    )}
                    {item.file_url &&
                      !item.file_type?.startsWith("image/") &&
                      !item.file_type?.startsWith("video/") && (
                        <TouchableOpacity
                          onPress={() =>
                            item.file_url && Linking.openURL(item.file_url)
                          }
                        >
                          <Text
                            style={{
                              color: isMine ? "#FDBA74" : "#F97316",
                              fontSize: 13,
                              marginTop: item.content ? 4 : 0,
                              textDecorationLine: "underline",
                            }}
                          >
                            📎 {item.file_name || "Attachment"}
                          </Text>
                        </TouchableOpacity>
                      )}
                  </View>
                  <Text
                    style={{
                      fontSize: 10,
                      color: "#9CA3AF",
                      marginTop: 2,
                      alignSelf: isMine ? "flex-end" : "flex-start",
                      marginHorizontal: 4,
                    }}
                  >
                    {formatTime(item.created_at)}
                  </Text>
                </View>
              );
            }}
          />

          {/* Input bar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 12,
              backgroundColor: "#FFFFFF",
              borderTopWidth: 1,
              borderTopColor: "#E5E7EB",
              paddingBottom: 20,
              gap: 8,
            }}
          >
            <TouchableOpacity
              onPress={handleAttachImage}
              style={{ padding: 8 }}
              disabled={sending}
            >
              <ImageIcon size={20} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAttachVideo}
              style={{ padding: 8 }}
              disabled={sending}
            >
              <VideoIcon size={20} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAttachDocument}
              style={{ padding: 8 }}
              disabled={sending}
            >
              <Paperclip size={20} color="#6B7280" />
            </TouchableOpacity>
            <TextInput
              style={{
                flex: 1,
                paddingHorizontal: 16,
                paddingVertical: 10,
                fontSize: 15,
                maxHeight: 100,
              }}
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              value={input}
              onChangeText={setInput}
              multiline
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={sending || !input.trim()}
              style={{
                backgroundColor: input.trim() ? "#F97316" : "#E5E7EB",
                borderRadius: 20,
                width: 40,
                height: 40,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text
                  style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}
                >
                  ^
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Full-size image modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.9)",
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPress={() => setImageModalVisible(false)}
        >
          <ExpoImage
            source={{ uri: modalImageUrl || "" }}
            style={{ width: "100%", height: "100%", resizeMode: "contain" }}
            contentFit="contain"
          />
          <TouchableOpacity
            style={{ position: "absolute", top: 50, right: 20, padding: 10 }}
            onPress={() => setImageModalVisible(false)}
          >
            <Text
              style={{ color: "#FFFFFF", fontSize: 30, fontWeight: "bold" }}
            >
              ✕
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
