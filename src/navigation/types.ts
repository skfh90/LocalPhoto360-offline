import { PhotoCapture } from "../models/PhotoCapture";

export type RootStackParamList = {
  Home:
    | {
        pendingCapture?: {
          folder: string;
          shotCount: number;
          fov: string;
          defaultName: string;
          status?: string;
          panoramaFile?: string;
        };
      }
    | undefined;
  Guide: undefined;
  Capture: undefined;
  Detail: { captureId: string };
  Viewer: { panoramaPath: string; title: string };
};

export type CaptureItem = PhotoCapture;
