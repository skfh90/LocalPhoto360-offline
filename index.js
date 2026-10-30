import "react-native-get-random-values";
import { Buffer } from "buffer";
import "react-native-gesture-handler";
import { AppRegistry } from "react-native";
import App from "./App";
import { name as appName } from "./app.json";

// jpeg-js / stitch need Node Buffer in React Native.
global.Buffer = global.Buffer || Buffer;

AppRegistry.registerComponent(appName, () => App);
