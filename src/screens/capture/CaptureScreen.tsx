import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  View,
  Pressable,
  Modal,
  BackHandler,
  Platform,
} from "react-native";
import ImageResizer from "@bam.tech/react-native-image-resizer";
import { useTheme, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import createStyles from "./CaptureScreen.style";
import Text from "@shared-components/TextWrapper";
import { orientationAngle } from "react-native-orientation-angle";
import { useKeepAwake } from "@sayem314/react-native-keep-awake";

import {
  Camera,
  CameraDevice,
  TakePhotoOptions,
  CameraDeviceFormat,
  getCameraFormat,
} from "react-native-vision-camera";
import {
  CAPTURE_STATUS,
  GREEN_TARGET_STATUS,
  waitHoldTime,
  waitCapturingTime,
  SENSOR_INTERVAL,
  UPDATE_RATE,
  FILTER_CAPTURE_ALPHA,
  angleDifference,
  DEBUG,
  rectWid,
  ratio,
  rectHei,
  focusX,
  focusY,
  arrowRadius,
  DEGTORAD,
  focusAdjustTime,
  isPolarIDArrayUltra,
  deltaArrowAngle,
  generateRandomDirName,
} from "./config";

import { ScreenHeight, ScreenWidth } from "@shared-utils/dimensions";
import GuideCircle, { CircleStatus } from "./components/GuideCircle";
import SvgSquareFill from "./Assets/squareFill.svg";
import SvgCircleFill from "./Assets/circleFill.svg";
import SvgArrow from "./Assets/arrow.svg";

import { CameraPoseData } from "./config";
import TranformedGreenTarget, {
  InterfaceTransformedGreenTargetProps,
} from "./components/TransformedGreenTarget";
import { SCREENS } from "@shared-constants";
import { useIsFocused } from "@react-navigation/core";
import { useIsForeground } from "@hooks/useIsForeground";
import {
  copyFile,
  createDirectoryIfNotExists,
  deleteFilesInDirectory,
  getDirectoryPath,
  stitchPanorama,
} from "@shared-utils";
import RNFS from "react-native-fs";
import ModalExitWarning, {
  IModalExitWarningRef,
} from "./modal/ModalExitWarning";
import ModalComingSoon, { IModalComingSoonRef } from "./modal/ModalComingSoon";
import EnlargeButton from "@shared-components/EnlargeButton";
import fonts from "@fonts";
import AppLoading from "@shared-components/AppLoading";
import type { RootStackParamList } from "../../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList, typeof SCREENS.CAPTURE>;

const CaptureScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  // const [ toggleModalNewPhotosphere ] = route.params;
  const [cameraPermission, setCameraPermission] = useState<any>();
  const [device, setDevice] = useState<CameraDevice | null>(null);
  const [camFormat, setCamFormat] = useState<CameraDeviceFormat | undefined>(
    undefined,
  );

  const [showRotateText, setShowRotateText] = useState(false);

  const camera = useRef<Camera>(null);

  const [isCameraInitialized, setCameraInitialized] = useState<boolean>(false);
  const [isInPolarZone, setInPolarZone] = useState<boolean>(false);
  const [inFloorCaptureState, setInFloorCaptureState] =
    useState<boolean>(false);
  const targetId = useRef<number>(-1);
  const holdId = useRef<number>(-1);

  const [showAppLoading, setShowAppLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Saving capture...");
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  // const [dotArray, setDotArray] = useState<GREEN_TARGET_STATUS[]>([]);

  const dotArray = useRef<GREEN_TARGET_STATUS[]>([]);

  const [showSquareFill, setShowSquareFill] = useState<boolean>(false);
  const [showHoldText, setShowHoldText] = useState<boolean>(false);
  const [isCaptureFinished, setCaptureFinished] = useState<boolean>(false);
  const [isCaptureEnable, setCaptureEnable] = useState<boolean>(false);

  const [camFov, setCamFov] = useState<number>(0);

  const [logText, setLogText] = useState<string>("");

  const captureEnableRef = useRef<boolean>(false);
  const layerNameList = useRef<string[]>([]);
  const scrollViewRef = useRef();
  const captureStabled = useRef<boolean>(false);

  const randomDirName = useRef<string>("");

  const countOfTakenPhotos = useRef<number>(0);
  const needCountPhoto = useRef<number>(0);

  const holdDeltaAngleRef = useRef<number>(3);
  const fieldOfViewRef = useRef<number>(0);

  const takenIds = useRef<number[]>([]);
  const firstImagePath = useRef<string>("");

  const [cameraFocused, setCameraFocused] = useState(false);

  const modalExitWarning = useRef<IModalExitWarningRef>(null);

  const modalComingSoon = useRef<IModalComingSoonRef>(null);
  const toggleModalComingSoon = () => {
    if (modalComingSoon) modalComingSoon.current?.toggle();
  };

  const [isSuportUltraCamera, setSupportUltraCamera] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    if (isSuportUltraCamera == false) {
      toggleModalComingSoon();
    }
  }, [isSuportUltraCamera]);

  const [angleOfArrow, setAngleOfArrow] = useState<number>(0);
  const [isShowArrow, setShowArrow] = useState<boolean>(false);

  const toggleModalExitWarning = () => {
    if (captureEnableRef.current) {
      if (modalExitWarning) modalExitWarning.current?.toggle();
    } else navigation.navigate(SCREENS.HOME);
  };

  // check if camera page is active
  const isFocussed = useIsFocused();
  const isForeground = useIsForeground();
  const isActive = isFocussed && isForeground;

  const rotTextRef = useRef<string>("");

  const [camPoseChanged, setCamPoseChanged] = useState<boolean>(false);
  const [camPose, setCamPose] = useState<CameraPoseData>({
    yaw: 1000,
    pitch: 0,
    roll: 0,
  });

  const camAngleRef = useRef<CameraPoseData>({
    yaw: 1000,
    pitch: 0,
    roll: 0,
  });

  useEffect(() => {
    if (!isCameraInitialized) return;

    let cancelled = false;

    const prepareFocus = async () => {
      // Give the camera session a moment after onInitialized (needed on emulator/Android).
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (cancelled) return;

      try {
        if (camera.current != null && device?.supportsFocus) {
          await camera.current.focus({
            x: focusX,
            y: focusY,
          });
        }
      } catch (error) {
        console.log("Camera focus skipped:", error);
      }

      if (cancelled) return;
      setTimeout(() => {
        if (!cancelled) setCameraFocused(true);
      }, focusAdjustTime);
    };

    prepareFocus();
    return () => {
      cancelled = true;
    };
    // Use device.id (stable), not the device object — unstable refs caused infinite re-renders.
  }, [isCameraInitialized, device?.id, device?.supportsFocus]);

  // const netInfo = useNetInfo();

  useEffect(() => {
    //  setting of sensors...................................................

    orientationAngle.setUpdateInterval(SENSOR_INTERVAL);
    orientationAngle.subscribe((res) => {
      let _camPose = camAngleRef.current;
      if (_camPose.yaw === 1000) {
        _camPose = res;
      }
      const cur_yaw = _camPose.yaw;
      const _yaw = cur_yaw - angleDifference(res.yaw, cur_yaw);
      let filtered_yaw =
        _yaw * FILTER_CAPTURE_ALPHA + (1 - FILTER_CAPTURE_ALPHA) * cur_yaw;

      if (filtered_yaw > 180) filtered_yaw = filtered_yaw - 360;
      else if (filtered_yaw < -180) filtered_yaw = 360 + filtered_yaw;

      const filtered_pitch =
        res.pitch * FILTER_CAPTURE_ALPHA +
        (1 - FILTER_CAPTURE_ALPHA) * _camPose.pitch;
      const filtered_roll =
        res.roll * FILTER_CAPTURE_ALPHA +
        (1 - FILTER_CAPTURE_ALPHA) * _camPose.roll;

      camAngleRef.current = {
        yaw: filtered_yaw,
        pitch: filtered_pitch,
        roll: filtered_roll,
      };
    });
    return () => {
      orientationAngle.unsubscribe();
    };
  }, []);
  const intervalFunc = () => {
    setCamPoseChanged((pose) => !pose);
    // console.log("isCaptureEnable state ........... ", isCaptureEnable);
    // setCamPose(camAngleRef.current);
  };
  useEffect(() => {
    const intervalId = setInterval(intervalFunc, UPDATE_RATE);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  //  For arrow ----------------------------------
  useEffect(() => {
    const _camPose = camAngleRef.current;
    const _deltaHold = holdDeltaAngleRef.current;
    let { _id, _holdId } = dotArray.current.reduce(
      (acc, gradient) => {
        const delta_pitch = Math.abs(gradient.pitch - _camPose.pitch);
        const delta_yaw = Math.abs(angleDifference(gradient.yaw, _camPose.yaw));

        // handle minLength
        if (
          gradient.name === "ceiling" || gradient.name === "floor"
            ? acc.minLength > delta_pitch ** 2
            : acc.minLength > delta_pitch ** 2 + delta_yaw ** 2
        ) {
          acc.minLength =
            delta_pitch ** 2 +
            (gradient.name === "ceiling" || gradient.name === "floor"
              ? 0
              : delta_yaw ** 2);
          acc._id = gradient.id;
        }

        // handle _holdId
        if (
          gradient.status != CAPTURE_STATUS.CAPTURED &&
          delta_pitch < _deltaHold &&
          Math.abs(_camPose.roll) < _deltaHold &&
          (gradient.name === "ceiling" || gradient.name === "floor"
            ? true
            : delta_yaw < _deltaHold)
        ) {
          acc._holdId = gradient.id;
        }

        return acc;
      },
      { minLength: 10000, _id: -1, _holdId: -1 },
    );

    if (_id == needCountPhoto.current - 1 && !inFloorCaptureState) {
      _id = -1;
      return;
    }
    if (_holdId == needCountPhoto.current - 1 && !inFloorCaptureState) {
      _holdId = -1;
      return;
    }
    if (targetId.current != _id) {
      targetId.current = _id;
      setInPolarZone(isPolarIDArrayUltra.includes(targetId.current));
    }

    if (captureEnableRef.current == false || !cameraFocused) return;

    if (holdId.current != _holdId) {
      holdId.current = _holdId;
      holdStateChanged();
    }

    // console.log(holdId.current);

    // to draw the arrow --------------------------------------
    for (let index = 0; index < dotArray.current.length; index++) {
      const grad = dotArray.current[index];
      if (
        grad.status !== CAPTURE_STATUS.CAPTURED &&
        Math.abs(grad.pitch - _camPose.pitch) < deltaArrowAngle &&
        (grad.name === "ceiling" || grad.name === "floor"
          ? true
          : Math.abs(angleDifference(grad.yaw, _camPose.yaw)) < deltaArrowAngle)
      ) {
        // not visible arrow
        setShowArrow(false);
        return;
      }
    }

    const { minIdx, minDistance } = dotArray.current.reduce(
      (acc, grad, idx) => {
        if (grad.status !== CAPTURE_STATUS.CAPTURED) {
          let distance = Math.abs(grad.pitch - _camPose.pitch); // for ceiling
          if (grad.name === "floor") {
            distance *= 100;
          } else if (!(grad.name === "ceiling" || grad.name === "floor")) {
            distance += Math.abs(angleDifference(grad.yaw, _camPose.yaw)) * 0.5;
          }

          if (acc.minDistance > distance) {
            return { minDistance: distance, minIdx: idx };
          }
        }
        return acc;
      },
      { minDistance: 1000000, minIdx: -1 },
    );

    if (minIdx > -1) {
      setShowArrow(true);
      const minDot = dotArray.current[minIdx];
      if (minDot?.name === "ceiling") {
        setAngleOfArrow(-90);
      } else if (minDot?.name === "floor") {
        setAngleOfArrow(+90);
      } else {
        setAngleOfArrow(
          Math.atan2(
            -(minDot.pitch - _camPose.pitch) * DEGTORAD,
            -angleDifference(minDot.yaw, _camPose.yaw) * DEGTORAD,
          ) / DEGTORAD,
        );
      }
    }
  }, [camPoseChanged]);

  useEffect(() => {
    if (camFov == 0) return; // neededddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd
    // console.log("camFov = ", camFov);
    // if (DEBUG) {
    //   needCountPhoto.current = 10;
    // } else {
    //   needCountPhoto.current = camFov > 90 ? 25 : 36; //25 : 36
    // }
    // needCountPhoto.current = camFov > 90 ? 25 : 36; //25 : 36
    needCountPhoto.current = DEBUG ? 10 : camFov > 90 ? 25 : 36;

    rotTextRef.current = "count: " + needCountPhoto.current + "\n";
    rotTextRef.current = rotTextRef.current + "FOV: " + camFov + "\n";

    const initialDotArray: GREEN_TARGET_STATUS[] = [];

    const createDot = (name: string, pitch: number, num: number): void => {
      const deltaAngle = 360 / num;
      for (let i = 0; i < num; i++) {
        initialDotArray.push({
          id: initialDotArray.length,
          name,
          yaw: -180 + (i + 0.5) * deltaAngle,
          pitch,
          status: CAPTURE_STATUS.NOT_CAPTURED,
        });
      }
    };

    layerNameList.current = ["ceiling", "top", "middle", "bottom", "floor"];

    createDot("bottom", -45, 7);
    createDot("middle", 0, 9);
    createDot("top", 45, 7);
    createDot("ceiling", 90, 1);
    createDot("floor", -90, 1);

    dotArray.current = initialDotArray;
  }, [camFov]);

  const setDotStatusById = (dotId: number, status: number): void => {
    const index = dotArray.current.findIndex((item: any) => item.id === dotId);
    if (index !== -1) {
      dotArray.current[index].status = status;
    }
  };

  const timerIdRef = useRef<NodeJS.Timeout | null>(null);

  const holdStateChanged = () => {
    const _hold_id = holdId.current;
    if (_hold_id != -1) {
      setDotStatusById(_hold_id, CAPTURE_STATUS.HOLDING);
      setShowHoldText(true);

      holdDeltaAngleRef.current = 6;
      captureStabled.current = true;
      timerIdRef.current = setTimeout(() => {
        timerIdRef.current = null;
        takePhoto(_hold_id);
      }, waitHoldTime);
    } else {
      captureStabled.current = false;
      setShowHoldText(false);
      setDotStatusById(_hold_id, CAPTURE_STATUS.NOT_CAPTURED);

      holdDeltaAngleRef.current = 3;

      if (timerIdRef.current != null) {
        clearTimeout(timerIdRef.current);
        timerIdRef.current = null;
      }
    }
  };

  const takePhotoOptions: TakePhotoOptions = useMemo(() => {
    return {
      flash: "off",
      enableShutterSound: false,
      photoCodec: "jpeg",
      qualityPrioritization: "quality",
    };
  }, []);

  // press back button
  useEffect(() => {
    const backAction = () => {
      toggleModalExitWarning();
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );
    return () => backHandler.remove();
  }, []);

  const finishCaptureLocally = useCallback(async () => {
    const dir = randomDirName.current;
    const savePath = `${getDirectoryPath()}/${dir}/rot.txt`;

    try {
      await RNFS.writeFile(savePath, rotTextRef.current, "utf8");
    } catch {
      // ignore write errors for rot.txt
    }

    let stitchOk = false;
    try {
      setLoadingText("Creating 360 view...");
      setShowAppLoading(true);
      await stitchPanorama({
        folder: dir,
        fovOverride: camFov > 0 ? camFov : undefined,
      });
      stitchOk = true;
    } catch (err) {
      console.log("stitch after capture failed:", err);
      setLoadingText("Saving capture...");
      // Fallback thumbnail from first frame if stitch failed.
      if (firstImagePath.current) {
        try {
          const resized = await ImageResizer.createResizedImage(
            firstImagePath.current,
            400,
            200,
            "JPEG",
            85,
          );
          await copyFile(
            resized.uri.replace("file://", ""),
            `${getDirectoryPath()}/${dir}/thumbnail.jpg`,
          );
        } catch {
          // thumbnail is optional
        }
      }
    }

    setCaptureFinished(true);
    setShowAppLoading(false);

    navigation.navigate(SCREENS.HOME, {
      pendingCapture: {
        folder: dir,
        shotCount: countOfTakenPhotos.current,
        fov: camFov.toString(),
        defaultName: `Capture ${new Date().toLocaleString()}`,
        status: stitchOk ? "ready" : "stitch_pending",
        panoramaFile: stitchOk ? "photo360.jpg" : undefined,
      },
    });
  }, [camFov, navigation]);

  useEffect(() => {
    const createDirectory = async () => {
      randomDirName.current = generateRandomDirName(1);
      await createDirectoryIfNotExists(getDirectoryPath());
      await createDirectoryIfNotExists(
        `${getDirectoryPath()}/${randomDirName.current}`,
      );
      await deleteFilesInDirectory(
        `${getDirectoryPath()}/${randomDirName.current}`,
      );
    };
    createDirectory();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const cameraPermissionStatus = await Camera.requestCameraPermission();
        setCameraPermission(cameraPermissionStatus);

        // setLogText("get all available cameras \n");
        let _logText = "";
        const availableDevices = Camera.getAvailableCameraDevices();

        const backDevices = availableDevices.filter(
          (item) => item.position === "back",
        );

        let funnyDevices = backDevices.filter((item) =>
          item.physicalDevices.includes("ultra-wide-angle-camera"),
        );

        if (funnyDevices.length == 0) {
          funnyDevices = backDevices.filter(
            (item) => item.minZoom < 1 || item.isMultiCam === true,
          );
        }

        if (funnyDevices.length == 0) {
          setSupportUltraCamera(true);
          funnyDevices = backDevices;
        } else {
          setSupportUltraCamera(true);
        }

        let maxFieldOfViewDevice: CameraDevice | undefined = undefined;
        let maxFieldOfView = 0;

        funnyDevices.forEach((_device) => {
          if (_device.formats[0].fieldOfView > maxFieldOfView) {
            // _logText += `\nDevice:  ${_device.physicalDevices.join(",")}`;
            maxFieldOfView = _device.formats[0].fieldOfView;
            maxFieldOfViewDevice = _device;
          }
        });

        if (maxFieldOfViewDevice) {
          setDevice(maxFieldOfViewDevice);
          let _camFov = maxFieldOfViewDevice?.formats[0].fieldOfView;

          setCamFov(_camFov);
          fieldOfViewRef.current = _camFov;

          const maxFormat = getCameraFormat(maxFieldOfViewDevice, [
            { photoAspectRatio: 4 / 3 },
            { photoResolution: "max" },
            { videoAspectRatio: 4 / 3 },
            { videoResolution: "max" },
          ]);
          // console.log(maxFormat);

          if (maxFormat) {
            _logText += `\nBest Format : ${maxFormat.photoHeight} x ${maxFormat.photoWidth}
             + (${maxFormat.pixelFormats}) + (${maxFormat.maxFps})`;
            setCamFormat(maxFormat);
          } else {
            _logText += " No Supported Format";
          }
        } else {
          _logText += " No Camera Device";
        }
        // setLogText((text) => text + _logText);
      } catch (error) {
        // setLogText("API VERSION Not Supported " + error);
      }
    })();
  }, []);

  //

  const takePhoto = useCallback(
    async (started_holdID: number) => {
      if (!captureEnableRef.current || !isCameraInitialized) return;
      if (camera.current == null) return;

      try {
        console.log("Photo taking ....");

        const data = await camera.current.takePhoto(takePhotoOptions);
        const rot = camAngleRef.current;
        let capture_id = holdId.current;
        if (!captureStabled.current || started_holdID != capture_id) return;

        console.log("captured.........");
        setShowHoldText(false);
        setDotStatusById(capture_id, CAPTURE_STATUS.CAPTURING);

        setShowSquareFill(true);

        setTimeout(() => {
          setShowSquareFill(false);
          setDotStatusById(capture_id, CAPTURE_STATUS.CAPTURED);
        }, waitCapturingTime);

        if (takenIds.current.includes(capture_id)) return;
        takenIds.current.push(capture_id);

        const savePath =
          getDirectoryPath() +
          "/" +
          randomDirName.current +
          "/img_" +
          capture_id +
          ".jpeg";

        await copyFile(data.path, savePath);

        if (!firstImagePath.current) {
          firstImagePath.current = savePath;
        }

        // Keep image id and rot.txt id aligned (img_<id>.jpeg).
        rotTextRef.current =
          rotTextRef.current +
          holdId.current.toString() +
          ", " +
          [rot.yaw, rot.pitch, rot.roll].join(",") +
          "\n";

        countOfTakenPhotos.current = countOfTakenPhotos.current + 1;
        if (countOfTakenPhotos.current == needCountPhoto.current - 1) {
          setInFloorCaptureState(true);
        }

        if (countOfTakenPhotos.current == needCountPhoto.current) {
          setLoadingText("Creating 360 view...");
          setShowAppLoading(true);
          captureEnableRef.current = false;
          setCaptureEnable(false);
          finishCaptureLocally();
        }
      } catch (error) {
        console.log("takePhoto error:", error);
        setShowHoldText(false);
        setShowSquareFill(false);
        captureStabled.current = false;
        if (holdId.current !== -1) {
          setDotStatusById(holdId.current, CAPTURE_STATUS.NOT_CAPTURED);
        }
      }
    },
    [
      isCameraInitialized,
      takePhotoOptions,
      setDotStatusById,
      finishCaptureLocally,
    ],
  );

  const handleExit = useCallback(() => {
    navigation.navigate(SCREENS.HOME);
  }, [navigation]);

  const getTransformation = (
    grad: GREEN_TARGET_STATUS,
  ): InterfaceTransformedGreenTargetProps => {
    const props: InterfaceTransformedGreenTargetProps = {};
    props.visible = false;
    props.isPolar = false;
    const deltaView = 60;
    const _camPose = camAngleRef.current;
    if (
      (Math.abs(angleDifference(grad.yaw, _camPose.yaw)) < deltaView &&
        Math.abs(grad.pitch - _camPose.pitch) < deltaView) ||
      ((grad.name === "ceiling" || grad.name === "floor") &&
        Math.abs(grad.pitch - _camPose.pitch) < deltaView)
    ) {
      if (
        grad.status === CAPTURE_STATUS.NOT_CAPTURED ||
        grad.status === CAPTURE_STATUS.HOLDING
      ) {
        props.visible = true;
      }
    }

    if (grad.name == "floor") {
      props.visible = props.visible && inFloorCaptureState;
    }

    let translateX = angleDifference(_camPose.yaw, grad.yaw) * 1.6;

    if (grad.name === "ceiling" || grad.name === "floor") {
      translateX = 0;
      props.isPolar = true;
    }

    if (grad.name === "ceiling") {
      props.translateX = 0;
      props.translateY = (-(grad.pitch - _camPose.pitch) * ScreenHeight) / 80;
      props.rotateX = -(grad.pitch - _camPose.pitch);
      props.rotateY = _camPose.roll * 2;
      props.rotateZ = 0;
    } else if (grad.name === "floor") {
      props.translateX = 0;
      props.translateY = (-(grad.pitch - _camPose.pitch) * ScreenHeight) / 80;
      props.rotateX = -(grad.pitch - _camPose.pitch);
      props.rotateY = -_camPose.roll * 2;
      props.rotateZ = 0;
    } else {
      props.translateX = (translateX * ScreenWidth) / 80;
      props.translateY = (-(grad.pitch - _camPose.pitch) * ScreenHeight) / 80;
      props.rotateX = -(grad.pitch - _camPose.pitch);
      props.rotateY = -translateX;
      props.rotateZ = -_camPose.roll;
    }
    // console.log(props)

    return props;
  };

  const getStateOfGuideCircle = useCallback((item: any) => {
    if (item.id != targetId.current) {
      if (item.status == CAPTURE_STATUS.NOT_CAPTURED)
        return CircleStatus.OUTSIDE_NOT_CAPTURED;
      else if (item.status == CAPTURE_STATUS.CAPTURED)
        return CircleStatus.OUTSIDE_CAPTURED;
      else if (item.status == CAPTURE_STATUS.HOLDING)
        return CircleStatus.OUTSIDE_NOT_CAPTURED;
    } else {
      if (item.status == CAPTURE_STATUS.NOT_CAPTURED)
        return CircleStatus.INSIDE_NOT_CAPTURED;
      else if (item.status == CAPTURE_STATUS.CAPTURING)
        return CircleStatus.INSIDE_CAPTURING;
      else if (item.status == CAPTURE_STATUS.HOLDING)
        return CircleStatus.INSIDE_HOLD;
      else if (item.status == CAPTURE_STATUS.CAPTURED)
        return CircleStatus.INSIDE_CAPTURED;
    }
    return CircleStatus.INSIDE_NOT_CAPTURED;
  }, []);

  const onCameraInitialized = useCallback(() => {
    // console.log("camera initialized");
    setCameraInitialized(true);
  }, []);

  useKeepAwake();

  return (
    <View style={styles.container}>
      <View style={styles.cameraViewerStyle}>
        {!isCaptureFinished && device && cameraPermission === "granted" ? (
          <Camera
            ref={camera}
            style={styles.cameraStyle}
            device={device}
            format={camFormat}
            isActive={isActive}
            enableZoomGesture={false}
            enableHighQualityPhotos={true}
            orientation="portrait"
            resizeMode="cover"
            photo={true}
            video={false}
            audio={false}
            zoom={device.minZoom}
            videoStabilizationMode={"off"}
            onInitialized={onCameraInitialized}
          />
        ) : null}
      </View>

      {isSuportUltraCamera && (
        <View style={styles.viewerStyle} collapsable={false}>
          <View style={styles.targetPackStyle} pointerEvents="none">
            {
              // draw Green targets................
              dotArray.current.map((item, idx) => (
                <TranformedGreenTarget key={idx} {...getTransformation(item)} />
              ))
            }
          </View>

          <View style={styles.whiteCircleAndFrameStyle} pointerEvents="none">
            {!isShowArrow && isInPolarZone && (
              <View style={styles.circleOutlineStyle} />
            )}
            {!isShowArrow && !isInPolarZone && (
              <View style={styles.rectOutlineStyle} />
            )}
            <View style={styles.centerCircleStyle} />

            {!isInPolarZone && showSquareFill && (
              <SvgSquareFill
                style={styles.targetFillStyle}
                width={rectWid * ratio}
                height={rectHei * ratio}
              />
            )}
            {isInPolarZone && showSquareFill && (
              <SvgCircleFill
                style={styles.targetFillStyle}
                width={rectHei * ratio}
                height={rectHei * ratio}
              />
            )}

            <View style={styles.centerCircleStyle}>
              {showHoldText && (
                <Text style={{ ...styles.holdTextStyle, color: "#000" }}>
                  HOLD
                </Text>
              )}
            </View>

            {isCaptureEnable && isShowArrow && (
              <View
                style={{
                  position: "absolute",
                  transform: [
                    {
                      translateX:
                        arrowRadius * Math.cos(angleOfArrow * DEGTORAD),
                    },
                    {
                      translateY:
                        arrowRadius * Math.sin(angleOfArrow * DEGTORAD),
                    },
                    { rotateZ: angleOfArrow + 90 + "deg" },
                  ],
                }}
              >
                <SvgArrow />
              </View>
            )}
          </View>

          {isCaptureEnable && (
            <View style={styles.guidePackStyle} pointerEvents="box-none">
              {layerNameList.current.map((str, topIdx) => (
                <View
                  style={{
                    backgroundColor:
                      dotArray.current.find(
                        (item) => item.id == targetId.current,
                      )?.name == str
                        ? "rgba(0, 0, 0, 0.75)"
                        : "transparent",
                    borderRadius: 28,
                    flexDirection: "row",
                    padding: 2,
                    alignItems: "center",
                    justifyContent: "space-around",
                  }}
                  key={topIdx}
                >
                  {dotArray.current
                    .filter((item: any) => item.name == str)
                    .map((item: any, idx: number) => (
                      <GuideCircle
                        status={getStateOfGuideCircle(item)}
                        key={idx}
                      />
                    ))}
                </View>
              ))}
            </View>
          )}

          <View style={styles.holdFrameStyle} pointerEvents="none">
            <Text
              color="#FFF"
              fontFamily={
                Platform.OS == "android"
                  ? fonts.azosans.medium
                  : fonts.azosans.bold
              }
              style={styles.holdTextStyle}
            >
              {isCaptureEnable
                ? targetId.current == dotArray.current.length - 1
                  ? ""
                  : "KEEP PHONE 6 INCHES"
                : "HOLD FRAME"}
            </Text>
            <Text
              color="#FFF"
              fontFamily={
                Platform.OS == "android"
                  ? fonts.azosans.medium
                  : fonts.azosans.bold
              }
              style={styles.holdTextStyle}
            >
              {isCaptureEnable
                ? targetId.current == dotArray.current.length - 1
                  ? ""
                  : "AWAY FROM CHEST"
                : "OVER GREEN TARGETS"}
            </Text>
          </View>

          {isCaptureEnable &&
            targetId.current == dotArray.current.length - 1 && (
              <View style={styles.bottomFrameStyle} pointerEvents="none">
                <Text color="#FFF" style={styles.bottomTextStyle}>
                  STEP OUTSIDE TARGET
                </Text>
              </View>
            )}

          {showRotateText && (
            <View style={styles.holdFrameStyle} pointerEvents="none">
              <Text color="#FFF" style={styles.holdTextStyle}>
                ROTATE
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Interactive controls in a Modal so they sit above Vision Camera's native
          SurfaceView — Android emulators otherwise swallow overlay taps. */}
      {isSuportUltraCamera && !isCaptureFinished && (
        <Modal
          visible
          transparent
          animationType="none"
          statusBarTranslucent
          onRequestClose={toggleModalExitWarning}
        >
          <View style={styles.controlsModalRoot} pointerEvents="box-none">
            <View style={styles.exitButtonStyle} pointerEvents="box-none">
              <EnlargeButton
                leftMargin={10}
                topMargin={10}
                butWidth={60}
                normalPath={require("../../assets/close_normal.png")}
                hoverPath={require("../../assets/close_hover.png")}
                isToggleButton={false}
                onPress={() => {
                  console.log("EXIT pressed");
                  toggleModalExitWarning();
                }}
              />
            </View>

            {!isCaptureEnable && (
              <Pressable
                style={({ pressed }) => [
                  styles.beginButtonStyle,
                  pressed && { opacity: 0.7 },
                ]}
                hitSlop={{ top: 20, bottom: 20, left: 24, right: 24 }}
                onPress={() => {
                  console.log("BEGIN pressed", {
                    cameraFocused,
                    isCameraInitialized,
                    captureEnableBefore: captureEnableRef.current,
                  });
                  captureEnableRef.current = true;
                  setCaptureEnable(true);
                }}
              >
                <Text color="#FFF" style={styles.beginTextStyle}>
                  BEGIN
                </Text>
              </Pressable>
            )}
          </View>
        </Modal>
      )}

      {/* {DEBUG && (
        <ScrollView
          style={{
            width: "100%",
            height: ScreenHeight - 100,
            position: "absolute",
          }}
          ref={scrollViewRef}
          onContentSizeChange={() =>
            scrollViewRef.current.scrollToEnd({ animated: true })
          }
        >
          <Text
            numberOfLines={100}
            color="red"
            style={{
              fontSize: 24,
            }}
          >
            {networkConnected +
              " " +
              networkType +
              " " +
              JSON.stringify(networkDetails)}
          </Text>
        </ScrollView>
      )} */}

      <ModalExitWarning
        ref={modalExitWarning}
        doExit={handleExit}
        doContinue={() => {}}
      />

      <ModalComingSoon
        ref={modalComingSoon}
        doExit={handleExit}
      />

      {showAppLoading && (
        <AppLoading text={loadingText} />
      )}
    </View>
  );
};

export default CaptureScreen;
