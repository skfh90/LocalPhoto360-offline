import { ScreenHeight, ScreenWidth } from "@shared-utils/dimensions";
import React, { useState, forwardRef, useImperativeHandle } from "react";
import { View } from "react-native";
import Modal from "react-native-modal";
import Text from "@shared-components/TextWrapper";
import fonts from "@fonts";
import CustomButton from "@shared-components/CustomButton";

export interface IModalExitWarningRef {
  toggle: () => void;
}

interface Props {
  doContinue?: () => void;
  doExit?: () => void;
}

const ModalExitWarning = forwardRef<IModalExitWarningRef, Props>(
  ({ doContinue, doExit }, ref) => {
    const [isModalVisible, setModalVisible] = useState(false);

    useImperativeHandle(ref, () => ({
      toggle: () => setModalVisible((v) => !v),
    }));

    return (
      <Modal
        onBackdropPress={() => setModalVisible(false)}
        onBackButtonPress={() => setModalVisible(false)}
        statusBarTranslucent
        isVisible={isModalVisible}
        deviceHeight={ScreenHeight}
        deviceWidth={ScreenWidth}
        animationOut="fadeOut"
        animationIn="fadeIn"
        useNativeDriverForBackdrop
        style={{ alignItems: "center" }}
      >
        <View
          style={{
            height: ScreenHeight - 100,
            width: ScreenWidth - 100,
            alignItems: "center",
            justifyContent: "center",
            marginTop: -80,
          }}
        >
          <Text color="#FFF" fontFamily={fonts.azosans.bold} style={{ fontSize: 22 }}>
            ARE YOU SURE?
          </Text>
          <Text
            color="#FFF"
            style={{ fontSize: 18, marginTop: 40, textAlign: "center" }}
          >
            Exiting now will cancel your capture
          </Text>
          <CustomButton
            title="Continue capture"
            onPress={() => {
              setModalVisible(false);
              doContinue?.();
            }}
            buttonColor="#FFF"
            titleColor="#00130A"
            buttonStyle={{ width: 200, marginTop: 50 }}
          />
          <CustomButton
            title="Exit"
            onPress={() => {
              setModalVisible(false);
              doExit?.();
            }}
            buttonColor="transparent"
            titleColor="#FFF"
            buttonStyle={{
              width: 200,
              marginTop: 20,
              borderWidth: 1,
              borderColor: "#FFF",
            }}
          />
        </View>
      </Modal>
    );
  },
);

export default ModalExitWarning;
