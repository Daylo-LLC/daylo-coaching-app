import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useAuthStore } from "../../src/store/auth";
import { supabase } from "../../src/lib/supabase";
import { Tables } from "../../src/types/database";
import SchoolSearch from "../../src/components/SchoolSearch";
import Header from "@/components/Header";

type CoachSchool = Tables<"coach_schools">;
type SchoolChangeRequest = Tables<"school_change_requests">;

const SPORTS = ["football", "soccer"] as const;
const GENDERS = ["boys", "girls", "coed"] as const;
type Gender = (typeof GENDERS)[number];
const genderLabel = (g: string) =>
  g === "coed" ? "Coed" : g.charAt(0).toUpperCase() + g.slice(1);
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

export default function ManageSchoolScreen() {
  const { profile, fetchProfile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // School info
  const [school, setSchool] = useState<{
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    division: string | null;
  } | null>(null);

  // Coach-school links
  const [coachSchools, setCoachSchools] = useState<CoachSchool[]>([]);

  // Division editing
  const [editingDivision, setEditingDivision] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState<string>("");

  // Add sport
  const [showAddSport, setShowAddSport] = useState(false);
  const [newSport, setNewSport] = useState<string>("");
  const [newGender, setNewGender] = useState<Gender>("boys");

  // School change request
  const [showChangeRequest, setShowChangeRequest] = useState(false);
  const [changeSchool, setChangeSchool] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [changeReason, setChangeReason] = useState("");
  const [pendingRequests, setPendingRequests] = useState<SchoolChangeRequest[]>(
    [],
  );

  const fetchData = useCallback(async () => {
    if (!profile?.school_id) {
      setLoading(false);
      return;
    }

    // Fetch school
    const { data: schoolData } = await supabase
      .from("schools")
      .select("id, name, city, state, division")
      .eq("id", profile.school_id)
      .single();

    if (schoolData) {
      setSchool(schoolData);
      setSelectedDivision(schoolData.division || "");
    }

    // Fetch coach_schools
    const { data: csData } = await supabase
      .from("coach_schools")
      .select("*")
      .eq("coach_id", profile.id);
    setCoachSchools(csData || []);

    // Fetch pending change requests
    const { data: reqData } = await supabase
      .from("school_change_requests")
      .select("*")
      .eq("coach_id", profile.id)
      .order("created_at", { ascending: false });
    setPendingRequests(reqData || []);

    setLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveDivision = async () => {
    if (!school || !selectedDivision) return;
    setSaving(true);
    const { error } = await supabase
      .from("schools")
      .update({ division: selectedDivision })
      .eq("id", school.id);
    setSaving(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setSchool({ ...school, division: selectedDivision });
      setEditingDivision(false);
      Alert.alert("Success", "Division updated.");
    }
  };

  const handleAddSport = async () => {
    if (!profile || !school || !newSport) return;

    // Check if already exists (same sport + same gender)
    const existing = coachSchools.find(
      (cs) =>
        cs.sport === newSport &&
        cs.school_id === school.id &&
        (cs as any).gender === newGender,
    );
    if (existing) {
      Alert.alert(
        "Error",
        `You already coach ${genderLabel(newGender)} ${newSport} at this school.`,
      );
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("coach_schools").insert({
      coach_id: profile.id,
      school_id: school.id,
      sport: newSport,
      gender: newGender,
      is_primary: coachSchools.length === 0,
    } as any);
    setSaving(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setShowAddSport(false);
      setNewSport("");
      setNewGender("boys");
      fetchData();
    }
  };

  const handleRemoveSport = async (coachSchoolId: string) => {
    Alert.alert("Remove Sport", "Are you sure you want to remove this sport?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("coach_schools")
            .delete()
            .eq("id", coachSchoolId);
          if (error) {
            Alert.alert("Error", error.message);
          } else {
            fetchData();
          }
        },
      },
    ]);
  };

  const handleSubmitChangeRequest = async () => {
    if (!profile || !school || !changeSchool) return;

    if (changeSchool.id === school.id) {
      Alert.alert("Error", "You are already at this school.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("school_change_requests").insert({
      coach_id: profile.id,
      current_school_id: school.id,
      requested_school_id: changeSchool.id,
      reason: changeReason.trim() || null,
    });
    setSaving(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert(
        "Success",
        "School change request submitted. An admin will review it.",
      );
      setShowChangeRequest(false);
      setChangeSchool(null);
      setChangeReason("");
      fetchData();
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F9FAFB",
        }}
      >
        <ActivityIndicator size="large" color="#1B2A4A" />
      </View>
    );
  }

  return (
    <>
      <Header title="Manage School" />
      <ScrollView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
        <View style={{ padding: 16 }}>
          {/* Current School Card */}
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: "#1B2A4A",
              marginBottom: 16,
            }}
          >
            My School
          </Text>

          {school ? (
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                padding: 20,
                marginBottom: 24,
              }}
            >
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: "#1B2A4A" }}
              >
                {school.name}
              </Text>
              {school.city && school.state && (
                <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>
                  {school.city}, {school.state}
                </Text>
              )}

              {/* Division */}
              <View
                style={{
                  marginTop: 16,
                  paddingTop: 16,
                  borderTopWidth: 1,
                  borderTopColor: "#F3F4F6",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    GHSA Classification
                  </Text>
                  {!editingDivision && (
                    <TouchableOpacity onPress={() => setEditingDivision(true)}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: "#F97316",
                        }}
                      >
                        Edit
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {editingDivision ? (
                  <View style={{ marginTop: 12 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 8,
                        marginBottom: 16,
                      }}
                    >
                      {DIVISIONS.map((d) => (
                        <TouchableOpacity
                          key={d}
                          onPress={() => setSelectedDivision(d)}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor:
                              selectedDivision === d ? "#F97316" : "#D1D5DB",
                            backgroundColor:
                              selectedDivision === d ? "#FFF7ED" : "#FFFFFF",
                            minWidth: 64,
                            alignItems: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color:
                                selectedDivision === d ? "#F97316" : "#374151",
                            }}
                          >
                            {d}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <TouchableOpacity
                        onPress={() => {
                          setEditingDivision(false);
                          setSelectedDivision(school.division || "");
                        }}
                        style={{
                          flex: 1,
                          borderWidth: 1,
                          borderColor: "#D1D5DB",
                          borderRadius: 8,
                          padding: 12,
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: "#6B7280", fontWeight: "600" }}>
                          Cancel
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleSaveDivision}
                        disabled={saving || !selectedDivision}
                        style={{
                          flex: 1,
                          backgroundColor:
                            saving || !selectedDivision ? "#9CA3AF" : "#F97316",
                          borderRadius: 8,
                          padding: 12,
                          alignItems: "center",
                        }}
                      >
                        {saving ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text
                            style={{
                              color: "#FFFFFF",
                              fontWeight: "600",
                            }}
                          >
                            Save
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <Text
                    style={{ fontSize: 16, color: "#1B2A4A", marginTop: 4 }}
                  >
                    {school.division || "Not set"}
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                padding: 20,
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <Text style={{ color: "#6B7280", fontSize: 14 }}>
                No school linked to your account.
              </Text>
            </View>
          )}

          {/* Sports Section */}
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: "#1B2A4A",
              marginBottom: 16,
            }}
          >
            My Teams
          </Text>

          {coachSchools.length === 0 ? (
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                padding: 20,
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text style={{ color: "#6B7280", fontSize: 14 }}>
                No teams added yet.
              </Text>
            </View>
          ) : (
            coachSchools.map((cs) => (
              <View
                key={cs.id}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#1B2A4A",
                      }}
                    >
                      {cs.sport.charAt(0).toUpperCase() + cs.sport.slice(1)}
                      {" \u00B7 "}
                      {genderLabel((cs as any).gender || "boys")}
                    </Text>
                    {cs.is_primary && (
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#F97316",
                          fontWeight: "600",
                          marginTop: 2,
                        }}
                      >
                        Primary
                      </Text>
                    )}
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {coachSchools.length > 1 && (
                      <TouchableOpacity
                        onPress={() => handleRemoveSport(cs.id)}
                        style={{
                          backgroundColor: "#FEE2E2",
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: "#DC2626",
                            fontSize: 12,
                            fontWeight: "600",
                          }}
                        >
                          Remove
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ))
          )}

          {/* Add Sport */}
          {!showAddSport ? (
            <TouchableOpacity
              onPress={() => setShowAddSport(true)}
              style={{
                backgroundColor: "#1B2A4A",
                borderRadius: 8,
                padding: 14,
                alignItems: "center",
                marginBottom: 32,
              }}
            >
              <Text
                style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}
              >
                Add a Team
              </Text>
            </TouchableOpacity>
          ) : (
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                padding: 16,
                marginBottom: 32,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#1B2A4A",
                  marginBottom: 12,
                }}
              >
                Add a New Team
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: 8,
                }}
              >
                Sport
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                {SPORTS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setNewSport(s)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: newSport === s ? "#F97316" : "#D1D5DB",
                      backgroundColor: newSport === s ? "#FFF7ED" : "#FFFFFF",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: newSport === s ? "#F97316" : "#374151",
                      }}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#1B2A4A",
                  marginBottom: 12,
                }}
              >
                Gender
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setNewGender(g)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: newGender === g ? "#F97316" : "#D1D5DB",
                      backgroundColor: newGender === g ? "#FFF7ED" : "#FFFFFF",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: newGender === g ? "#F97316" : "#374151",
                      }}
                    >
                      {genderLabel(g)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowAddSport(false);
                    setNewSport("");
                    setNewGender("boys");
                  }}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: "#D1D5DB",
                    borderRadius: 8,
                    padding: 12,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#6B7280", fontWeight: "600" }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddSport}
                  disabled={saving || !newSport}
                  style={{
                    flex: 1,
                    backgroundColor:
                      saving || !newSport ? "#9CA3AF" : "#F97316",
                    borderRadius: 8,
                    padding: 12,
                    alignItems: "center",
                  }}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>
                      Add Team
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* School Change Request Section */}
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: "#1B2A4A",
              marginBottom: 16,
            }}
          >
            Request School Change
          </Text>

          {/* Pending Requests */}
          {pendingRequests.filter((r) => r.status === "pending").length > 0 && (
            <View
              style={{
                backgroundColor: "#FEF3C7",
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#92400E",
                  marginBottom: 4,
                }}
              >
                Pending Request
              </Text>
              <Text style={{ fontSize: 13, color: "#92400E" }}>
                You have a school change request awaiting admin review.
              </Text>
            </View>
          )}

          {/* Past Requests */}
          {pendingRequests
            .filter((r) => r.status !== "pending")
            .slice(0, 3)
            .map((r) => (
              <View
                key={r.id}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#6B7280",
                    }}
                  >
                    {new Date(r.created_at).toLocaleDateString()}
                  </Text>
                  <View
                    style={{
                      backgroundColor:
                        r.status === "approved" ? "#F0FDF4" : "#FEE2E2",
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: r.status === "approved" ? "#10B981" : "#EF4444",
                      }}
                    >
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

          {!showChangeRequest ? (
            <TouchableOpacity
              onPress={() => setShowChangeRequest(true)}
              disabled={
                pendingRequests.filter((r) => r.status === "pending").length > 0
              }
              style={{
                backgroundColor:
                  pendingRequests.filter((r) => r.status === "pending").length >
                  0
                    ? "#9CA3AF"
                    : "#1B2A4A",
                borderRadius: 8,
                padding: 14,
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text
                style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}
              >
                Request School Transfer
              </Text>
            </TouchableOpacity>
          ) : (
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#1B2A4A",
                  marginBottom: 12,
                }}
              >
                Transfer to a Different School
              </Text>

              <SchoolSearch
                onSelect={setChangeSchool}
                selectedSchool={changeSchool}
              />

              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: 6,
                  marginTop: 16,
                }}
              >
                Reason (optional)
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
                  minHeight: 80,
                  textAlignVertical: "top",
                }}
                value={changeReason}
                onChangeText={setChangeReason}
                placeholder="Why are you requesting a transfer?"
                placeholderTextColor="#9CA3AF"
                multiline
              />

              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowChangeRequest(false);
                    setChangeSchool(null);
                    setChangeReason("");
                  }}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: "#D1D5DB",
                    borderRadius: 8,
                    padding: 12,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#6B7280", fontWeight: "600" }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSubmitChangeRequest}
                  disabled={saving || !changeSchool}
                  style={{
                    flex: 1,
                    backgroundColor:
                      saving || !changeSchool ? "#9CA3AF" : "#F97316",
                    borderRadius: 8,
                    padding: 12,
                    alignItems: "center",
                  }}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>
                      Submit Request
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}
