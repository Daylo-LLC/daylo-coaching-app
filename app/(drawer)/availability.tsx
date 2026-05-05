import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  Platform,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useAuthStore } from "../../src/store/auth";
import { supabase } from "../../src/lib/supabase";
import { Tables } from "../../src/types/database";
import moment from "moment";

type Availability = Tables<"availability">;

const SPORTS = ["football", "soccer"] as const;
const PREFERENCES = ["home", "away", "either"] as const;

export default function AvailabilityScreen() {
  const { profile } = useAuthStore();
  const [slots, setSlots] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formSport, setFormSport] = useState<string>("football");
  const [formDate, setFormDate] = useState("");
  const [formTimeStart, setFormTimeStart] = useState("");
  const [formTimeEnd, setFormTimeEnd] = useState("");
  const [formPreference, setFormPreference] = useState<string>("home");
  const [formVenue, setFormVenue] = useState("");
  const [formDistance, setFormDistance] = useState("");
  const [formSchoolId, setFormSchoolId] = useState("");
  const [coachSchools, setCoachSchools] = useState<
    Array<{
      id: string;
      school_id: string;
      sport: string;
      schools: { name: string } | null;
    }>
  >([]);
  const [submitting, setSubmitting] = useState(false);

  // Picker state
  const [pickerMode, setPickerMode] = useState<
    "date" | "startTime" | "endTime"
  >("date");
  const [tempDate, setTempDate] = useState(new Date());
  const [tempStartTime, setTempStartTime] = useState(new Date());
  const [tempEndTime, setTempEndTime] = useState(new Date());
  const [showInlinePicker, setShowInlinePicker] = useState(false);

  const fetchSlots = useCallback(async () => {
    if (!profile) return;
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("availability")
      .select("*")
      .eq("coach_id", profile.id)
      .gte("date", today)
      .order("date", { ascending: true });
    setSlots(data || []);
    setLoading(false);
  }, [profile]);

  const fetchCoachSchools = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("coach_schools")
      .select("id, school_id, sport, schools(name)")
      .eq("coach_id", profile.id);
    setCoachSchools((data as any) || []);
  }, [profile]);

  useEffect(() => {
    fetchSlots();
    fetchCoachSchools();
  }, [fetchSlots, fetchCoachSchools]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSlots();
    setRefreshing(false);
  }, [fetchSlots]);

  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete Slot",
      "Are you sure you want to delete this availability slot?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await supabase.from("availability").delete().eq("id", id);
            fetchSlots();
          },
        },
      ],
    );
  };

  const handleSubmit = async () => {
    if (!profile || !formSchoolId || !formDate || !formTimeStart) {
      Alert.alert(
        "Error",
        "Please fill in all required fields (school, date, start time).",
      );
      return;
    }
    setSubmitting(true);
    const data: any = {
      coach_id: profile.id,
      school_id: formSchoolId,
      sport: formSport,
      date: formDate,
      time_start: convertTo24Hour(formTimeStart),
      home_away_preference: formPreference,
      venue: formVenue || null,
      max_travel_distance_miles: formDistance ? parseInt(formDistance) : null,
      time_end: formTimeEnd ? convertTo24Hour(formTimeEnd) : null,
    };
    const { error } = editingId
      ? await supabase.from("availability").update(data).eq("id", editingId)
      : await supabase.from("availability").insert(data);
    setSubmitting(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setModalVisible(false);
      resetForm();
      fetchSlots();
    }
  };

  const openCreateModal = () => {
    resetForm();
    setEditingId(null);
    setModalVisible(true);
  };

  const openEditModal = (slot: Availability) => {
    setEditingId(slot.id);
    setFormSport(slot.sport);
    setFormSchoolId(slot.school_id);
    setFormDate(slot.date);
    setFormTimeStart(convertTo12Hour(slot.time_start));
    setFormTimeEnd(slot.time_end ? convertTo12Hour(slot.time_end) : "");
    setFormPreference(slot.home_away_preference);
    setFormVenue(slot.venue || "");
    setFormDistance(
      slot.max_travel_distance_miles
        ? String(slot.max_travel_distance_miles)
        : "",
    );
    // sync temp date/time pickers
    const [y, m, d] = slot.date.split("-").map(Number);
    setTempDate(new Date(y, m - 1, d));
    const [sh, sm] = slot.time_start.split(":").map(Number);
    const startDt = new Date();
    startDt.setHours(sh, sm, 0, 0);
    setTempStartTime(startDt);
    if (slot.time_end) {
      const [eh, em] = slot.time_end.split(":").map(Number);
      const endDt = new Date();
      endDt.setHours(eh, em, 0, 0);
      setTempEndTime(endDt);
    }
    setModalVisible(true);
  };

  const resetForm = () => {
    setFormSport("football");
    setFormSchoolId("");
    setFormDate("");
    setFormTimeStart("");
    setFormTimeEnd("");
    setFormPreference("home");
    setFormVenue("");
    setFormDistance("");
    setEditingId(null);
  };

  const convertTo24Hour = (time12h: string): string => {
    const [time, modifier] = time12h.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (modifier === "PM" && hours !== 12) {
      hours += 12;
    } else if (modifier === "AM" && hours === 12) {
      hours = 0;
    }

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  const convertTo12Hour = (time24h: string): string => {
    const [hours, minutes] = time24h.split(":").map(Number);
    const modifier = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, "0")} ${modifier}`;
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      setFormDate(`${year}-${month}-${day}`);
      setTempDate(selectedDate);
    }
    if (Platform.OS === "android") {
      setShowInlinePicker(false);
    }
  };

  const handleStartTimeChange = (
    event: DateTimePickerEvent,
    selectedTime?: Date,
  ) => {
    if (selectedTime) {
      let hours = selectedTime.getHours();
      const minutes = String(selectedTime.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // Convert 0 to 12
      const formattedTime = `${hours}:${minutes} ${ampm}`;
      setFormTimeStart(formattedTime);
      setTempStartTime(selectedTime);
    }
    if (Platform.OS === "android") {
      setShowInlinePicker(false);
    }
  };

  const handleEndTimeChange = (
    event: DateTimePickerEvent,
    selectedTime?: Date,
  ) => {
    if (selectedTime) {
      let hours = selectedTime.getHours();
      const minutes = String(selectedTime.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // Convert 0 to 12
      const formattedTime = `${hours}:${minutes} ${ampm}`;
      setFormTimeEnd(formattedTime);
      setTempEndTime(selectedTime);
    }
    if (Platform.OS === "android") {
      setShowInlinePicker(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1B2A4A" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <FlatList
        data={slots}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1B2A4A"
          />
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 48 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#374151" }}>
              No availability slots
            </Text>
            <Text style={{ fontSize: 14, color: "#9CA3AF", marginTop: 4 }}>
              Add your first slot to let other coaches find you
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              shadowColor: "#000",
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 16, fontWeight: "700", color: "#1B2A4A" }}
                >
                  Date: {moment(item.date).format("MMMM D, YYYY")}
                </Text>
                <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
                  Time: {moment(item.time_start, "HH:mm").format("h:mm A")} –{" "}
                  {moment(item.time_end, "HH:mm").format("h:mm A")}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: item.is_booked ? "#FEE2E2" : "#F0FDF4",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                  alignSelf: "flex-start",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: item.is_booked ? "#EF4444" : "#10B981",
                  }}
                >
                  {item.is_booked ? "Booked" : "Open"}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <View
                style={{
                  backgroundColor: "#EFF6FF",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{ fontSize: 11, color: "#3B82F6", fontWeight: "600" }}
                >
                  Sport:{" "}
                  {item.sport.charAt(0).toUpperCase() + item.sport.slice(1)}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "#FFF7ED",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{ fontSize: 11, color: "#F97316", fontWeight: "600" }}
                >
                  Location:{" "}
                  {item.home_away_preference.charAt(0).toUpperCase() +
                    item.home_away_preference.slice(1)}
                </Text>
              </View>
              {item.venue && (
                <View
                  style={{
                    backgroundColor: "#F3F4F6",
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#6B7280",
                      fontWeight: "600",
                    }}
                  >
                    {item.venue}
                  </Text>
                </View>
              )}
            </View>
            {!item.is_booked && (
              <View
                style={{
                  flexDirection: "row",
                  gap: 16,
                  marginTop: 12,
                  justifyContent: "flex-end",
                }}
              >
                <TouchableOpacity onPress={() => openEditModal(item)}>
                  <Text
                    style={{
                      color: "#1B2A4A",
                      fontWeight: "600",
                      fontSize: 13,
                    }}
                  >
                    Edit
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Text
                    style={{
                      color: "#EF4444",
                      fontWeight: "600",
                      fontSize: 13,
                    }}
                  >
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={openCreateModal}
        style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: "#F97316",
          justifyContent: "center",
          alignItems: "center",
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <Text style={{ fontSize: 28, color: "#FFFFFF", lineHeight: 30 }}>
          +
        </Text>
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#1B2A4A" }}>
              {editingId ? "Edit Availability Slot" : "New Availability Slot"}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                resetForm();
              }}
            >
              <Text style={{ color: "#6B7280", fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#374151",
              marginBottom: 6,
            }}
          >
            Sport *
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            {SPORTS.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setFormSport(s)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: formSport === s ? "#1B2A4A" : "#F3F4F6",
                  flex: 1,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: formSport === s ? "#FFFFFF" : "#374151",
                    fontWeight: "600",
                  }}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#374151",
              marginBottom: 6,
            }}
          >
            School *
          </Text>
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            {coachSchools
              .filter((cs) => cs.sport === formSport)
              .map((cs) => (
                <TouchableOpacity
                  key={cs.id}
                  onPress={() => setFormSchoolId(cs.school_id)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor:
                      formSchoolId === cs.school_id ? "#1B2A4A" : "#F3F4F6",
                  }}
                >
                  <Text
                    style={{
                      color:
                        formSchoolId === cs.school_id ? "#FFFFFF" : "#374151",
                      fontWeight: "600",
                    }}
                  >
                    {cs.schools?.name || "Unknown"}
                  </Text>
                </TouchableOpacity>
              ))}
            {coachSchools.filter((cs) => cs.sport === formSport).length ===
              0 && (
              <Text style={{ color: "#9CA3AF", fontSize: 14 }}>
                No schools linked for this sport. Add one in your profile.
              </Text>
            )}
          </View>

          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#374151",
              marginBottom: 6,
            }}
          >
            Date *
          </Text>
          <TouchableOpacity
            onPress={() => {
              setPickerMode("date");
              setShowInlinePicker(true);
            }}
            style={{
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "#D1D5DB",
              borderRadius: 8,
              padding: 14,
              marginBottom: 16,
            }}
          >
            <Text
              style={{ fontSize: 16, color: formDate ? "#000" : "#9CA3AF" }}
            >
              {formDate || "Select date"}
            </Text>
          </TouchableOpacity>
          {showInlinePicker && pickerMode === "date" && (
            <View style={{ marginBottom: 16 }}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
                minimumDate={new Date()}
                style={{ width: "100%" }}
              />
              {Platform.OS === "ios" && (
                <TouchableOpacity
                  onPress={() => setShowInlinePicker(false)}
                  style={{
                    alignSelf: "flex-end",
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    backgroundColor: "#1B2A4A",
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>
                    Done
                  </Text>
                </TouchableOpacity>
              )}
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
                Start Time *
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setPickerMode("startTime");
                  setShowInlinePicker(true);
                }}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                  borderRadius: 8,
                  padding: 14,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: formTimeStart ? "#000" : "#9CA3AF",
                  }}
                >
                  {formTimeStart || "Select time"}
                </Text>
              </TouchableOpacity>
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
                End Time (optional)
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setPickerMode("endTime");
                  setShowInlinePicker(true);
                }}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                  borderRadius: 8,
                  padding: 14,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: formTimeEnd ? "#000" : "#9CA3AF",
                  }}
                >
                  {formTimeEnd || "Select time"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {showInlinePicker && pickerMode === "startTime" && (
            <View style={{ marginBottom: 16 }}>
              <DateTimePicker
                value={tempStartTime}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleStartTimeChange}
                style={{ width: "100%" }}
              />
              {Platform.OS === "ios" && (
                <TouchableOpacity
                  onPress={() => setShowInlinePicker(false)}
                  style={{
                    alignSelf: "flex-end",
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    backgroundColor: "#1B2A4A",
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>
                    Done
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {showInlinePicker && pickerMode === "endTime" && (
            <View style={{ marginBottom: 16 }}>
              <DateTimePicker
                value={tempEndTime}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleEndTimeChange}
                style={{ width: "100%" }}
              />
              {Platform.OS === "ios" && (
                <TouchableOpacity
                  onPress={() => setShowInlinePicker(false)}
                  style={{
                    alignSelf: "flex-end",
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    backgroundColor: "#1B2A4A",
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>
                    Done
                  </Text>
                </TouchableOpacity>
              )}
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
            Home/Away Preference
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            {PREFERENCES.map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setFormPreference(p)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: formPreference === p ? "#1B2A4A" : "#F3F4F6",
                  flex: 1,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: formPreference === p ? "#FFFFFF" : "#374151",
                    fontWeight: "600",
                  }}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#374151",
              marginBottom: 6,
            }}
          >
            Venue (optional)
          </Text>
          <TextInput
            style={{
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "#D1D5DB",
              borderRadius: 8,
              padding: 14,
              fontSize: 16,
              marginBottom: 4,
            }}
            placeholder="Memorial Stadium"
            placeholderTextColor="#9CA3AF"
            value={formVenue}
            onChangeText={setFormVenue}
          />
          <Text
            style={{
              fontSize: 11,
              color: "#9CA3AF",
              marginBottom: 16,
            }}
          >
            Leave blank if this is at your school — we'll use your school's
            address by default.
          </Text>

          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#374151",
              marginBottom: 6,
            }}
          >
            Max Travel Distance (miles, optional)
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
            placeholder="50"
            placeholderTextColor="#9CA3AF"
            value={formDistance}
            onChangeText={setFormDistance}
            keyboardType="number-pad"
          />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            style={{
              backgroundColor: "#F97316",
              borderRadius: 8,
              padding: 16,
              alignItems: "center",
              opacity: submitting ? 0.7 : 1,
              marginBottom: 32,
            }}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text
                style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}
              >
                {editingId ? "Save Changes" : "Create Slot"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}
