import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuthStore } from "../src/store/auth";

export default function Index() {
  const { session, profile, isLoading, isApproved } = useAuthStore();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#1B2A4A",
        }}
      >
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // Session exists but profile not loaded yet — wait instead of falling through to home
  if (!profile) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#FFFFFF",
        }}
      >
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  if (profile.approval_status === "pending") {
    return <Redirect href="/pending" />;
  }

  if (!profile.first_name) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(drawer)/(tabs)/home" />;
}
