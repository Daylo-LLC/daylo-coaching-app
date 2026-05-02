import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "../../src/store/auth";
import { supabase } from "../../src/lib/supabase";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { profile } = useAuthStore();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  // Countdown timer for resend button
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const handleVerify = async () => {
    if (!code || code.length !== 8) {
      Alert.alert("Error", "Please enter the 8-digit verification code");
      return;
    }

    setLoading(true);
    try {
      // Verify the code using Supabase auth
      const { error } = await supabase.auth.verifyOtp({
        email: email || profile?.email || "",
        token: code,
        type: "signup",
      });

      if (error) {
        Alert.alert("Error", error.message);
      } else {
        // Success - user will be automatically signed in
        Alert.alert("Success", "Email verified successfully!");
        router.replace("/");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to verify code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email || profile?.email || "",
      });

      if (error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Success", "Verification code sent!");
        setTimeLeft(60); // Reset timer
      }
    } catch (err) {
      Alert.alert("Error", "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#F9FAFB" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ padding: 24, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text
            style={{
              fontSize: 32,
              fontWeight: "700",
              color: "#1B2A4A",
              marginBottom: 12,
            }}
          >
            Verify Email
          </Text>
          <Text style={{ fontSize: 16, color: "#6B7280", marginBottom: 32 }}>
            We've sent an 8-digit code to {email || profile?.email}. Enter it
            below to verify your email.
          </Text>

          <View style={{ marginBottom: 32 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#374151",
                marginBottom: 8,
              }}
            >
              Verification Code
            </Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="00000000"
              keyboardType="numeric"
              maxLength={8}
              autoCapitalize="none"
              autoComplete="one-time-code"
              style={{
                borderWidth: 1,
                borderColor: "#D1D5DB",
                borderRadius: 8,
                padding: 16,
                fontSize: 20,
                letterSpacing: 4,
                textAlign: "center",
                backgroundColor: "#FFFFFF",
              }}
            />
          </View>

          <TouchableOpacity
            onPress={handleVerify}
            disabled={loading || code.length !== 8}
            style={{
              backgroundColor:
                loading || code.length !== 8 ? "#9CA3AF" : "#1B2A4A",
              borderRadius: 8,
              padding: 16,
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text
                style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}
              >
                Verify Email
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleResend}
            disabled={resending || timeLeft > 0}
            style={{ alignItems: "center" }}
          >
            {resending ? (
              <ActivityIndicator size="small" color="#6B7280" />
            ) : (
              <Text
                style={{
                  color: timeLeft > 0 ? "#9CA3AF" : "#6B7280",
                  fontSize: 14,
                }}
              >
                {timeLeft > 0
                  ? `Resend code in ${timeLeft}s`
                  : "Didn't receive the code? Resend"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
