import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { COLORS, SCREENS } from "@shared-constants";
import CustomButton from "@shared-components/CustomButton";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, typeof SCREENS.GUIDE>;

const STEPS = [
  {
    title: "Find good light",
    body: "Stand in a well-lit area. Avoid strong backlight and deep shadows.",
  },
  {
    title: "Keep your distance",
    body: "Hold the phone about 6 inches from your chest and stay still while capturing.",
  },
  {
    title: "Follow the green targets",
    body: "Move slowly to align each green target. The app captures automatically when you hold steady.",
  },
];

const GuideScreen: React.FC<Props> = ({ navigation }) => {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.stepLabel}>
          Step {step + 1} of {STEPS.length}
        </Text>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.body}>{current.body}</Text>
      </View>
      <View style={styles.actions}>
        <CustomButton
          title={step === 0 ? "Skip" : "Back"}
          onPress={() => {
            if (step === 0) navigation.navigate(SCREENS.CAPTURE);
            else setStep((s) => s - 1);
          }}
          buttonColor="transparent"
          titleColor={COLORS.white}
          buttonStyle={styles.secondary}
        />
        <CustomButton
          title={step === STEPS.length - 1 ? "Start capture" : "Next"}
          onPress={() => {
            if (step < STEPS.length - 1) setStep((s) => s + 1);
            else navigation.navigate(SCREENS.CAPTURE);
          }}
          buttonStyle={styles.primary}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, padding: 28, justifyContent: "center" },
  stepLabel: { color: COLORS.primary, fontWeight: "600", marginBottom: 12 },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 16,
  },
  body: { fontSize: 18, lineHeight: 28, color: "rgba(255,255,255,0.85)" },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 24,
    gap: 12,
  },
  secondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.white,
  },
  primary: { flex: 1 },
});

export default GuideScreen;
