declare module "*.svg" {
  import React from "react";
  import { SvgProps } from "react-native-svg";
  const content: React.FC<SvgProps>;
  export default content;
}

declare module "*.jpg" {
  const content: number;
  export default content;
}

declare module "*.jpeg" {
  const content: number;
  export default content;
}

declare module "*.png" {
  const content: number;
  export default content;
}

declare module "jpeg-js" {
  export function decode(
    data: Buffer | Uint8Array,
    opts?: { useTArray?: boolean; formatAsRGBA?: boolean },
  ): { width: number; height: number; data: Buffer | Uint8Array };
  export function encode(
    imgData: { data: Buffer | Uint8Array; width: number; height: number },
    quality?: number,
  ): { data: Buffer | Uint8Array };
}
