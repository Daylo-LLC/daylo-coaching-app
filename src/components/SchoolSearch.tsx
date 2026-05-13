import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import { supabase } from "../lib/supabase";

interface School {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
}

interface SchoolSearchProps {
  onSelect: (school: { id: string; name: string }) => void;
  selectedSchool: { id: string; name: string } | null;
}

export default function SchoolSearch({
  onSelect,
  selectedSchool,
}: SchoolSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchSchools = useCallback(async (text: string) => {
    if (text.length < 4) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("schools")
      .select("id, name, city, district")
      .or(`name.ilike.%${text}%,city.ilike.%${text}%,district.ilike.%${text}%`)
      .order("name", { ascending: true })
      .limit(20);

    setLoading(false);
    if (!error && data) {
      setResults(data);
      setShowDropdown(true);
    }
  }, []);

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (selectedSchool) {
      onSelect(null as any);
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchSchools(text);
    }, 300);
  };

  const handleSelect = (school: School) => {
    setQuery(school.name);
    setShowDropdown(false);
    setResults([]);
    onSelect({ id: school.id, name: school.name });
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    onSelect(null as any);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>School</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, selectedSchool ? styles.inputSelected : null]}
          placeholder="Search by school name, city, or district..."
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={handleChangeText}
          autoCapitalize="words"
          autoCorrect={false}
        />
        {(query.length > 0 || selectedSchool) && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      {selectedSchool && (
        <Text style={styles.selectedLabel}>✓ {selectedSchool.name}</Text>
      )}
      {loading && (
        <ActivityIndicator
          size="small"
          color="#F97316"
          style={{ marginTop: 8 }}
        />
      )}
      {showDropdown && !selectedSchool && results.length > 0 && (
        <View style={styles.dropdown}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={{ maxHeight: 200 }}
          >
            {results.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleSelect(item)}
                style={styles.dropdownItem}
              >
                <Text style={styles.schoolName}>{item.name}</Text>
                <Text style={styles.schoolMeta}>
                  {[item.city, item.district].filter(Boolean).join(" • ")}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      {showDropdown &&
        !selectedSchool &&
        !loading &&
        results.length === 0 &&
        query.length >= 4 && (
          <View style={styles.dropdown}>
            <Text style={styles.noResults}>No schools found</Text>
          </View>
        )}
      {!selectedSchool && query.length > 0 && query.length < 4 && (
        <Text style={styles.hint}>Type at least 4 characters to search</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    zIndex: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  inputRow: {
    position: "relative",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 14,
    paddingRight: 40,
    fontSize: 16,
  },
  inputSelected: {
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
  clearButton: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  clearText: {
    fontSize: 16,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  selectedLabel: {
    marginTop: 6,
    fontSize: 13,
    color: "#10B981",
    fontWeight: "600",
  },
  dropdown: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    marginTop: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  schoolName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1B2A4A",
  },
  schoolMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  noResults: {
    padding: 16,
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 14,
  },
  hint: {
    marginTop: 4,
    fontSize: 12,
    color: "#9CA3AF",
  },
});
