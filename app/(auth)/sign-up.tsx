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
import SchoolSearch from "../../src/components/SchoolSearch";

export default function SignUp() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const signUp = useAuthStore((s) => s.signUp);

  const handleSignUp = async () => {
    if (!firstName || !lastName || !email || !password || !selectedSchool) {
      setError("Please fill in all fields, including your school.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await signUp(
      email.trim(),
      password,
      firstName.trim(),
      lastName.trim(),
      selectedSchool.id,
    );
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else if (result.needsVerification) {
      // Redirect to verification screen
      router.push({
        pathname: "/(auth)/verify-email",
        params: { email: email.trim() },
      });
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
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <Text style={{ fontSize: 32, fontWeight: "800", color: "#1B2A4A" }}>
            Join Daylo
          </Text>
          <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>
            Create your coaching account
          </Text>
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

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#374151",
                marginBottom: 6,
              }}
            >
              First Name
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
              placeholder="John"
              placeholderTextColor="#9CA3AF"
              value={firstName}
              onChangeText={setFirstName}
              autoComplete="given-name"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Last Name
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
              placeholder="Smith"
              placeholderTextColor="#9CA3AF"
              value={lastName}
              onChangeText={setLastName}
              autoComplete="family-name"
            />
          </View>
        </View>

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

        <SchoolSearch
          onSelect={setSelectedSchool}
          selectedSchool={selectedSchool}
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
            marginBottom: 16,
          }}
          placeholder="••••••••"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />

        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: "#374151",
            marginBottom: 6,
          }}
        >
          Confirm Password
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
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoComplete="new-password"
        />

        <TouchableOpacity
          onPress={handleSignUp}
          disabled={loading}
          style={{
            backgroundColor: "#F97316",
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
              Create Account
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
          <Text style={{ color: "#6B7280" }}>Already have an account? </Text>
          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity>
              <Text style={{ color: "#F97316", fontWeight: "600" }}>
                Sign In
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
