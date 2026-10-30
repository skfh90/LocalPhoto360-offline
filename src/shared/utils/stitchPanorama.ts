import { Buffer } from "buffer";
import jpeg from "jpeg-js";
import RNFS from "react-native-fs";
import ImageResizer from "@bam.tech/react-native-image-resizer";
import {
  PHOTO_ROOT,
  createDirectoryIfNotExists,
  getPanoramaFilePath,
} from "./files";
import { writeForwardViewThumbnail } from "./sampleCapture";

export const STITCH_PANORAMA_NAME = "photo360.jpg";

type PoseLine = {
  id: number;
  yaw: number;
  pitch: number;
  roll: number;
};

type DecodedImage = {
  width: number;
  height: number;
  data: Uint8Array;
};

const DEG2RAD = Math.PI / 180;

function parseRotTxt(text: string): { fov: number; poses: PoseLine[] } {
  let fov = 90;
  const poses: PoseLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.toLowerCase().startsWith("fov:")) {
      const v = parseFloat(line.slice(4).trim());
      if (!Number.isNaN(v) && v > 0) fov = v;
      continue;
    }
    if (line.toLowerCase().startsWith("count:")) continue;
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 4) continue;
    const id = parseInt(parts[0], 10);
    const yaw = parseFloat(parts[1]);
    const pitch = parseFloat(parts[2]);
    const roll = parseFloat(parts[3]);
    if ([id, yaw, pitch, roll].some((n) => Number.isNaN(n))) continue;
    poses.push({ id, yaw, pitch, roll });
  }
  return { fov, poses };
}

async function loadJpeg(path: string): Promise<DecodedImage> {
  const b64 = await RNFS.readFile(path, "base64");
  const decoded = jpeg.decode(Buffer.from(b64, "base64"), {
    useTArray: true,
  });
  return {
    width: decoded.width,
    height: decoded.height,
    data: decoded.data as Uint8Array,
  };
}

/** Rotate camera-local direction into world using yaw/pitch/roll (degrees). */
function cameraRayToWorld(
  lx: number,
  ly: number,
  lz: number,
  yawDeg: number,
  pitchDeg: number,
  rollDeg: number,
): [number, number, number] {
  const yaw = yawDeg * DEG2RAD;
  const pitch = pitchDeg * DEG2RAD;
  const roll = rollDeg * DEG2RAD;

  // Undo roll about forward axis
  const cosR = Math.cos(-roll);
  const sinR = Math.sin(-roll);
  const x1 = lx * cosR - ly * sinR;
  const y1 = lx * sinR + ly * cosR;
  const z1 = lz;

  // Pitch (look up/down)
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const x2 = x1;
  const y2 = y1 * cosP - z1 * sinP;
  const z2 = y1 * sinP + z1 * cosP;

  // Yaw (compass heading)
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const x3 = x2 * cosY + z2 * sinY;
  const y3 = y2;
  const z3 = -x2 * sinY + z2 * cosY;

  return [x3, y3, z3];
}

function sampleBilinear(
  img: DecodedImage,
  x: number,
  y: number,
): [number, number, number] {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, img.width - 1);
  const y1 = Math.min(y0 + 1, img.height - 1);
  const fx = x - x0;
  const fy = y - y0;

  const idx = (ix: number, iy: number) => (iy * img.width + ix) * 4;
  const i00 = idx(x0, y0);
  const i10 = idx(x1, y0);
  const i01 = idx(x0, y1);
  const i11 = idx(x1, y1);
  const d = img.data;

  const r =
    d[i00] * (1 - fx) * (1 - fy) +
    d[i10] * fx * (1 - fy) +
    d[i01] * (1 - fx) * fy +
    d[i11] * fx * fy;
  const g =
    d[i00 + 1] * (1 - fx) * (1 - fy) +
    d[i10 + 1] * fx * (1 - fy) +
    d[i01 + 1] * (1 - fx) * fy +
    d[i11 + 1] * fx * fy;
  const b =
    d[i00 + 2] * (1 - fx) * (1 - fy) +
    d[i10 + 2] * fx * (1 - fy) +
    d[i01 + 2] * (1 - fx) * fy +
    d[i11 + 2] * fx * fy;
  return [r, g, b];
}

export type StitchResult = {
  panoramaPath: string;
  thumbnailPath: string;
};

/**
 * Pose-based offline stitch: project each capture frame onto an equirectangular
 * panorama using FOV + yaw/pitch/roll from rot.txt.
 */
