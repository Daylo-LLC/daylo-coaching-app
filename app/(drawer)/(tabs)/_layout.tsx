import { Tabs } from "expo-router";
import { TouchableOpacity } from "react-native";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import {
  Home,
  Search,
  Calendar,
  Inbox,
  MessageSquare,
  Menu,
} from "lucide-react-native";
import Header from "@/components/Header";

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, any> = {
    home: Home,
    search: Search,
    availability: Calendar,
    calendar: Calendar,
    requests: Inbox,
    messages: MessageSquare,
  };
  const Icon = icons[name] || Home;
  return <Icon size={26} color={focused ? "#F97316" : "#9CA3AF"} />;
}

export default function TabsLayout() {
  const navigation = useNavigation();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#1B2A4A", height: 120 },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "bold" },
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={{ marginLeft: 16 }}
          >
            <Menu size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ),
        tabBarActiveTintColor: "#F97316",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E5E7EB",
          paddingTop: 8,
          height: 75,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home" focused={focused} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Find Games",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="search" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="calendar" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: "Requests",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="requests" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="messages" focused={focused} />
          ),
          header: () => <Header title="Messages" />,
        }}
      />
    </Tabs>
  );
}
