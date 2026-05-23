import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Drawer } from "expo-router/drawer";
import { StyleSheet } from "react-native";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { useAuthStore } from "../../src/store/auth";
import { useRouter, usePathname } from "expo-router";
import Header from "@/components/Header";

function CustomDrawerContent({ navigation }: { navigation: any }) {
  const { profile, signOut } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname.includes(path);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={
            profile?.avatar_url
              ? { uri: profile.avatar_url }
              : require("../../assets/logo.png")
          }
          style={{ width: 150, height: 150, borderRadius: 75 }}
        />
        {profile && (
          <Text style={styles.headerTitle}>
            {profile.first_name} {profile.last_name}
          </Text>
        )}
      </View>

      <View style={{ gap: 4, padding: 16 }}>
        <TouchableOpacity
          onPress={() => router.push("/(drawer)/(tabs)/home")}
          style={[
            {
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 8,
            },
            isActive("home") && {
              backgroundColor: "#F97316",
            },
          ]}
        >
          <Text
            style={[
              { fontSize: 16, fontWeight: "500" },
              isActive("home") ? { color: "#FFFFFF" } : { color: "#1B2A4A" },
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/(drawer)/manage-school")}
          style={[
            {
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 8,
            },
            isActive("manage-school") && {
              backgroundColor: "#F97316",
            },
          ]}
        >
          <Text
            style={[
              { fontSize: 16, fontWeight: "500" },
              isActive("manage-school")
                ? { color: "#FFFFFF" }
                : { color: "#1B2A4A" },
            ]}
          >
            Manage School
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/(drawer)/availability")}
          style={[
            {
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 8,
            },
            isActive("availability") && {
              backgroundColor: "#F97316",
            },
          ]}
        >
          <Text
            style={[
              { fontSize: 16, fontWeight: "500" },
              isActive("availability")
                ? { color: "#FFFFFF" }
                : { color: "#1B2A4A" },
            ]}
          >
            Availability
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/(drawer)/invitations")}
          style={[
            {
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 8,
            },
            isActive("invitations") && {
              backgroundColor: "#F97316",
            },
          ]}
        >
          <Text
            style={[
              { fontSize: 16, fontWeight: "500" },
              isActive("invitations")
                ? { color: "#FFFFFF" }
                : { color: "#1B2A4A" },
            ]}
          >
            Invite Coaches
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/(drawer)/profile")}
          style={[
            {
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 8,
            },
            isActive("profile") && {
              backgroundColor: "#F97316",
            },
          ]}
        >
          <Text
            style={[
              { fontSize: 16, fontWeight: "500" },
              isActive("profile") ? { color: "#FFFFFF" } : { color: "#1B2A4A" },
            ]}
          >
            Profile
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={{
          marginTop: "auto",
          borderTopWidth: 1,
          borderTopColor: "#E5E7EB",
          paddingVertical: 20,
        }}
      >
        <TouchableOpacity
          onPress={handleSignOut}
          style={{
            paddingVertical: 14,
            paddingHorizontal: 20,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#EF4444", fontWeight: "600", fontSize: 16 }}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer drawerContent={CustomDrawerContent}>
        <Drawer.Screen
          name="(tabs)" // Points to the (tabs) folder
          options={{
            drawerLabel: "Home",
            title: "Overview",
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name="manage-school"
          options={{
            drawerLabel: "Manage School",
            title: "Manage School",
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name="availability"
          options={{
            drawerLabel: "Availability",
            title: "My Availability",
            header: () => <Header title="My Availability" />,
          }}
        />
        <Drawer.Screen
          name="invitations"
          options={{
            drawerLabel: "Invite Coaches",
            title: "Invite Coaches",
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name="profile"
          options={{
            drawerLabel: "Profile",
            title: "My Profile",
            headerShown: false,
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // padding: 24,
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingTop: 60,
    backgroundColor: "#1B2A4A",
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    paddingTop: 20,
    fontSize: 22,
    fontWeight: "800",
    color: "#CCCCCC",
  },
  headerSubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  menuSection: {
    gap: 4,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: "500",
  },
  activeMenuItem: {
    backgroundColor: "#F97316",
  },
  activeMenuItemText: {
    color: "#FFFFFF",
  },
  inactiveMenuItemText: {
    color: "#1B2A4A",
  },
  footer: {
    marginTop: "auto",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 24,
  },
  footerButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  footerButtonText: {
    color: "#EF4444",
    fontWeight: "600",
    fontSize: 16,
  },
});
