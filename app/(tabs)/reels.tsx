import ReelsPlayer from "@/components/ReelsPlayer";
import { StyleSheet, View } from "react-native";

export default function ReelsScreen() {
  return (
    <View style={styles.container}>
      <ReelsPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
});