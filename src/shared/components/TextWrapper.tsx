import React from "react";
import {
  StyleSheet,
  Text as RNText,
  TextProps,
  TextStyle,
} from "react-native";

interface Props extends TextProps {
  color?: string;
  fontFamily?: string;
}

const TextWrapper: React.FC<Props> = ({
  style,
  color = "#00130A",
  fontFamily,
  children,
  ...rest
}) => {
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  return (
    <RNText
      {...rest}
      style={[flat, { color: color ?? flat?.color, fontFamily }]}
    >
      {children}
    </RNText>
  );
};

export default TextWrapper;
