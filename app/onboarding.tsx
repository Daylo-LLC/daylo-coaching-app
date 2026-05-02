import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "../src/store/auth";
import { supabase } from "../src/lib/supabase";

const SPORTS = ["football", "soccer"] as const;
const DIVISIONS = [
  "A-Public",
  "A-Private",
  "2A",
  "3A",
  "4A",
  "5A",
  "6A",
  "7A",
] as const;

export default function Onboarding() {
  const { profile, fetchProfile } = useAuthStore();
  const [step, setStep] = useState(0);

  // Step 0: Personal details
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");

  // Step 1: Sport + Division
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [selectedDivision, setSelectedDivision] = useState<string>("");
  const [schoolName, setSchoolName] = useState<string>("");

  const [loading, setLoading] = useState(false);

  // Fetch school name for display
  useEffect(() => {
    const fetchSchool = async () => {
      if (!profile?.school_id) return;
      const { data } = await supabase
        .from("schools")
        .select("name, division")
        .eq("id", profile.school_id)
        .single();
      if (data) {
        setSchoolName(data.name);
        if (data.division) {
          setSelectedDivision(data.division);
        }
      }
    };
    fetchSchool();
  }, [profile?.school_id]);

  const handleSaveProfile = async () => {
    if (!firstName || !lastName) {
      Alert.alert("Error", "First and last name are required.");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      })
      .eq("id", profile!.id);
    setLoading(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setStep(1);
    }
  };

  const handleFinish = async () => {
    if (!selectedSport) {
      Alert.alert("Error", "Please select your sport.");
      return;
    }
    if (!selectedDivision) {
      Alert.alert("Error", "Please select your division.");
      return;
    }

    const schoolId = profile?.school_id;
    if (!schoolId) {
      Alert.alert(
        "Error",
        "No school linked to your account. Please contact support.",
      );
      return;
    }

    setLoading(true);

    // Insert coach_schools row
    const { error: csError } = await supabase.from("coach_schools").insert({
      coach_id: profile!.id,
      school_id: schoolId,
      sport: selectedSport,
      is_primary: true,
    });

    if (csError) {
      setLoading(false);
      Alert.alert("Error", csError.message);
      return;
    }

    // Update school division if not already set
    const { error: divError } = await supabase
      .from("schools")
      .update({ division: selectedDivision })
      .eq("id", schoolId);

    if (divError) {
      setLoading(false);
      Alert.alert("Error", divError.message);
      return;
    }

    setLoading(false);
    await fetchProfile();
    router.replace("/(drawer)/(tabs)/home");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        {/* Progress */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 32 }}>
          {[0, 1].map((i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: i <= step ? "#F97316" : "#E5E7EB",
              }}
            />
          ))}
        </View>

        {step === 0 && (
          <>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "800",
                color: "#1B2A4A",
                marginBottom: 4,
              }}
            >
              Personal Details
            </Text>
            <Text style={{ fontSize: 14, color: "#6B7280", marginBottom: 24 }}>
              Tell us about yourself
            </Text>

            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#374151",
                marginBottom: 6,
              }}
            >
              First Name *
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
              value={firstName}
              onChangeText={setFirstName}
              placeholder="John"
              placeholderTextColor="#9CA3AF"
            />

            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Last Name *
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
              value={lastName}
              onChangeText={setLastName}
              placeholder="Smith"
              placeholderTextColor="#9CA3AF"
            />

            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Phone (optional)
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
              value={phone}
              onChangeText={setPhone}
              placeholder="(555) 123-4567"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              onPress={handleSaveProfile}
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
                <Text
                  style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}
                >
                  Continue
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {step === 1 && (
          <>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "800",
                color: "#1B2A4A",
                marginBottom: 4,
              }}
            >
              Sport & Division
            </Text>
            <Text style={{ fontSize: 14, color: "#6B7280", marginBottom: 24 }}>
              Tell us what you coach
            </Text>

            {/* School display (read-only) */}
            {schoolName ? (
              <View
                style={{
                  backgroundColor: "#F0FDF4",
                  borderWidth: 1,
                  borderColor: "#10B981",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 24,
                }}
              >
                <Text
                  style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}
                >
                  Your School
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#1B2A4A",
                  }}
                >
                  {schoolName}
                </Text>
              </View>
            ) : null}

            {/* Sport Selection */}
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#374151",
                marginBottom: 10,
              }}
            >
              Sport *
            </Text>
            <View style={{ gap: 10, marginBottom: 24 }}>
              {SPORTS.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setSelectedSport(s)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor:
                      selectedSport === s ? "#1B2A4A" : "#FFFFFF",
                    borderWidth: 1,
                    borderColor: selectedSport === s ? "#1B2A4A" : "#D1D5DB",
                    borderRadius: 12,
                    padding: 18,
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: selectedSport === s ? "#FFFFFF" : "#D1D5DB",
                      backgroundColor:
                        selectedSport === s ? "#F97316" : "transparent",
                      marginRight: 14,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {selectedSport === s && (
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: "#FFFFFF",
                        }}
                      />
                    )}
                  </View>
                  <Text
                    style={{
                      fontSize: 17,
                      fontWeight: "700",
                      color: selectedSport === s ? "#FFFFFF" : "#374151",
                    }}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Division Selection */}
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#374151",
                marginBottom: 10,
              }}
            >
              GHSA Classification *
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 32,
              }}
            >
              {DIVISIONS.map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setSelectedDivision(d)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: selectedDivision === d ? "#F97316" : "#D1D5DB",
                    backgroundColor:
                      selectedDivision === d ? "#FFF7ED" : "#FFFFFF",
                    minWidth: 72,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: selectedDivision === d ? "#F97316" : "#374151",
                    }}
                  >
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleFinish}
              disabled={loading || !selectedSport || !selectedDivision}
              style={{
                backgroundColor:
                  !selectedSport || !selectedDivision ? "#9CA3AF" : "#F97316",
                borderRadius: 8,
                padding: 16,
                alignItems: "center",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}
                >
                  Get Started
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
