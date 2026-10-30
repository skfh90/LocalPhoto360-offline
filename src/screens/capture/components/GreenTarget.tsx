import SvgRectGreenTarget from "../Assets/rect_target.svg";
import SvgCircleGreenTarget from "../Assets/circle_target.svg";
import React, { memo } from "react";

export interface InterfaceGreenTargetProps {
  width?: number;
  height?: number;
  isCircle?: boolean;
}

const GreenTarget: React.FC<InterfaceGreenTargetProps> = memo(
  ({
    width = 100,
    height = 200,
    isCircle = true,
  }) => {  
    return (
      <>
        {!isCircle && (
          <SvgRectGreenTarget
            width={width}
            height={height}
          />
        )}
        {isCircle && (
          <SvgCircleGreenTarget
            width={height}
            height={height}
          />
        )}
      </>
    );
  }
);

export default GreenTarget;
