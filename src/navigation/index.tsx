import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SCREENS, COLORS } from "@shared-constants";
import HomeScreen from "@screens/home/HomeScreen";
import GuideScreen from "@screens/guide/GuideScreen";
import CaptureScreen from "@screens/capture/CaptureScreen";
import DetailScreen from "@screens/detail/DetailScreen";
import ViewerScreen from "@screens/viewer/ViewerScreen";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background,
    card: COLORS.background,
    text: COLORS.white,
    primary: COLORS.primary,
  },
};

const Navigation = () => (
  <NavigationContainer theme={theme}>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={SCREENS.HOME} component={HomeScreen} />
      <Stack.Screen name={SCREENS.GUIDE} component={GuideScreen} />
      <Stack.Screen name={SCREENS.CAPTURE} component={CaptureScreen} />
      <Stack.Screen name={SCREENS.DETAIL} component={DetailScreen} />
      <Stack.Screen name={SCREENS.VIEWER} component={ViewerScreen} />
    </Stack.Navigator>
  </NavigationContainer>
);

export default Navigation;
