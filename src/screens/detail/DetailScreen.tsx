import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import DocumentPicker from "react-native-document-picker";
import ImageResizer from "@bam.tech/react-native-image-resizer";
import RNFS from "react-native-fs";
import { BSON } from "realm";
import { useRealm } from "@realm/react";
import { COLORS, SCREENS } from "@shared-constants";
import CustomButton from "@shared-components/CustomButton";
import {
  copyFile,
  existFileInDirectory,
  getDirectoryPath,
  getPanoramaFilePath,
  getPanoramaPath,
  listCaptureImages,
  stitchPanorama,
} from "@shared-utils";
import { PhotoCapture } from "@models/PhotoCapture";
import type { RootStackParamList } from "../../navigation/types";
import AppLoading from "@shared-components/AppLoading";

type Props = NativeStackScreenProps<RootStackParamList, typeof SCREENS.DETAIL>;

const DetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const realm = useRealm();
  const capture = useMemo(() => {
    try {
      const id = new BSON.ObjectId(route.params.captureId);
      return realm.objectForPrimaryKey(PhotoCapture, id);
    } catch {
      return null;
    }
  }, [realm, route.params.captureId]);

  const [shots, setShots] = useState<string[]>([]);
  const [hasPanorama, setHasPanorama] = useState(false);
  const [stitching, setStitching] = useState(false);

  const refreshPanoramaFlag = () => {
    if (!capture) return;
    existFileInDirectory(
      `${getDirectoryPath()}/${capture.folder}`,
      capture.panoramaFile ?? "photo360.jpg",
    ).then(setHasPanorama);
  };

  useEffect(() => {
    if (!capture) return;
    listCaptureImages(capture.folder).then(setShots);
    refreshPanoramaFlag();
  }, [capture]);

  if (!capture) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>Capture not found</Text>
        <CustomButton
          title="Back"
          onPress={() => navigation.goBack()}
          buttonStyle={{ margin: 20 }}
        />
      </SafeAreaView>
    );
  }

  const panoramaName = capture.panoramaFile ?? "photo360.jpg";

  const openViewer = () => {
    navigation.navigate(SCREENS.VIEWER, {
      panoramaPath: getPanoramaPath(capture.folder, panoramaName),
      title: capture.name,
    });
  };

  const runStitch = async () => {
    try {
      setStitching(true);
      const fov = parseFloat(capture.fov);
      await stitchPanorama({
        folder: capture.folder,
        fovOverride: Number.isFinite(fov) && fov > 0 ? fov : undefined,
      });
      realm.write(() => {
        capture.status = "ready";
        capture.panoramaFile = "photo360.jpg";
      });
      setHasPanorama(true);
      Alert.alert("360 ready", "Tap View 360 to look around.");
    } catch (error: any) {
      Alert.alert("Stitch failed", String(error?.message ?? error));
    } finally {
      setStitching(false);
    }
  };

  const importPanorama = async () => {
    try {
      const file = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.images],
      });
      if (!file.uri) return;

      const dest = getPanoramaFilePath(capture.folder, "photo360.jpg");
      const source = file.uri.replace("file://", "");
      await copyFile(source, dest);

      const thumb = await ImageResizer.createResizedImage(
        source,
        400,
        200,
        "JPEG",
        85,
      );
      await copyFile(
        thumb.uri.replace("file://", ""),
        `${getDirectoryPath()}/${capture.folder}/thumbnail.jpg`,
      );

      realm.write(() => {
        capture.status = "ready";
        capture.panoramaFile = "photo360.jpg";
      });
      setHasPanorama(true);
      Alert.alert("Panorama added", "You can now view this capture in 360.");
    } catch (error: any) {
      if (DocumentPicker.isCancel(error)) return;
      Alert.alert("Import failed", String(error?.message ?? error));
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {capture.name}
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLine}>{capture.shotCount} photos captured</Text>
        <Text style={styles.infoLine}>FOV: {capture.fov}</Text>
        <Text style={styles.infoLine}>
          Status: {hasPanorama ? "360 ready" : "Waiting for stitch / import"}
        </Text>
        <Text style={styles.folder}>Folder: {capture.folder}</Text>
      </View>

      <View style={styles.actions}>
        <CustomButton
          title={hasPanorama ? "View 360" : "View 360 (stitch first)"}
          onPress={openViewer}
          disabled={!hasPanorama}
          buttonStyle={{ flex: 1 }}
        />
        {!hasPanorama && (
          <CustomButton
            title="Stitch 360"
            onPress={runStitch}
            buttonStyle={{ flex: 1 }}
          />
        )}
        <CustomButton
          title="Import 360"
          onPress={importPanorama}
          buttonColor="#2E4F3D"
          buttonStyle={{ flex: 1 }}
        />
      </View>

      <Text style={styles.sectionTitle}>Captured frames</Text>
      <FlatList
        data={shots}
        keyExtractor={(item) => item}
        numColumns={3}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <Image source={{ uri: `file://${item}` }} style={styles.shot} />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No image files found in this folder.</Text>
        }
      />

      {stitching && <AppLoading text="Creating 360 view..." />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F7F5" },
  header: { padding: 20, paddingBottom: 8 },
  back: { color: COLORS.primary, marginBottom: 8, fontWeight: "600" },
  title: { fontSize: 24, fontWeight: "700", color: COLORS.text },
  infoCard: {
    marginHorizontal: 20,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
  },
  infoLine: { color: COLORS.text, marginBottom: 6 },
  folder: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    paddingHorizontal: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  grid: { paddingHorizontal: 14, paddingBottom: 24 },
  shot: {
    width: "30%",
    aspectRatio: 1,
    margin: "1.5%",
    borderRadius: 8,
    backgroundColor: "#DDE5DF",
  },
  empty: { padding: 20, color: COLORS.muted, textAlign: "center" },
});

export default DetailScreen;
