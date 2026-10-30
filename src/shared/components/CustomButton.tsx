import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  StyleProp,
} from "react-native";
import { COLORS } from "@shared-constants";

interface Props {
  title: string;
  onPress: () => void;
  buttonColor?: string;
  titleColor?: string;
  buttonStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

const CustomButton: React.FC<Props> = ({
  title,
  onPress,
  buttonColor = COLORS.primary,
  titleColor = COLORS.text,
  buttonStyle,
  disabled,
}) => (
  <Pressable
    disabled={disabled}
    onPress={onPress}
    style={({ pressed }) => [
      styles.button,
      { backgroundColor: buttonColor, opacity: pressed || disabled ? 0.85 : 1 },
      buttonStyle,
    ]}
  >
    <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
});

export default CustomButton;
