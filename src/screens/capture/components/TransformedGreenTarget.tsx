import React from "react";
import { View } from "react-native";
import GreenTarget from "./GreenTarget";
import { greenTargetHei, greenTargetWid } from "../config";

export interface InterfaceTransformedGreenTargetProps {
  translateX?: number;
  translateY?: number;
  translateZ?: number;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  visible?: boolean;
  isPolar?: boolean;
}

const TranformedGreenTarget: React.FC<InterfaceTransformedGreenTargetProps> = 
  ({
    translateX = 0,
    translateY = 0,
    rotateX = 0,
    rotateY = 0,
    rotateZ = 0,
    visible = true,
    isPolar = false,
  }) => {

    if (visible) {
      return (
        <View
          style={{
            position: "absolute",
            transform: [
              { translateX: translateX },
              { translateY: translateY },
              { rotateX: rotateX + "deg" },
              { rotateY: rotateY + "deg" },
              { rotateZ: rotateZ + "deg" },
            ],
          }}
        >
          <GreenTarget width={greenTargetWid} height={greenTargetHei} isCircle={isPolar} />
        </View>
      );
    }
    return null;
  }

export default TranformedGreenTarget;
