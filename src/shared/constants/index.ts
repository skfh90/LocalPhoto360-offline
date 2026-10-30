import { ScreenHeight, ScreenWidth } from "../utils/dimensions";

export const SCREENS = {
  HOME: "Home",
  GUIDE: "Guide",
  CAPTURE: "Capture",
  DETAIL: "Detail",
  VIEWER: "Viewer",
} as const;

export const ratioWidth = ScreenWidth / 375;
export const ratioHeight = ScreenHeight / 667;

export const COLORS = {
  background: "#00140A",
  primary: "#01CE75",
  white: "#FFFFFF",
  text: "#00130A",
  muted: "rgba(0, 19, 10, 0.5)",
};
