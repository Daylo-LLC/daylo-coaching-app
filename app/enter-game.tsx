import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import moment from "moment";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import PageHeader from "@/components/PageHeader";
import { useAuthStore } from "../src/store/auth";
import { supabase } from "../src/lib/supabase";
import { Tables } from "../src/types/database";
type School = Tables<"schools">;
type Team = Tables<"coach_schools">;

const inputStyle = {
  backgroundColor: "#FFFFFF",
  borderWidth: 1,
  borderColor: "#D1D5DB",
  borderRadius: 8,
  padding: 12,
  fontSize: 15,
  marginBottom: 12,
};

export default function EnterGameScreen() {
  const { profile } = useAuthStore();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [opponent, setOpponent] = useState<School | null>(null);
  const [opponentQuery, setOpponentQuery] = useState("");
  const [side, setSide] = useState<"home" | "away">("home");
  const [schoolResults, setSchoolResults] = useState<School[]>([]);
  const [showNewSchool, setShowNewSchool] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolAddress, setNewSchoolAddress] = useState("");
  const [newSchoolCity, setNewSchoolCity] = useState("");
  const [newSchoolState, setNewSchoolState] = useState("GA");
  const [newSchoolZip, setNewSchoolZip] = useState("");
  const [date, setDate] = useState(moment().format("YYYY-MM-DD"));
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [venue, setVenue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [creatingSchool, setCreatingSchool] = useState(false);

  // Picker state
  const [pickerMode, setPickerMode] = useState<
    "date" | "startTime" | "endTime"
  >("date");
  const [tempDate, setTempDate] = useState(new Date());
  const [tempStartTime, setTempStartTime] = useState(new Date());
  const [tempEndTime, setTempEndTime] = useState(new Date());
  const [showInlinePicker, setShowInlinePicker] = useState(false);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from("coach_schools")
      .select("*")
      .eq("coach_id", profile.id)
      .order("is_primary", { ascending: false })
      .then(({ data }) => {
        const rows = data || [];
        setTeams(rows);
        setSelectedTeam(rows[0] || null);
      });
  }, [profile]);

  useEffect(() => {
    const search = async () => {
      if (opponent || opponentQuery.trim().length < 2) {
        setSchoolResults([]);
        return;
      }
      const { data } = await supabase
        .from("schools")
        .select("*")
        .ilike("name", `%${opponentQuery.trim()}%`)
        .neq("id", profile?.school_id || "")
        .order("name")
        .limit(15);
      setSchoolResults(data || []);
    };
    search();
  }, [opponent, opponentQuery, profile?.school_id]);

  const selectedGender = selectedTeam?.gender || "boys";
  const selectedSport = selectedTeam?.sport || "";
  const canSubmit = Boolean(
    profile?.id &&
    profile.school_id &&
    selectedTeam &&
    opponent &&
    date &&
    timeStart,
  );

  const convertTo24Hour = (time12h: string): string => {
    const [time, modifier] = time12h.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (modifier === "PM" && hours !== 12) hours += 12;
    else if (modifier === "AM" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      setDate(`${year}-${month}-${day}`);
      setTempDate(selectedDate);
    }
    if (Platform.OS === "android") setShowInlinePicker(false);
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
      hours = hours ? hours : 12;
      setTimeStart(`${hours}:${minutes} ${ampm}`);
      setTempStartTime(selectedTime);
    }
    if (Platform.OS === "android") setShowInlinePicker(false);
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
      hours = hours ? hours : 12;
      setTimeEnd(`${hours}:${minutes} ${ampm}`);
      setTempEndTime(selectedTime);
    }
    if (Platform.OS === "android") setShowInlinePicker(false);
  };

  const createSchool = async () => {
    if (!profile || !newSchoolName.trim() || !newSchoolCity.trim()) {
      Alert.alert("Missing information", "School name and city are required.");
      return;
    }
    setCreatingSchool(true);
    const { data: duplicate } = await supabase
      .from("schools")
      .select("*")
      .ilike("name", newSchoolName.trim())
      .ilike("city", newSchoolCity.trim())
      .limit(1);
    if (duplicate?.[0]) {
      setOpponent(duplicate[0]);
      setOpponentQuery(duplicate[0].name);
      setShowNewSchool(false);
      setCreatingSchool(false);
      Alert.alert(
        "Existing school found",
        "We selected the matching school instead of creating a duplicate.",
      );
      return;
    }
    const { data, error } = await supabase
      .from("schools")
      .insert({
        name: newSchoolName.trim(),
        address: newSchoolAddress.trim() || null,
        city: newSchoolCity.trim(),
        state: newSchoolState.trim().toUpperCase() || null,
        zip_code: newSchoolZip.trim() || null,
        created_by: profile.id,
      })
      .select("*")
      .single();
    setCreatingSchool(false);
    if (error) {
      Alert.alert("Could not add school", error.message);
      return;
    }
    setOpponent(data);
    setOpponentQuery(data.name);
    setShowNewSchool(false);
  };

  const saveGame = async () => {
    if (!profile || !profile.school_id || !selectedTeam || !opponent) return;
    setSaving(true);
    const home = side === "home";
    const { error } = await supabase.from("scheduled_games").insert({
      home_school_id: home ? profile.school_id : opponent.id,
      away_school_id: home ? opponent.id : profile.school_id,
      home_coach_id: home ? profile.id : null,
      away_coach_id: home ? null : profile.id,
      entered_by_coach_id: profile.id,
      sport: selectedSport,
      gender: selectedGender,
      date,
      time_start: convertTo24Hour(timeStart),
      time_end: timeEnd ? convertTo24Hour(timeEnd) : null,
      venue: venue.trim() || null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) {
      Alert.alert("Could not save game", error.message);
      return;
    }
    Alert.alert(
      "Game added",
      "The game is on your schedule. The opponent coach can acknowledge it when they join Daylo.",
      [
        {
          text: "Done",
          onPress: () => router.replace("/(drawer)/(tabs)/home"),
        },
      ],
    );
  };

  const teamLabel = useMemo(
    () => (team: Team) =>
      `${team.sport.charAt(0).toUpperCase() + team.sport.slice(1)} · ${team.gender}`,
    [],
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#F9FAFB" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <PageHeader title="Enter Existing Game" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text style={{ color: "#6B7280", marginBottom: 16 }}>
            Add a game that is already scheduled. It will appear immediately,
            even if the opponent coach is not on Daylo yet.
          </Text>
          <Text
            style={{ fontWeight: "700", color: "#374151", marginBottom: 8 }}
          >
            Your team
          </Text>
          {teams.length === 0 ? (
            <Text style={{ color: "#EF4444", marginBottom: 16 }}>
              Add a team in Manage School before entering a game.
            </Text>
          ) : (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 16,
              }}
            >
              {teams.map((team) => (
                <TouchableOpacity
                  key={team.id}
                  onPress={() => setSelectedTeam(team)}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    backgroundColor:
                      selectedTeam?.id === team.id ? "#1B2A4A" : "#FFFFFF",
                    borderWidth: 1,
                    borderColor:
                      selectedTeam?.id === team.id ? "#1B2A4A" : "#D1D5DB",
                  }}
                >
                  <Text
                    style={{
                      color:
                        selectedTeam?.id === team.id ? "#FFFFFF" : "#374151",
                      fontWeight: "600",
                    }}
                  >
                    {teamLabel(team)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Text
            style={{ fontWeight: "700", color: "#374151", marginBottom: 8 }}
          >
            Opponent school
          </Text>
          <TextInput
            style={inputStyle}
            placeholder="Search schools"
            value={opponentQuery}
            onChangeText={(value) => {
              setOpponentQuery(value);
              setOpponent(null);
            }}
          />
          {schoolResults.map((school) => (
            <TouchableOpacity
              key={school.id}
              onPress={() => {
                setOpponent(school);
                setOpponentQuery(school.name);
                setSchoolResults([]);
              }}
              style={{
                backgroundColor: "#FFFFFF",
                padding: 12,
                borderBottomWidth: 1,
                borderBottomColor: "#E5E7EB",
              }}
            >
              <Text style={{ fontWeight: "600", color: "#1B2A4A" }}>
                {school.name}
              </Text>
              <Text style={{ color: "#6B7280", marginTop: 2 }}>
                {[school.city, school.state].filter(Boolean).join(", ")}
              </Text>
            </TouchableOpacity>
          ))}
          {!opponent &&
            opponentQuery.trim().length >= 2 &&
            schoolResults.length === 0 && (
              <TouchableOpacity
                onPress={() => setShowNewSchool(true)}
                style={{ padding: 12, marginBottom: 12 }}
              >
                <Text style={{ color: "#F97316", fontWeight: "700" }}>
                  Add this opponent school
                </Text>
              </TouchableOpacity>
            )}
          {opponent && (
            <Text style={{ color: "#10B981", marginBottom: 12 }}>
              Selected: {opponent.name}
            </Text>
          )}
          {showNewSchool && (
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 10,
                padding: 12,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontWeight: "700",
                  color: "#1B2A4A",
                  marginBottom: 8,
                }}
              >
                New opponent school
              </Text>
              <TextInput
                style={inputStyle}
                placeholder="School name"
                value={newSchoolName}
                onChangeText={setNewSchoolName}
              />
              <TextInput
                style={inputStyle}
                placeholder="Street address"
                value={newSchoolAddress}
                onChangeText={setNewSchoolAddress}
              />
              <TextInput
                style={inputStyle}
                placeholder="City"
                value={newSchoolCity}
                onChangeText={setNewSchoolCity}
              />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  style={[inputStyle, { flex: 1 }]}
                  placeholder="State"
                  value={newSchoolState}
                  onChangeText={setNewSchoolState}
                />
                <TextInput
                  style={[inputStyle, { flex: 1 }]}
                  placeholder="ZIP"
                  value={newSchoolZip}
                  onChangeText={setNewSchoolZip}
                  keyboardType="number-pad"
                />
              </View>
              <TouchableOpacity
                onPress={createSchool}
                disabled={creatingSchool}
                style={{
                  backgroundColor: "#1B2A4A",
                  borderRadius: 8,
                  padding: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                  {creatingSchool ? "Adding..." : "Add School"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <Text
            style={{ fontWeight: "700", color: "#374151", marginBottom: 8 }}
          >
            Your side
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            {(["home", "away"] as const).map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => setSide(option)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: side === option ? "#1B2A4A" : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: side === option ? "#1B2A4A" : "#D1D5DB",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: side === option ? "#FFFFFF" : "#374151",
                    fontWeight: "700",
                  }}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text
            style={{ fontWeight: "700", color: "#374151", marginBottom: 8 }}
          >
            Game details
          </Text>
          <TouchableOpacity
            onPress={() => {
              setPickerMode("date");
              setShowInlinePicker(true);
            }}
            style={inputStyle}
          >
            <Text style={{ fontSize: 15, color: date ? "#000" : "#9CA3AF" }}>
              {date || "Select date"}
            </Text>
          </TouchableOpacity>
          {showInlinePicker && pickerMode === "date" && (
            <View style={{ marginBottom: 12 }}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
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
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                onPress={() => {
                  setPickerMode("startTime");
                  setShowInlinePicker(true);
                }}
                style={[inputStyle, { flex: 1 }]}
              >
                <Text
                  style={{
                    fontSize: 15,
                    color: timeStart ? "#000" : "#9CA3AF",
                  }}
                >
                  {timeStart || "Start time"}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                onPress={() => {
                  setPickerMode("endTime");
                  setShowInlinePicker(true);
                }}
                style={[inputStyle, { flex: 1 }]}
              >
                <Text
                  style={{ fontSize: 15, color: timeEnd ? "#000" : "#9CA3AF" }}
                >
                  {timeEnd || "End time (optional)"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {showInlinePicker && pickerMode === "startTime" && (
            <View style={{ marginBottom: 12 }}>
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
            <View style={{ marginBottom: 12 }}>
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
          <TextInput
            style={inputStyle}
            placeholder="Venue (optional)"
            value={venue}
            onChangeText={setVenue}
          />
          <TextInput
            style={[inputStyle, { minHeight: 80, textAlignVertical: "top" }]}
            placeholder="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
          <TouchableOpacity
            onPress={saveGame}
            disabled={!canSubmit || saving}
            style={{
              backgroundColor: !canSubmit || saving ? "#9CA3AF" : "#F97316",
              borderRadius: 8,
              padding: 16,
              alignItems: "center",
              marginTop: 8,
            }}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text
                style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}
              >
                Add to Schedule
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
