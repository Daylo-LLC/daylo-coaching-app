import { MenuIcon } from "lucide-react-native";
import {
  Platform,
  StatusBar,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "expo-router";
import { DrawerActions } from "@react-navigation/native";

const Header = ({ title }: { title: string }) => {
  const navigation = useNavigation();

  return (
    <>
    <StatusBar barStyle="light-content" backgroundColor="#1b2a4a" />
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
        <MenuIcon color="white" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 24 }} />
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
});
