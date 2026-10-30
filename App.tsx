import React, { useEffect } from "react";
import { LogBox, StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RealmProvider } from "@realm/react";
import Navigation from "./src/navigation";
import { schemas } from "./src/models/PhotoCapture";

LogBox.ignoreLogs(["new NativeEventEmitter"]);

const App = () => {
  useEffect(() => {
    StatusBar.setHidden(true);
    return () => StatusBar.setHidden(false);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <RealmProvider schema={schemas} deleteRealmIfMigrationNeeded>
          <Navigation />
        </RealmProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
