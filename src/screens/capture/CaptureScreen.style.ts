import { ScreenHeight, ScreenWidth } from "@shared-utils/dimensions";
import { ExtendedTheme } from "@react-navigation/native";
import { ViewStyle, StyleSheet, TextStyle } from "react-native";
import {
  rectWid,
  rectHei,
  circleRadius,
  ratio,
  gap,
  gapBottom,
} from "./config";
import fonts from "@fonts";

interface Style {
  container: ViewStyle;
  cameraStyle: ViewStyle;
  cameraViewerStyle: ViewStyle;
  viewerStyle: ViewStyle;
  sphereStyle: ViewStyle;
  whiteCircleAndFrameStyle: ViewStyle;
  gradientImagesStyle: ViewStyle;
  rectOutlineStyle: ViewStyle;
  circleOutlineStyle: ViewStyle;
  targetFillStyle: ViewStyle;
  centerCircleStyle: ViewStyle;
  exitTextStyle: TextStyle;
  exitButtonStyle: ViewStyle;
  holdFrameStyle: ViewStyle;
  bottomFrameStyle: ViewStyle;
  holdTextStyle: TextStyle;
  bottomTextStyle: TextStyle;
  beginButtonStyle: ViewStyle;
  beginTextStyle: TextStyle;
  controlsModalRoot: ViewStyle;
  guidePackStyle: ViewStyle;
  targetPackStyle: ViewStyle;
}

export default (theme: ExtendedTheme) => {
  const { colors } = theme;

  return StyleSheet.create<Style>({
    container: {
      flex: 1,
      backgroundColor: "#00140A",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      height: "100%",
      position: "relative",
    },
    cameraViewerStyle: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 0,
      elevation: 0,
      overflow: "hidden",
      backgroundColor: "#000",
    },
    cameraStyle: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 0,
      elevation: 0,
    },
    viewerStyle: {
      // Must sit above Vision Camera's native SurfaceView on Android (zIndex alone is not enough).
      zIndex: 100,
      elevation: 24,
      flex: 1,
      height: "100%",
      width: "100%",
      alignItems: "center",
      // Fully transparent views can drop touches on Android; keep a tiny alpha.
      backgroundColor: "rgba(0,0,0,0.01)",
      position: "absolute",
    },

    whiteCircleAndFrameStyle: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      position: "absolute",
      height: "100%",
      backgroundColor: "transparent", //.content-camera-preview
      zIndex: 999,
    },
    sphereStyle: {},

    gradientImagesStyle: {
      flex: 1,
      justifyContent: "space-around",
      position: "absolute",
      zIndex: 999,
    },
    rectOutlineStyle: {
      position: "absolute",
      top: "auto",
      left: "auto",
      width: rectWid * ratio,
      height: rectHei * ratio,
      borderColor: "white",
      borderWidth: 2 * ratio,
      opacity: 100,
      // zIndex: 999,
    },
    circleOutlineStyle: {
      position: "absolute",
      top: "auto",
      left: "auto",
      width: rectHei * ratio,
      height: rectHei * ratio,
      borderColor: "white",
      borderWidth: 2 * ratio,
      borderRadius: rectHei * ratio * 0.5,
      opacity: 100,
      // zIndex: 999,
    },

    targetFillStyle: {
      position: "absolute",
      top: "auto",
      left: "auto",
      opacity: 1,
      // zIndex: 999,
    },
    centerCircleStyle: {
      position: "absolute",
      top: "auto",
      left: "auto",
      width: circleRadius * ratio,
      height: circleRadius * ratio,
      borderWidth: 0,
      backgroundColor: "#ffffff",
      opacity: 1,
      borderRadius: (circleRadius * ratio) / 2,
      display: "flex",
      // zIndex: 999,
      color: "#000",
      fontSize: 20 * ratio,
      alignItems: "center",
      justifyContent: "center",
    },

    exitTextStyle: {
      position: "absolute",
      top: 25 * ratio,
      right: 25 * ratio,
      zIndex: 9998,
      color: "#FFF",
      textAlign: "center",
      fontFamily: "Azo Sans",
      fontSize: 16 * ratio,
      fontWeight: "600",
      letterSpacing: 0.8 * ratio,
      textShadowColor: "rgba(0, 0, 0, 0.8)",
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    },
    exitButtonStyle: {
      position: "absolute",
      top: 10 * ratio,
      right: 10 * ratio,
      zIndex: 1000001,
      elevation: 110,
      color: "FFF",
      textAlign: "center",
      fontFamily: "Azo Sans",
      fontSize: 16 * ratio,
      fontWeight: "600",
      letterSpacing: 0.8 * ratio,
      textShadowColor: "rgba(0, 0, 0, 0.8)",
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    },
    holdFrameStyle: {
      position: "absolute",

      top: ScreenHeight / 2 + (rectHei * ratio) / 2 + gap,
      alignItems: "center",
    },
    bottomFrameStyle: {
      position: "absolute",
      zIndex: 1000,
      top: ScreenHeight / 2 + (rectHei * ratio) / 2 + gapBottom,
      alignItems: "center",
    },
    holdTextStyle: {
      color: "#FFF",
      fontFamily: "Azo Sans",
      fontSize: 20 * ratio,
      fontWeight: "400",
      lineHeight: 30 * ratio,
      letterSpacing: 1 * ratio,
      zIndex: 1000,
    },
    bottomTextStyle: {
      color: "#FFF",
      fontFamily: fonts.azosans.bold,
      fontSize: 20 * ratio,
      lineHeight: 30 * ratio,
      letterSpacing: 1.1 * ratio,
      fontWeight: "700",
    },
    beginButtonStyle: {
      position: "absolute",
      bottom: 48 * ratio,
      alignSelf: "center",
      left: (ScreenWidth - 200 * ratio) / 2,
      backgroundColor: "rgba(0,0,0,0.75)",
      borderRadius: 29 * ratio,
      width: 200 * ratio,
      height: 58 * ratio,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000000,
      elevation: 100,
    },
    controlsModalRoot: {
      flex: 1,
      backgroundColor: "transparent",
    },
    beginTextStyle: {
      color: "#FFF",
      fontFamily: "Azo Sans",
      fontSize: 22 * ratio,
      letterSpacing: 2.64 * ratio,
      fontStyle: "normal",
      fontWeight: "600",
    },
    // rotateFrameStyle: {

    // },
    guidePackStyle: {
      position: "absolute",
      bottom: 20, //20
      alignItems: "stretch",
      justifyContent: "center",
      zIndex: 999,
    },
    targetPackStyle: {
      position: "absolute",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      height: "100%",
      transform: [{ perspective: 300 }],
      zIndex: 110,
    },
  });
};
