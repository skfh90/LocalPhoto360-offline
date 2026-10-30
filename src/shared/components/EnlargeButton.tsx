import React, { forwardRef, useImperativeHandle, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";

interface Props {
  onPress: () => void;
  normalPath: number;
  hoverPath: number;
  leftMargin: number;
  topMargin: number;
  butWidth: number;
  isToggleButton: boolean;
}

export interface EnlargeButtonRef {
  toggle: (flag: boolean) => void;
}

const EnlargeButton = forwardRef<EnlargeButtonRef, Props>(
  (
    {
      onPress,
      normalPath,
      hoverPath,
      leftMargin,
      topMargin,
      butWidth,
      isToggleButton,
    },
    ref,
  ) => {
    const [isPressed, setIsPressed] = useState(false);
    const [isToggle, setIsToggle] = useState(false);

    useImperativeHandle(ref, () => ({
      toggle: (flag: boolean) => setIsToggle(flag),
    }));

    const showHover = isPressed || (isToggleButton && isToggle);

    return (
      <View style={styles.button}>
        <Pressable
          style={{
            position: "absolute",
            top: topMargin,
            left: leftMargin,
            width: butWidth - leftMargin * 2,
            height: butWidth - topMargin * 2,
            zIndex: 100,
          }}
          onPressIn={() => setIsPressed(true)}
          onPressOut={() => setIsPressed(false)}
          onPress={() => {
            if (isToggleButton) setIsToggle((v) => !v);
            onPress();
          }}
        />
        <Image
          style={{ width: butWidth, height: butWidth }}
          source={showHover ? hoverPath : normalPath}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default EnlargeButton;
