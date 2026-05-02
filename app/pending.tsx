import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../src/store/auth";

export default function Pending() {
  const router = useRouter();
  const { signOut, fetchProfile, profile } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
      }}
    >
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: "#FFF7ED",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <Text style={{ fontSize: 36 }}>⏳</Text>
      </View>

      <Text
        style={{
          fontSize: 24,
          fontWeight: "700",
          color: "#1B2A4A",
          textAlign: "center",
        }}
      >
        Account Pending
      </Text>
      <Text
        style={{
          fontSize: 16,
          color: "#6B7280",
          textAlign: "center",
          marginTop: 12,
          lineHeight: 24,
          paddingHorizontal: 16,
        }}
      >
        Your account is awaiting approval from a Daylo administrator. You'll
        receive a notification once your account has been approved.
      </Text>

      <TouchableOpacity
        onPress={async () => {
          await fetchProfile();
          // After fetching, check if approved and navigate accordingly
          const state = useAuthStore.getState();
          if (state.profile?.approval_status === "approved") {
            if (!state.profile.first_name) {
              router.replace("/onboarding");
            } else {
              router.replace("/(tabs)/home");
            }
          }
        }}
        style={{
          backgroundColor: "#1B2A4A",
          borderRadius: 8,
          padding: 16,
          alignItems: "center",
          marginTop: 32,
          width: "100%",
        }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
          Check Status
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleSignOut}
        style={{
          borderWidth: 1,
          borderColor: "#D1D5DB",
          borderRadius: 8,
          padding: 16,
          alignItems: "center",
          marginTop: 12,
          width: "100%",
        }}
      >
        <Text style={{ color: "#6B7280", fontSize: 16, fontWeight: "600" }}>
          Sign Out
        </Text>
      </TouchableOpacity>
    </View>
  );
}
