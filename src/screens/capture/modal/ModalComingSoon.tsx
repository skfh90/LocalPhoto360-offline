import { ScreenHeight, ScreenWidth } from "@shared-utils/dimensions";
import React, { useState, forwardRef, useImperativeHandle } from "react";
import { View } from "react-native";
import Modal from "react-native-modal";
import Text from "@shared-components/TextWrapper";
import CustomButton from "@shared-components/CustomButton";

export interface IModalComingSoonRef {
  toggle: () => void;
}

interface Props {
  doExit?: () => void;
}

const ModalComingSoon = forwardRef<IModalComingSoonRef, Props>(
  ({ doExit }, ref) => {
    const [isModalVisible, setModalVisible] = useState(false);

    useImperativeHandle(ref, () => ({
      toggle: () => setModalVisible((v) => !v),
    }));

    return (
      <Modal
        isVisible={isModalVisible}
        deviceHeight={ScreenHeight}
        deviceWidth={ScreenWidth}
        onBackdropPress={() => setModalVisible(false)}
        onBackButtonPress={() => setModalVisible(false)}
      >
        <View style={{ alignItems: "center", padding: 24 }}>
          <Text color="#FFF" style={{ fontSize: 20, textAlign: "center" }}>
            This device needs an ultra-wide camera for best 360 capture. You can
            still try, but results may vary.
          </Text>
          <CustomButton
            title="Go back"
            onPress={() => {
              setModalVisible(false);
              doExit?.();
            }}
            buttonStyle={{ marginTop: 24, width: 160 }}
          />
        </View>
      </Modal>
    );
  },
);

export default ModalComingSoon;
