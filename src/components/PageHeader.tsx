import { ChevronLeft } from "lucide-react-native";
import {
  Platform,
  StatusBar,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";

const PageHeader = ({ title, onBack }: { title: string; onBack?: () => void }) => {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack || (() => router.back())}>
        <ChevronLeft color="white" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 24 }} />
    </View>
  );
};

export default PageHeader;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    // Cover the Android status bar area
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 12 : 60,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#1b2a4a",
    backgroundColor: "#1b2a4a",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "white",
    fontFamily: "SoraRegular",
  },
});
