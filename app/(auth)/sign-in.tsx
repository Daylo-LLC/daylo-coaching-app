import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Link, router } from "expo-router";
import { useAuthStore } from "../../src/store/auth";
import { Image } from "expo-image";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const signIn = useAuthStore((s) => s.signIn);

  const handleSignIn = async () => {
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await signIn(email.trim(), password);
    setLoading(false);
    if (err) {
      // Check if error is about unverified email
      if (err.includes("Email not confirmed") || err.includes("verify")) {
        setError("Please verify your email first.");
        // Redirect to verification screen after a short delay
        setTimeout(() => {
          router.push({
            pathname: "/(auth)/verify-email",
            params: { email: email.trim() },
          });
        }, 1500);
      } else {
        setError(err);
      }
    } else {
      router.replace("/");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: "center", marginBottom: 48 }}>
          <Image
            source={require("../../assets/logo.png")}
            style={{ width: 280, height: 280 }}
          />
          {/* <Text style={{ fontSize: 16, color: "#6B7280", marginTop: 8 }}>
            Schedule games with ease
          </Text> */}
        </View>

        {error && (
          <View
            style={{
              backgroundColor: "#FEE2E2",
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: "#EF4444", textAlign: "center" }}>
              {error}
            </Text>
          </View>
        )}

        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: "#374151",
            marginBottom: 6,
          }}
        >
          Email
        </Text>
        <TextInput
          style={{
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "#D1D5DB",
            borderRadius: 8,
            padding: 14,
            fontSize: 16,
            marginBottom: 16,
          }}
          placeholder="coach@school.edu"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: "#374151",
            marginBottom: 6,
          }}
        >
          Password
        </Text>
        <TextInput
          style={{
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "#D1D5DB",
            borderRadius: 8,
            padding: 14,
            fontSize: 16,
            marginBottom: 24,
          }}
          placeholder="••••••••"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        <TouchableOpacity
          onPress={handleSignIn}
          disabled={loading}
          style={{
            backgroundColor: "#1B2A4A",
            borderRadius: 8,
            padding: 16,
            alignItems: "center",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
              Sign In
            </Text>
          )}
        </TouchableOpacity>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            marginTop: 24,
          }}
        >
          <Text style={{ color: "#6B7280" }}>Don't have an account? </Text>
          <Link href="/(auth)/sign-up" asChild>
            <TouchableOpacity>
              <Text style={{ color: "#F97316", fontWeight: "600" }}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </Link>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            marginTop: 12,
          }}
        >
          <Text style={{ color: "#6B7280" }}>Need to verify your email? </Text>
          <Link href="/(auth)/verify-email" asChild>
            <TouchableOpacity>
              <Text style={{ color: "#F97316", fontWeight: "600" }}>
                Verify Email
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
