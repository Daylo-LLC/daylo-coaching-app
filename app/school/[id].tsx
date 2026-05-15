import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import moment from "moment";
import { useLocalSearchParams } from "expo-router";
import { useAuthStore } from "../../src/store/auth";
import { supabase } from "../../src/lib/supabase";
import { Tables } from "../../src/types/database";
import { Phone, Mail, MapPin } from "lucide-react-native";
import PageHeader from "@/components/PageHeader";
import {
  resolveVenue,
  type HomeAwayPref,
  type ResolvedVenue,
} from "../../src/lib/venue";

type School = Tables<"schools">;
type Availability = Tables<"availability">;

export default function SchoolDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuthStore();
  const [school, setSchool] = useState<School | null>(null);
  const [slots, setSlots] = useState<Availability[]>([]);
  const [coaches, setCoaches] = useState<
    Array<{
      coach_id: string;
      sport: string;
      profiles: { first_name: string | null; last_name: string | null } | null;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Availability | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [requesterSchool, setRequesterSchool] = useState<School | null>(null);
  const [venueInput, setVenueInput] = useState("");

  useEffect(() => {
    fetchSchoolDetails();
  }, [id]);

  useEffect(() => {
    const loadRequesterSchool = async () => {
      if (!profile?.school_id) {
        setRequesterSchool(null);
        return;
      }
      const { data } = await supabase
        .from("schools")
        .select("*")
        .eq("id", profile.school_id)
        .single();
      setRequesterSchool(data || null);
    };
    loadRequesterSchool();
  }, [profile?.school_id]);

  const fetchSchoolDetails = async () => {
    if (!id) return;

    try {
      // Fetch school details
      const { data: schoolData } = await supabase
        .from("schools")
        .select("*")
        .eq("id", id)
        .single();

      if (schoolData) {
        setSchool(schoolData);

        // Fetch availability slots
        const { data: slotsData } = await supabase
          .from("availability")
          .select("*")
          .eq("school_id", id)
          .eq("is_booked", false)
          .filter("date", "gte", moment().format("YYYY-MM-DD"))
          .order("date", { ascending: true });

        setSlots(slotsData || []);

        // Fetch coaches
        const { data: coachesData } = await supabase
          .from("coach_schools")
          .select("coach_id, sport, profiles(first_name, last_name)")
          .eq("school_id", id);

        setCoaches(coachesData || []);
      }
    } catch (error) {
      console.error("Error fetching school details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestGame = (slot: Availability) => {
    if (!profile) {
      Alert.alert("Error", "Please sign in to request a game");
      return;
    }
    setSelectedSlot(slot);
    if (school) {
      const resolved = resolveVenue({
        pref: (slot.home_away_preference as HomeAwayPref) || "either",
        slotVenue: slot.venue,
        coachSchool: {
          name: school.name,
          address: school.address,
          city: school.city,
          state: school.state,
        },
        requesterSchool: requesterSchool
          ? {
              name: requesterSchool.name,
              address: requesterSchool.address,
              city: requesterSchool.city,
              state: requesterSchool.state,
            }
          : null,
      });
      setVenueInput(resolved.prefill);
    } else {
      setVenueInput("");
    }
    setShowRequestModal(true);
  };

  const sendRequest = async () => {
    if (!profile || !selectedSlot) return;

    if (!profile.school_id) {
      Alert.alert(
        "Error",
        "You must be associated with a school to request a game.",
      );
      return;
    }

    const finalVenue = venueInput.trim();

    setSending(true);
    try {
      const { error } = await supabase.from("requests").insert({
        requester_id: profile.id,
        requester_school_id: profile.school_id,
        recipient_id: selectedSlot.coach_id,
        recipient_school_id: id,
        availability_id: selectedSlot.id,
        date: selectedSlot.date,
        time_start: selectedSlot.time_start,
        time_end: selectedSlot.time_end,
        sport: selectedSlot.sport,
        gender: (selectedSlot as any).gender || "boys",
        home_away:
          selectedSlot.home_away_preference === "either"
            ? "neutral"
            : selectedSlot.home_away_preference || "neutral",
        venue: finalVenue || null,
        status: "pending",
      });

      if (error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Success", "Game request sent!");
        setShowRequestModal(false);
        setMessage("");
        setVenueInput("");
        setSelectedSlot(null);
        // Refresh slots
        fetchSchoolDetails();
      }
    } catch (error) {
      Alert.alert("Error", "Failed to send request");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  if (!school) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text style={{ fontSize: 18, color: "#6B7280" }}>School not found</Text>
      </View>
    );
  }

  return (
    <>
      <PageHeader title={`${school.name.substring(0, 20)}...`} />
      <ScrollView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
        <View style={{ padding: 16 }}>
          {/* School Info */}
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
              shadowColor: "#000",
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            <Text style={{ fontSize: 24, fontWeight: "800", color: "#1B2A4A" }}>
              {school.name}
            </Text>
            {school.mascot && (
              <Text
                style={{
                  fontSize: 16,
                  color: "#F97316",
                  fontWeight: "600",
                  marginTop: 4,
                }}
              >
                {school.mascot}
              </Text>
            )}
            {(school.city || school.state) && (
              <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 8 }}>
                {[school.address, school.city, school.state, school.zip_code]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
            )}
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginTop: 12,
                flexWrap: "wrap",
              }}
            >
              {school.division && (
                <View
                  style={{
                    backgroundColor: "#EFF6FF",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#1E40AF",
                      fontWeight: "600",
                    }}
                  >
                    {school.division}
                  </Text>
                </View>
              )}
              {school.conference && (
                <View
                  style={{
                    backgroundColor: "#F0FDF4",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#166534",
                      fontWeight: "600",
                    }}
                  >
                    Conference: {school.conference}
                  </Text>
                </View>
              )}
            </View>
            {(school.contact_phone || school.contact_email) && (
              <View
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: "#F3F4F6",
                }}
              >
                {school.contact_phone && (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ color: "#6B7280", marginRight: 8 }}>
                      <Phone size={16} />
                    </Text>
                    <Text style={{ fontSize: 13, color: "#6B7280" }}>
                      {school.contact_phone}
                    </Text>
                  </View>
                )}
                {school.contact_email && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 4,
                    }}
                  >
                    <Text style={{ color: "#6B7280", marginRight: 8 }}>
                      <Mail size={16} />
                    </Text>
                    <Text style={{ fontSize: 13, color: "#6B7280" }}>
                      {school.contact_email}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Coaches */}
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              shadowColor: "#000",
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#1B2A4A",
                marginBottom: 12,
              }}
            >
              Coaches
            </Text>
            {coaches.length === 0 ? (
              <Text style={{ color: "#9CA3AF", fontSize: 14 }}>
                No coaches listed
              </Text>
            ) : (
              coaches.map((coach) => (
                <View
                  key={`${coach.coach_id}-${coach.sport}`}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ fontSize: 14, color: "#374151" }}>
                    {coach.profiles?.first_name} {coach.profiles?.last_name}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#6B7280" }}>
                    {coach.sport}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Available Slots */}
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              shadowColor: "#000",
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#1B2A4A",
                marginBottom: 12,
              }}
            >
              Available Time Slots
            </Text>
            {slots.length === 0 ? (
              <Text style={{ color: "#9CA3AF", fontSize: 14 }}>
                No available time slots
              </Text>
            ) : (
              slots.map((slot) => (
                <View
                  key={slot.id}
                  style={{
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: "#1B2A4A",
                        }}
                      >
                        Date:{" "}
                        {new Date(
                          slot.date + " " + slot.time_start,
                        ).toLocaleDateString()}
                      </Text>
                      <Text
                        style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}
                      >
                        Time:{" "}
                        {moment(slot.time_start, "HH:mm:ss").format("h:mm A")}
                      </Text>
                      <Text
                        style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}
                      >
                        Sport: {slot.sport}
                      </Text>
                      {(() => {
                        if (!school) return null;
                        const resolved = resolveVenue({
                          pref:
                            (slot.home_away_preference as HomeAwayPref) ||
                            "either",
                          slotVenue: slot.venue,
                          coachSchool: {
                            name: school.name,
                            address: school.address,
                            city: school.city,
                            state: school.state,
                          },
                          requesterSchool: requesterSchool
                            ? {
                                name: requesterSchool.name,
                                address: requesterSchool.address,
                                city: requesterSchool.city,
                                state: requesterSchool.state,
                              }
                            : null,
                        });
                        return (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              marginTop: 4,
                            }}
                          >
                            <Text style={{ color: "#9CA3AF", marginRight: 4 }}>
                              <MapPin size={12} />
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                color: "#9CA3AF",
                                flex: 1,
                              }}
                            >
                              {resolved.display}
                            </Text>
                          </View>
                        );
                      })()}
                    </View>
                    {!profile || profile.id === slot.coach_id ? null : (
                      <TouchableOpacity
                        onPress={() => handleRequestGame(slot)}
                        style={{
                          backgroundColor: "#F97316",
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: "#FFFFFF",
                            fontSize: 12,
                            fontWeight: "600",
                          }}
                        >
                          Request
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Request Modal */}
      <Modal
        visible={showRequestModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRequestModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 20,
              width: "100%",
              maxWidth: 400,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#1B2A4A",
                marginBottom: 12,
              }}
            >
              Request Game
            </Text>
            {selectedSlot && (
              <Text
                style={{ fontSize: 14, color: "#6B7280", marginBottom: 16 }}
              >
                {new Date(
                  selectedSlot.date + " " + selectedSlot.time_start,
                ).toLocaleDateString()}{" "}
                at{" "}
                {moment(selectedSlot.time_start, "HH:mm:ss").format("h:mm A")}
              </Text>
            )}

            {/* Venue */}
            {selectedSlot &&
              school &&
              (() => {
                const resolved: ResolvedVenue = resolveVenue({
                  pref:
                    (selectedSlot.home_away_preference as HomeAwayPref) ||
                    "either",
                  slotVenue: selectedSlot.venue,
                  coachSchool: {
                    name: school.name,
                    address: school.address,
                    city: school.city,
                    state: school.state,
                  },
                  requesterSchool: requesterSchool
                    ? {
                        name: requesterSchool.name,
                        address: requesterSchool.address,
                        city: requesterSchool.city,
                        state: requesterSchool.state,
                      }
                    : null,
                });
                return (
                  <View style={{ marginBottom: 16 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: "#374151",
                        marginBottom: 6,
                      }}
                    >
                      Venue
                    </Text>
                    {resolved.editable ? (
                      <>
                        <TextInput
                          style={{
                            borderWidth: 1,
                            borderColor: "#D1D5DB",
                            borderRadius: 8,
                            padding: 12,
                            fontSize: 14,
                          }}
                          placeholder="Suggest a venue"
                          placeholderTextColor="#9CA3AF"
                          value={venueInput}
                          onChangeText={setVenueInput}
                        />
                        <Text
                          style={{
                            fontSize: 11,
                            color: "#9CA3AF",
                            marginTop: 4,
                          }}
                        >
                          You can change this later until the coach accepts.
                        </Text>
                      </>
                    ) : (
                      <View
                        style={{
                          backgroundColor: "#F3F4F6",
                          borderRadius: 8,
                          padding: 12,
                        }}
                      >
                        <Text style={{ fontSize: 14, color: "#1B2A4A" }}>
                          {resolved.display}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            color: "#9CA3AF",
                            marginTop: 2,
                          }}
                        >
                          {resolved.isSchoolAddressFallback
                            ? "Using the host school's address"
                            : "Set by coach"}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })()}

            <TextInput
              style={{
                borderWidth: 1,
                borderColor: "#D1D5DB",
                borderRadius: 8,
                padding: 12,
                fontSize: 14,
                marginBottom: 16,
                minHeight: 80,
                textAlignVertical: "top",
              }}
              placeholder="Add a message (optional)"
              placeholderTextColor="#9CA3AF"
              value={message}
              onChangeText={setMessage}
              multiline
            />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowRequestModal(false)}
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
                onPress={sendRequest}
                disabled={sending}
                style={{
                  flex: 1,
                  backgroundColor: sending ? "#9CA3AF" : "#F97316",
                  borderRadius: 8,
                  padding: 12,
                  alignItems: "center",
                }}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>
                    Send Request
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
