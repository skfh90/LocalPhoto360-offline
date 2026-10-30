import React from "react";
import { View } from "react-native";
import { memo } from "react";
interface IGuideCirclePros {
  isVisible?: boolean;
  status: number;
}

export enum CircleStatus {
  OUTSIDE_CAPTURED = 0,
  OUTSIDE_NOT_CAPTURED = 1,
  INSIDE_CAPTURED = 2,
  INSIDE_NOT_CAPTURED = 3,
  INSIDE_HOLD = 4,
  INSIDE_CAPTURING = 5,
}
// state
// 0: transparent(when potographed)
// 1: normal (dark green)
// 2: in area when not captured (bright green)
// 3: in area when captured (dark white)
// 4: while capturing (bright white)
const GuideCircle: React.FC<IGuideCirclePros> =  memo(({ status }) => {
  const getColor = (status: number) => {
    if (status == CircleStatus.OUTSIDE_CAPTURED) return "transparent";
    if (status == CircleStatus.OUTSIDE_NOT_CAPTURED)
      return "rgba(89, 208, 127, 0.4)";
    if (status == CircleStatus.INSIDE_CAPTURED)
      return "rgba(255, 255, 255, 0.4)";
    if (status == CircleStatus.INSIDE_NOT_CAPTURED)
      return "rgba(89, 208, 127, 1)";
    if (status == CircleStatus.INSIDE_HOLD) return "rgba(89, 208, 127, 1)";
    if (status == CircleStatus.INSIDE_CAPTURING)
      return "rgba(255, 255, 255, 1)";

    return "transparent";
  };
  return (
    <View
      style={{
        width: 15,
        height: 15,
        borderRadius: 8,
        marginLeft: 1,
        marginRight: 1,
        backgroundColor: getColor(status),
      }}
    ></View>
  );
}
);
export default React.memo(GuideCircle);
