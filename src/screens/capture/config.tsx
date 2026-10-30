import { ScreenHeight, ScreenWidth } from "@shared-utils/dimensions";

export const DEBUG = false;
export const FILTER_CAPTURE_ALPHA = 0.25; // filter length of targets
export const FILTER_VIEWER_ALPHA = 0.1; // filter length of viewer

export const SENSOR_INTERVAL = DEBUG ? 200 : 25; // interval for reading sensor value

export const UPDATE_RATE = DEBUG ? 2000 : 25; //FRAME INTERVAL [ms]

export const waitHoldTime = 750; // milliseconds
export const waitCapturingTime = 50; //milliseconds
export const focusAdjustTime = 2000;
export const DEGTORAD = Math.PI / 180;
export const deltaRotationMarkAngle = 20;
export const deltaArrowAngle = 8;
export const holdDeltaAngle = 3; //degree

export const isPolarIDArrayUltra = [23, 24];

export enum CAPTURE_STATUS {
  NOT_CAPTURED = 0,
  HOLDING = 1,
  CAPTURED = 2,
  CAPTURING = 3,
}

export enum PROCESS_STATUS {
  INITIAL,
  CAPTURE,
  PROCESSING,
  DONE,
  FAILED,
}

export interface GREEN_TARGET_STATUS {
  id: number;
  name: string;
  yaw: number;
  pitch: number;
  status: CAPTURE_STATUS;
}
export interface CameraPoseData {
  yaw: number;
  pitch: number;
  roll: number;
}

export function angleDifference(angle1: number, angle2: number) {
  if (angle1 < 0) angle1 += 360;
  if (angle2 < 0) angle2 += 360;
  // Calculate the absolute difference between the angles
  let diff = angle2 - angle1;
  if (diff > 180) diff = diff - 360;
  else if (diff < -180) diff = 360 + diff;
  return diff;
}

// design ui config
export const rectWid = 177;
export const rectHei = 255;
export const circleRadius = 87;
export const ratio = ScreenWidth / 375;
export const gap = 20 * ratio;
export const gapBottom = 60 * ratio;

export const arrowRadius = 100 * ratio;

export const focusX = Math.floor(ScreenWidth / 2);
export const focusY = Math.floor(ScreenHeight / 2);

export const greenTargetWid = rectWid * ratio * 0.87;
export const greenTargetHei = rectHei * ratio * 0.87;

export const UPLOAD_TIMEOUT = 60000;

const date2string = (date: Date) => {
  // Get the individual date components
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  // Get the individual time components
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}_${month}_${day}_${hours}_${minutes}_${seconds}`;
};

const makeRandomString = (length: number) => {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

export const generateRandomDirName = (userID: number): string => {
  const dir =
    "imgPack_" +
    date2string(new Date()) +
    "_" +
    userID.toString() +
    "_" +
    makeRandomString(5);
  return dir;
};
