import { Platform } from "react-native";
import { Buffer } from "buffer";
import jpeg from "jpeg-js";
import RNFS from "react-native-fs";
import ImageResizer from "@bam.tech/react-native-image-resizer";
import {
  PHOTO_ROOT,
  createDirectoryIfNotExists,
  getPanoramaPath,
} from "./files";

export const SAMPLE_FOLDER = "sample_demo";
export const SAMPLE_NAME = "Sample 360";
export const SAMPLE_PANORAMA = "photo360.jpg";
/** Stable id so we don't need crypto.getRandomValues to seed the sample. */
export const SAMPLE_OBJECT_ID = "000000000000000000000001";

/** Bump when replacing bundled sample360.jpg so devices re-copy the new file. */
export const SAMPLE_ASSET_VERSION = "4";

const ANDROID_SAMPLE_ASSET = "sample/sample360.jpg";

/**
 * Materialize a file that ships inside the app package.
 * Offline-only — never downloads from the network.
 */
async function copyPackagedAsset(
  androidAssetPath: string,
  destPath: string,
): Promise<void> {
  if (await RNFS.exists(destPath)) {
    await RNFS.unlink(destPath);
  }

  if (Platform.OS === "android") {
    try {
      await RNFS.copyFileAssets(androidAssetPath, destPath);
    } catch {
      const base64 = await RNFS.readFileAssets(androidAssetPath, "base64");
      await RNFS.writeFile(destPath, base64, "base64");
    }
    return;
  }

  const from = `${RNFS.MainBundlePath}/${androidAssetPath}`;
  if (!(await RNFS.exists(from))) {
    throw new Error(
      `Sample asset missing from app bundle: ${androidAssetPath}. ` +
        `Rebuild the native app so packaged assets are included.`,
    );
  }
  await RNFS.copyFile(from, destPath);
}

/**
 * Build a list thumbnail that matches the viewer's opening look direction
 * (center of the equirect ≈ default Photo Sphere yaw/pitch).
 * A full flat equirect thumb looks nothing like the 3D opening frame.
 */
export async function writeForwardViewThumbnail(
  panoramaPath: string,
  thumbDest: string,
): Promise<void> {
  const resized = await ImageResizer.createResizedImage(
    panoramaPath.startsWith("file://")
      ? panoramaPath
      : `file://${panoramaPath}`,
    1024,
    512,
    "JPEG",
    85,
  );
  const workPath = resized.uri.replace("file://", "");
  const b64 = await RNFS.readFile(workPath, "base64");
  const decoded = jpeg.decode(Buffer.from(b64, "base64"), { useTArray: true });
  const src = decoded.data as Uint8Array;
  const sw = decoded.width;
  const sh = decoded.height;

  // ~90° horizontal FOV ≈ 1/4 of equirect width; crop center.
  const cropW = Math.max(32, Math.floor(sw * 0.28));
  const cropH = Math.max(32, Math.floor(sh * 0.55));
  const x0 = Math.floor((sw - cropW) / 2);
  const y0 = Math.floor((sh - cropH) / 2);

  const rgba = Buffer.alloc(cropW * cropH * 4);
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const si = ((y0 + y) * sw + (x0 + x)) * 4;
      const di = (y * cropW + x) * 4;
      rgba[di] = src[si];
      rgba[di + 1] = src[si + 1];
      rgba[di + 2] = src[si + 2];
      rgba[di + 3] = 255;
    }
  }

  const encoded = jpeg.encode({ data: rgba, width: cropW, height: cropH }, 85);
  const tempCrop = `${PHOTO_ROOT}/_thumb_crop.jpg`;
  await createDirectoryIfNotExists(PHOTO_ROOT);
  await RNFS.writeFile(
    tempCrop,
    Buffer.from(encoded.data).toString("base64"),
    "base64",
  );

  const final = await ImageResizer.createResizedImage(
    `file://${tempCrop}`,
    400,
    200,
    "JPEG",
    85,
  );
  if (await RNFS.exists(thumbDest)) {
    await RNFS.unlink(thumbDest);
  }
  await RNFS.copyFile(final.uri.replace("file://", ""), thumbDest);
  try {
    await RNFS.unlink(tempCrop);
  } catch {
    // ignore
  }
}

/**
 * Copy bundled sample panorama + forward-view thumbnail into DocumentDirectory.
 */
export async function ensureSampleFiles(): Promise<void> {
  const folder = `${PHOTO_ROOT}/${SAMPLE_FOLDER}`;
  await createDirectoryIfNotExists(PHOTO_ROOT);
  await createDirectoryIfNotExists(folder);

  const panoDest = `${folder}/${SAMPLE_PANORAMA}`;
  const thumbDest = `${folder}/thumbnail.jpg`;
  const versionPath = `${folder}/.sample_version`;

  let needsRefresh = true;
  if (await RNFS.exists(versionPath)) {
    try {
      const current = await RNFS.readFile(versionPath, "utf8");
      needsRefresh = current.trim() !== SAMPLE_ASSET_VERSION;
    } catch {
      needsRefresh = true;
    }
  }

  const panoMissing = !(await RNFS.exists(panoDest));
  const thumbMissing = !(await RNFS.exists(thumbDest));

  if (needsRefresh || panoMissing) {
    await copyPackagedAsset(ANDROID_SAMPLE_ASSET, panoDest);
  }

  if (needsRefresh || thumbMissing || panoMissing) {
    try {
      await writeForwardViewThumbnail(panoDest, thumbDest);
    } catch (e) {
      console.log("forward thumb failed, copying full pano:", e);
      if (await RNFS.exists(thumbDest)) {
        await RNFS.unlink(thumbDest);
      }
      await RNFS.copyFile(panoDest, thumbDest);
    }
  }

  await RNFS.writeFile(versionPath, SAMPLE_ASSET_VERSION, "utf8");
}

export const getSampleViewerParams = () => ({
  panoramaPath: getPanoramaPath(SAMPLE_FOLDER, SAMPLE_PANORAMA),
  title: SAMPLE_NAME,
});

export const isSampleCapture = (folder: string) => folder === SAMPLE_FOLDER;