export async function stitchPanorama(options: {
  folder: string;
  fovOverride?: number;
  outWidth?: number;
  outHeight?: number;
}): Promise<StitchResult> {
  const folderPath = `${PHOTO_ROOT}/${options.folder}`;
  const rotPath = `${folderPath}/rot.txt`;
  if (!(await RNFS.exists(rotPath))) {
    throw new Error("rot.txt missing — cannot stitch");
  }

  const rotText = await RNFS.readFile(rotPath, "utf8");
  const parsed = parseRotTxt(rotText);
  const fovDeg = options.fovOverride ?? parsed.fov;
  if (parsed.poses.length === 0) {
    throw new Error("No pose rows in rot.txt");
  }

  const outW = options.outWidth ?? 2048;
  const outH = options.outHeight ?? 1024;
  const accumR = new Float32Array(outW * outH);
  const accumG = new Float32Array(outW * outH);
  const accumB = new Float32Array(outW * outH);
  const accumW = new Float32Array(outW * outH);

  const hFov = fovDeg * DEG2RAD;
  const step = 2; // subsample source for speed on device

  for (const pose of parsed.poses) {
    const srcPath = `${folderPath}/img_${pose.id}.jpeg`;
    if (!(await RNFS.exists(srcPath))) {
      console.log("stitch skip missing frame", srcPath);
      continue;
    }

    // Downscale before decode to keep JS stitching interactive.
    let workPath = srcPath;
    try {
      const resized = await ImageResizer.createResizedImage(
        srcPath.startsWith("file://") ? srcPath : `file://${srcPath}`,
        640,
        480,
        "JPEG",
        80,
      );
      workPath = resized.uri.replace("file://", "");
    } catch (e) {
      console.log("stitch resize skipped", e);
    }

    const img = await loadJpeg(workPath);
    const aspect = img.width / Math.max(img.height, 1);
    const vFov = 2 * Math.atan(Math.tan(hFov / 2) / aspect);
    const tanH = Math.tan(hFov / 2);
    const tanV = Math.tan(vFov / 2);

    for (let y = 0; y < img.height; y += step) {
      for (let x = 0; x < img.width; x += step) {
        const ndcX = (2 * (x + 0.5)) / img.width - 1;
        const ndcY = 1 - (2 * (y + 0.5)) / img.height;
        const lx = ndcX * tanH;
        const ly = ndcY * tanV;
        const lz = 1;
        const len = Math.sqrt(lx * lx + ly * ly + lz * lz) || 1;
        const [wx, wy, wz] = cameraRayToWorld(
          lx / len,
          ly / len,
          lz / len,
          pose.yaw,
          pose.pitch,
          pose.roll,
        );

        const lon = Math.atan2(wx, wz);
        const lat = Math.asin(Math.max(-1, Math.min(1, wy)));
        let u = ((lon / Math.PI + 1) / 2) * outW;
        let v = (0.5 - lat / Math.PI) * outH;
        if (u < 0) u += outW;
        if (u >= outW) u -= outW;
        const ui = Math.floor(u);
        const vi = Math.floor(v);
        if (vi < 0 || vi >= outH || ui < 0 || ui >= outW) continue;

        // Stronger weight near frame center to soften seams.
        const edge = Math.max(Math.abs(ndcX), Math.abs(ndcY));
        const weight = Math.max(0.05, 1 - edge * edge);

        const [r, g, b] = sampleBilinear(img, x, y);
        const o = vi * outW + ui;
        accumR[o] += r * weight;
        accumG[o] += g * weight;
        accumB[o] += b * weight;
        accumW[o] += weight;
      }
    }

    // Yield so the loading UI can stay responsive between frames.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  const rgba = Buffer.alloc(outW * outH * 4);
  for (let i = 0; i < outW * outH; i++) {
    const w = accumW[i];
    const o = i * 4;
    if (w > 1e-4) {
      rgba[o] = Math.min(255, Math.max(0, accumR[i] / w));
      rgba[o + 1] = Math.min(255, Math.max(0, accumG[i] / w));
      rgba[o + 2] = Math.min(255, Math.max(0, accumB[i] / w));
    } else {
      rgba[o] = 8;
      rgba[o + 1] = 12;
      rgba[o + 2] = 10;
    }
    rgba[o + 3] = 255;
  }

  const encoded = jpeg.encode({ data: rgba, width: outW, height: outH }, 85);
  await createDirectoryIfNotExists(folderPath);
  const panoramaPath = getPanoramaFilePath(options.folder, STITCH_PANORAMA_NAME);
  if (await RNFS.exists(panoramaPath)) {
    await RNFS.unlink(panoramaPath);
  }
  await RNFS.writeFile(
    panoramaPath,
    Buffer.from(encoded.data).toString("base64"),
    "base64",
  );

  const thumbnailPath = `${folderPath}/thumbnail.jpg`;
  try {
    await writeForwardViewThumbnail(panoramaPath, thumbnailPath);
  } catch (e) {
    console.log("stitch thumbnail failed", e);
    try {
      const thumb = await ImageResizer.createResizedImage(
        `file://${panoramaPath}`,
        400,
        200,
        "JPEG",
        85,
      );
      if (await RNFS.exists(thumbnailPath)) {
        await RNFS.unlink(thumbnailPath);
      }
      await RNFS.copyFile(thumb.uri.replace("file://", ""), thumbnailPath);
    } catch (e2) {
      console.log("stitch thumbnail fallback failed", e2);
    }
  }

  return { panoramaPath, thumbnailPath };
}
