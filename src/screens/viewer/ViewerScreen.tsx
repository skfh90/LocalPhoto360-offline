import React, { useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { WebView } from "react-native-webview";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import RNFS from "react-native-fs";
import Orientation from "react-native-orientation-locker";
import { SCREENS } from "@shared-constants";
import EnlargeButton, { EnlargeButtonRef } from "@shared-components/EnlargeButton";
import type { RootStackParamList } from "../../navigation/types";
import AppLoading from "@shared-components/AppLoading";

type Props = NativeStackScreenProps<RootStackParamList, typeof SCREENS.VIEWER>;

const ViewerScreen: React.FC<Props> = ({ navigation, route }) => {
  const webviewRef = useRef<WebView>(null);
  const playButtonRef = useRef<EnlargeButtonRef>(null);
  const photoButtonRef = useRef<EnlargeButtonRef>(null);
  const [showAppLoading, setShowAppLoading] = useState(true);

  useEffect(() => {
    Orientation.unlockAllOrientations();
    return () => {
      Orientation.lockToPortrait();
    };
  }, []);

  const filePath = route.params.panoramaPath.replace(/^file:\/\//, "");

  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={webviewRef}
        source={{
          uri: "file:///android_asset/viewer/viewer.html",
          baseUrl: "file:///android_asset/viewer",
        }}
        style={{ flex: 1 }}
        originWhitelist={["*"]}
        allowFileAccess
        allowUniversalAccessFromFileURLs
        onLoadEnd={() => {
          const sendBase64 = (base64: string) => {
            const base64Data = base64.startsWith("data:")
              ? base64
              : `data:image/jpeg;base64,${base64}`;
            webviewRef.current?.postMessage(base64Data);
          };

          RNFS.readFile(filePath, "base64")
            .then(sendBase64)
            .catch(async (err) => {
              // Offline fallback: load bundled sample straight from APK assets.
              if (Platform.OS === "android" && filePath.includes("sample_demo")) {
                try {
                  const fromAssets = await RNFS.readFileAssets(
                    "sample/sample360.jpg",
                    "base64",
                  );
                  sendBase64(fromAssets);
                  return;
                } catch (assetErr) {
                  console.log("viewer asset fallback error", assetErr);
                }
              }
              console.log("viewer read error", err);
            });
        }}
        onMessage={(e) => {
          try {
            const jsonData = JSON.parse(e.nativeEvent.data);
            if (jsonData.status === "Loading End") {
              setTimeout(() => {
                webviewRef.current?.postMessage("autorotate");
                setShowAppLoading(false);
              }, 400);
            } else if (jsonData.status === "autorotate") {
              playButtonRef.current?.toggle(jsonData.data);
            } else if (jsonData.status === "gyroscope") {
              photoButtonRef.current?.toggle(jsonData.data);
            }
          } catch {
            // ignore non-json messages
          }
        }}
      />

      <View style={{ position: "absolute", bottom: 30, left: 15 }}>
        <EnlargeButton
          ref={photoButtonRef}
          leftMargin={10}
          topMargin={10}
          butWidth={80}
          isToggleButton
          normalPath={require("../../assets/photosphere_normal.png")}
          hoverPath={require("../../assets/photosphere_hover.png")}
          onPress={() => webviewRef.current?.postMessage("gyroscope")}
        />
      </View>

      <View style={{ position: "absolute", bottom: 35, left: 80 }}>
        <EnlargeButton
          ref={playButtonRef}
          leftMargin={10}
          topMargin={10}
          butWidth={80}
          isToggleButton
          normalPath={require("../../assets/play_normal.png")}
          hoverPath={require("../../assets/play_hover.png")}
          onPress={() => webviewRef.current?.postMessage("autorotate")}
        />
      </View>

      <View style={{ position: "absolute", bottom: 35, right: 20 }}>
        <EnlargeButton
          leftMargin={10}
          topMargin={10}
          butWidth={70}
          isToggleButton
          normalPath={require("../../assets/close_normal.png")}
          hoverPath={require("../../assets/close_hover.png")}
          onPress={() => navigation.goBack()}
        />
      </View>

      {showAppLoading && <AppLoading text="Loading 360 view..." />}
    </View>
  );
};

export default ViewerScreen;
