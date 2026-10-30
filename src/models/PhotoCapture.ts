import Realm, { BSON } from "realm";

export class PhotoCapture extends Realm.Object<PhotoCapture> {
  _id: BSON.ObjectId = new BSON.ObjectId();
  name!: string;
  folder!: string;
  shotCount!: number;
  fov!: string;
  status!: string;
  panoramaFile?: string;
  createdAt: Date = new Date();

  static primaryKey = "_id";
}

export const schemas = [PhotoCapture];

export type CaptureStatus = "captured" | "ready" | "stitch_pending";
