import { MenuIcon, Bell } from "lucide-react-native";
import {
  Platform,
  StatusBar,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "expo-router";
import { useRouter } from "expo-router";
import { DrawerActions } from "@react-navigation/native";
import { useNotificationStore } from "../store/notifications";

const Header = ({ title }: { title: string }) => {
  const navigation = useNavigation();
  const router = useRouter();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#1b2a4a" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        >
          <MenuIcon color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <TouchableOpacity
          onPress={() => router.push("/(drawer)/notifications")}
        >
          <View>
            <Bell size={24} color="white" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </>
  );
};

export default Header;

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
  badge: {
    position: "absolute" as const,
    top: -6,
    right: -8,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700" as const,
  },
});
