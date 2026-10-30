import { useCallback } from "react";
import { useQuery, useRealm } from "@realm/react";
import { BSON } from "realm";
import { PhotoCapture } from "../models/PhotoCapture";
import {
  SAMPLE_FOLDER,
  SAMPLE_NAME,
  SAMPLE_OBJECT_ID,
  SAMPLE_PANORAMA,
  ensureSampleFiles,
  isSampleCapture,
} from "@shared-utils";

export function usePhotoStore() {
  const realm = useRealm();
  const captures = useQuery(PhotoCapture, (collection) =>
    collection.sorted("createdAt", true),
  );

  const ensureSampleCapture = useCallback(async () => {
    await ensureSampleFiles();
    const existing = realm
      .objects(PhotoCapture)
      .filtered("folder == $0", SAMPLE_FOLDER);
    if (existing.length > 0) return;

    realm.write(() => {
      realm.create(PhotoCapture, {
        _id: new BSON.ObjectId(SAMPLE_OBJECT_ID),
        name: SAMPLE_NAME,
        folder: SAMPLE_FOLDER,
        shotCount: 0,
        fov: "sample",
        status: "ready",
        panoramaFile: SAMPLE_PANORAMA,
        createdAt: new Date(),
      });
    });
  }, [realm]);

  const addCapture = useCallback(
    (input: {
      name: string;
      folder: string;
      shotCount: number;
      fov: string;
      status?: string;
      panoramaFile?: string;
    }) => {
      realm.write(() => {
        realm.create(PhotoCapture, {
          _id: new BSON.ObjectId(),
          name: input.name,
          folder: input.folder,
          shotCount: input.shotCount,
          fov: input.fov,
          status: input.status ?? "stitch_pending",
          panoramaFile: input.panoramaFile,
          createdAt: new Date(),
        });
      });
    },
    [realm],
  );

  const updateCaptureName = useCallback(
    (capture: PhotoCapture, name: string) => {
      realm.write(() => {
        capture.name = name;
      });
    },
    [realm],
  );

  const markCaptureReady = useCallback(
    (capture: PhotoCapture, panoramaFile: string) => {
      realm.write(() => {
        capture.status = "ready";
        capture.panoramaFile = panoramaFile;
      });
    },
    [realm],
  );

  const deleteCapture = useCallback(
    (capture: PhotoCapture) => {
      if (isSampleCapture(capture.folder)) return;
      realm.write(() => {
        realm.delete(capture);
      });
    },
    [realm],
  );

  return {
    captures,
    addCapture,
    updateCaptureName,
    markCaptureReady,
    deleteCapture,
    ensureSampleCapture,
  };
}
