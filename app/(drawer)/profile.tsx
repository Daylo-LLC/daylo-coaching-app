import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  StyleSheet,
} from "react-native";
import { Menu } from "lucide-react-native";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../src/store/auth";
import { supabase } from "../../src/lib/supabase";
import * as ImagePicker from "expo-image-picker";
import Header from "@/components/Header";

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || "",
    last_name: profile?.last_name || "",
    phone: profile?.phone || "",
    avatar_url: profile?.avatar_url || "",
  });

  const handleSave = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone || null,
          avatar_url: formData.avatar_url || null,
        })
        .eq("id", profile.id);

      if (error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Success", "Profile updated successfully");
        // Refresh profile in store
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", profile.id)
          .single();
        if (data) {
          useAuthStore.getState().setProfile(data);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      // TODO: Upload to Supabase storage
      setFormData({ ...formData, avatar_url: result.assets[0].uri });
    }
  };

  function MenuButton() {
    const navigation = useNavigation();
    return (
      <TouchableOpacity
        onPress={() =>
          navigation.getParent()?.dispatch(DrawerActions.openDrawer())
        }
      >
        <Menu size={24} color="#6B7280" />
      </TouchableOpacity>
    );
  }

  return (
    <>
      <Header title="Manage Profile" />
      <ScrollView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
        <View style={{ padding: 16 }}>
          {/* Avatar Section */}
          <View style={{ alignItems: "center", marginBottom: 32 }}>
            <TouchableOpacity onPress={pickImage}>
              <View
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: "#F3F4F6",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                {formData.avatar_url ? (
                  <Image
                    source={{ uri: formData.avatar_url }}
                    style={{ width: 120, height: 120, borderRadius: 60 }}
                  />
                ) : (
                  <Text style={{ fontSize: 48, color: "#9CA3AF" }}>
                    {formData.first_name?.[0] || formData.last_name?.[0] || "?"}
                  </Text>
                )}
              </View>
              <Text
                style={{ color: "#F97316", fontSize: 14, fontWeight: "600" }}
              >
                Change Photo
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={{ gap: 20 }}>
            <View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#1B2A4A",
                  marginBottom: 8,
                }}
              >
                First Name
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: "#FFFFFF",
                }}
                value={formData.first_name}
                onChangeText={(text) =>
                  setFormData({ ...formData, first_name: text })
                }
                placeholder="Enter first name"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#1B2A4A",
                  marginBottom: 8,
                }}
              >
                Last Name
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: "#FFFFFF",
                }}
                value={formData.last_name}
                onChangeText={(text) =>
                  setFormData({ ...formData, last_name: text })
                }
                placeholder="Enter last name"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#1B2A4A",
                  marginBottom: 8,
                }}
              >
                Phone Number (Optional)
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: "#FFFFFF",
                }}
                value={formData.phone}
                onChangeText={(text) =>
                  setFormData({ ...formData, phone: text })
                }
                placeholder="Enter phone number"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />
            </View>

            <View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#1B2A4A",
                  marginBottom: 8,
                }}
              >
                Email
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: "#F3F4F6",
                  color: "#6B7280",
                }}
                value={profile?.email || ""}
                editable={false}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            style={{
              backgroundColor: loading ? "#9CA3AF" : "#F97316",
              borderRadius: 8,
              padding: 16,
              alignItems: "center",
              marginTop: 32,
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text
                style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}
              >
                Save Changes
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    paddingTop: 60,
    backgroundColor: "#1B2A4A",
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    paddingTop: 20,
    fontSize: 22,
    fontWeight: "800",
    color: "#6B7280",
  },
  headerSubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
});
