import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { COLORS, SCREENS } from "@shared-constants";
import { usePhotoStore } from "@hooks/usePhotoStore";
import {
  getPanoramaPath,
  getThumbnailUri,
  isSampleCapture,
} from "@shared-utils";
import type { RootStackParamList } from "../../navigation/types";
import CustomButton from "@shared-components/CustomButton";
import { PhotoCapture } from "@models/PhotoCapture";

type Props = NativeStackScreenProps<RootStackParamList, typeof SCREENS.HOME>;

const HomeScreen: React.FC<Props> = ({ navigation, route }) => {
  const { captures, addCapture, deleteCapture, ensureSampleCapture } =
    usePhotoStore();
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [captureName, setCaptureName] = useState("");
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    folder: string;
    shotCount: number;
    fov: string;
    defaultName: string;
    status?: string;
    panoramaFile?: string;
  }>();

  useEffect(() => {
    let cancelled = false;
    ensureSampleCapture()
      .then(() => {
        if (!cancelled) setSampleError(null);
      })
      .catch((err) => {
        console.log("Failed to seed sample capture:", err);
        if (!cancelled) setSampleError(String(err?.message ?? err));
      });
    return () => {
      cancelled = true;
    };
  }, [ensureSampleCapture]);

  useEffect(() => {
    const pendingCapture = route.params?.pendingCapture;
    if (!pendingCapture) return;

    setPending(pendingCapture);
    setCaptureName(pendingCapture.defaultName);
    setNameModalVisible(true);
    navigation.setParams({ pendingCapture: undefined });
  }, [route.params?.pendingCapture]);

  const savePendingCapture = () => {
    if (!pending) return;
    const trimmed = captureName.trim();
    if (!trimmed) {
      Alert.alert("Name required", "Please enter a name for this capture.");
      return;
    }
    addCapture({
      name: trimmed,
      folder: pending.folder,
      shotCount: pending.shotCount,
      fov: pending.fov,
      status: pending.status ?? "stitch_pending",
      panoramaFile: pending.panoramaFile,
    });
    setNameModalVisible(false);
    setPending(undefined);
    setCaptureName("");
  };

  const openCapture = (item: PhotoCapture) => {
    // Ready panoramas (including the bundled sample) open the 360 viewer.
    if (item.status === "ready") {
      const fileName = item.panoramaFile ?? "photo360.jpg";
      navigation.navigate(SCREENS.VIEWER, {
        panoramaPath: getPanoramaPath(item.folder, fileName),
        title: item.name,
      });
      return;
    }
    navigation.navigate(SCREENS.DETAIL, { captureId: item._id.toHexString() });
  };

  const confirmDelete = (item: PhotoCapture) => {
    if (isSampleCapture(item.folder)) {
      Alert.alert("Sample capture", "The sample 360 photo can't be deleted.");
      return;
    }
    Alert.alert("Delete capture?", item.name, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteCapture(item),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Local 360</Text>
          <Text style={styles.subtitle}>Offline capture & storage</Text>
        </View>
        <CustomButton
          title="+ New"
          onPress={() => navigation.navigate(SCREENS.GUIDE)}
          buttonStyle={styles.newButton}
        />
      </View>

      <FlatList
        data={captures}
        keyExtractor={(item) => String(item._id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {sampleError ? "Sample unavailable" : "Loading sample…"}
            </Text>
            <Text style={styles.emptyText}>
              {sampleError
                ? "Sample assets need a native rebuild (run-android). Capture still works fully offline — tap New."
                : "A sample 360 photo will appear here. Everything stays on this device — no internet needed."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => openCapture(item)}
            onLongPress={() => confirmDelete(item)}
          >
            <Image
              source={{ uri: getThumbnailUri(item.folder) }}
              style={styles.thumb}
            />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.cardMeta}>
                {isSampleCapture(item.folder)
                  ? "Sample · tap to view 360"
                  : item.status === "ready"
                    ? "360 ready · tap to view"
                    : `${item.shotCount} shots · stitch pending`}
              </Text>
              <Text style={styles.cardDate}>
                {item.createdAt.toLocaleString()}
              </Text>
            </View>
          </Pressable>
        )}
      />

      <Modal visible={nameModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Name your capture</Text>
            <TextInput
              value={captureName}
              onChangeText={setCaptureName}
              placeholder="Living room"
              placeholderTextColor={COLORS.muted}
              style={styles.input}
            />
            <CustomButton title="Save" onPress={savePendingCapture} />
            <Pressable
              onPress={() => {
                setNameModalVisible(false);
                setPending(undefined);
              }}
              style={styles.cancel}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F7F5" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 28, fontWeight: "700", color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.muted, marginTop: 4 },
  newButton: { paddingHorizontal: 18, paddingVertical: 10 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  empty: { padding: 32, alignItems: "center" },
  emptyTitle: { fontSize: 20, fontWeight: "600", color: COLORS.text },
  emptyText: {
    marginTop: 8,
    textAlign: "center",
    color: COLORS.muted,
    lineHeight: 22,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 14,
    marginBottom: 12,
    overflow: "hidden",
    elevation: 2,
  },
  thumb: { width: 110, height: 88, backgroundColor: "#DDE5DF" },
  cardBody: { flex: 1, padding: 12, justifyContent: "center" },
  cardTitle: { fontSize: 17, fontWeight: "600", color: COLORS.text },
  cardMeta: { marginTop: 4, color: COLORS.primary, fontWeight: "500" },
  cardDate: { marginTop: 4, fontSize: 12, color: COLORS.muted },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: COLORS.text },
  input: {
    borderWidth: 1,
    borderColor: "#D5DED8",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 16,
    marginBottom: 16,
    color: COLORS.text,
  },
  cancel: { marginTop: 12, alignItems: "center" },
  cancelText: { color: COLORS.muted },
});

export default HomeScreen;
