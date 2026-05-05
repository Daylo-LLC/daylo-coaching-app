import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#1B2A4A" },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "bold" },
        contentStyle: { backgroundColor: "#F9FAFB" },
        headerShown: false,
      }}
    >
      <Stack.Screen name="sign-in" options={{ title: "Sign In" }} />
      <Stack.Screen name="sign-up" options={{ title: "Create Account" }} />
    </Stack>
  );
}
