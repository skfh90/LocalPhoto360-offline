import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { COLORS } from "@shared-constants";

interface Props {
  text?: string;
}

const AppLoading: React.FC<Props> = ({ text = "Please wait..." }) => (
  <View style={styles.overlay}>
    <ActivityIndicator size="large" color={COLORS.primary} />
    <Text style={styles.text}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 20, 10, 0.92)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  text: {
    marginTop: 16,
    color: COLORS.white,
    fontSize: 16,
  },
});

export default AppLoading;
