/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import React from "react";
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  View,
  Platform,
} from "react-native";
import Svg, { Circle, Rect, G, Line } from "react-native-svg";

import * as Permissions from "expo-permissions";
import { Camera } from "expo-camera";
import { ExpoWebGLRenderingContext } from "expo-gl";

import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";
import * as posenet from "@tensorflow-models/posenet";
import { cameraWithTensors } from "@tensorflow/tfjs-react-native";
import * as facemesh from "@tensorflow-models/facemesh";
import * as tfjsWasm from "@tensorflow/tfjs-backend-wasm";
// import "@tensorflow/tfjs-backend-wasm";

// require("@tensorflow/tfjs-backend-webgl");
// require("@tensorflow/tfjs-backend-wasm");
// require("@tensorflow/tfjs-node");

interface ScreenProps {
  returnToMain: () => void;
}

interface ScreenState {
  hasCameraPermission?: boolean;
  // tslint:disable-next-line: no-any
  cameraType: any;
  isLoading: boolean;
  posenetModel?: posenet.PoseNet;
  pose?: posenet.Pose;
  // tslint:disable-next-line: no-any
  faceDetector?: any;
  faces?: blazeface.NormalizedFace[];
  modelName: string;
}

const inputTensorWidth = 152;
const inputTensorHeight = 200;

const AUTORENDER = true;

// tslint:disable-next-line: variable-name
const TensorCamera = cameraWithTensors(Camera);
export class App extends React.Component<ScreenProps, ScreenState> {
  rafID?: number;

  constructor(props: ScreenProps) {
    super(props);
    this.state = {
      isLoading: true,
      cameraType: Camera.Constants.Type.front,
      modelName: "posenet",
    };
    this.handleImageTensorReady = this.handleImageTensorReady.bind(this);
  }

  // async loadPosenetModel() {
  //   const model = await posenet.load({
  //     architecture: "MobileNetV1",
  //     outputStride: 16,
  //     inputResolution: { width: inputTensorWidth, height: inputTensorHeight },
  //     multiplier: 0.75,
  //     quantBytes: 2,
  //   });
  //   return model;
  // }

  // async loadBlazefaceModel() {
  //   await tf.setBackend("wasm");
  //   await tf.ready();

  //   const model = await facemesh.load({ maxFaces: 1 });
  //   return model;
  // }

  async handleImageTensorReady(
    images: IterableIterator<tf.Tensor3D>,
    updatePreview: () => void,
    gl: ExpoWebGLRenderingContext
  ) {
    const loop = async () => {
      if (!AUTORENDER) {
        updatePreview();
      }
      if (this.state.faceDetector != null) {
        const imageTensor = images.next().value;
        const faces = await this.state.faceDetector.estimateFaces(imageTensor);

        this.setState({ faces });
        tf.dispose(imageTensor);
      }
      // }

      if (!AUTORENDER) {
        gl.endFrameEXP();
      }
      this.rafID = requestAnimationFrame(loop);
    };

    loop();
  }

  componentWillUnmount() {
    if (this.rafID) {
      cancelAnimationFrame(this.rafID);
    }
  }

  async componentDidMount() {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);

    await tf.ready();
    // await tfjsWasm.setWasmPath("/tfjs-backend-wasm.wasm");
    // console.log(tfjsWasm.version_wasm);
    // await tf.ready();
    // tf.setBackend("wasm");
    // await tf.setBackend("tensorflow");
    // 1.4.0-alpha1',
    // '1.4.0-alpha2',
    // '1.4.0-alpha3',
    // '1.5.0-alpha4',
    // '1.5.1-alpha5',
    // '1.5.2-alpha1',
    // '1.7.0',
    // '1.7.1',
    // '1.7.2',
    // '1.7.3',
    // '1.7.4',
    // '2.0.0-rc.3',
    // '2.0.0-rc.4',
    // '2.0.0',
    // '2.0.1',
    // '2.1.0',
    // '2.2.0',
    // '2.3.0',
    // '2.4.0'
    await tf.ready();
    // await tf.setBackend("wasm");
    const model = await facemesh.load({ maxFaces: 1 });
    this.setState({
      hasCameraPermission: status === "granted",
      isLoading: false,
      faceDetector: model,
    });

    // await tf.ready().then(async () => {
    //   await tf.ready();
    //   console.log("ready");
    //   await tf
    //     .setBackend("wasm")
    //     .then(async () => {
    //       await tf.ready();

    //       const model = await facemesh.load({ maxFaces: 1 });
    //       this.setState({
    //         hasCameraPermission: status === "granted",
    //         isLoading: false,
    //         faceDetector: model,
    //       });
    //     })
    //     .catch((err) => console.log("erro", err));
    // });

    // const [blazefaceModel] = await Promise.all([
    //   this.loadBlazefaceModel(),
    //   // this.loadPosenetModel(),
    // ]);
  }

  renderPose() {
    const MIN_KEYPOINT_SCORE = 0.2;
    const { pose } = this.state;
    if (pose != null) {
      const keypoints = pose.keypoints
        .filter((k) => k.score > MIN_KEYPOINT_SCORE)
        .map((k, i) => {
          return (
            <Circle
              key={`skeletonkp_${i}`}
              cx={k.position.x}
              cy={k.position.y}
              r="2"
              strokeWidth="0"
              fill="blue"
            />
          );
        });

      const adjacentKeypoints = posenet.getAdjacentKeyPoints(
        pose.keypoints,
        MIN_KEYPOINT_SCORE
      );

      const skeleton = adjacentKeypoints.map(([from, to], i) => {
        return (
          <Line
            key={`skeletonls_${i}`}
            x1={from.position.x}
            y1={from.position.y}
            x2={to.position.x}
            y2={to.position.y}
            stroke="magenta"
            strokeWidth="1"
          />
        );
      });

      return (
        <Svg
          height="100%"
          width="100%"
          viewBox={`0 0 ${inputTensorWidth} ${inputTensorHeight}`}
        >
          {skeleton}
          {keypoints}
        </Svg>
      );
    } else {
      return null;
    }
  }
  renderFaces() {
    const { faces } = this.state;
    if (faces != null) {
      console.log("backend", tf.getBackend());
      const faceBoxes = faces.map((fa, fIndex) => {
        var f: any;
        f = fa;
        const topLeft = f.boundingBox.topLeft[0] as number[];
        // const bottomRight = f.boundingBox.bottomRight[0] as number[];
        // const landmarks = (f.mesh as number[][]).map((l, lIndex) => {
          console.log(l, topLeft[0], topLeft[1]);
          return (
            <Circle
              key={`landmark_${fIndex}_${lIndex}`}
              cx={l[0]}
              cy={l[1]}
              r="2"
              strokeWidth="0"
              fill="blue"
            />
          );
        });

        // return (
        //   <G key={`facebox_${fIndex}`}>
        //     <Rect
        //       x={topLeft[0]}
        //       y={topLeft[1]}
        //       fill={"red"}
        //       fillOpacity={0.2}
        //       width={bottomRight[0] - topLeft[0]}
        //       height={bottomRight[1] - topLeft[1]}
        //     />
        //     {landmarks}
        //   </G>
        // );
      });

      const flipHorizontal = Platform.OS === "ios" ? 1 : -1;
      return (
        <Svg
          height="100%"
          width="100%"
          viewBox={`0 0 ${inputTensorWidth} ${inputTensorHeight}`}
          scaleX={flipHorizontal}
        >
          {faceBoxes}
        </Svg>
      );
    } else {
      return null;
    }
  }

  render() {
    const { isLoading, modelName } = this.state;

    // TODO File issue to be able get this from expo.
    // Caller will still need to account for orientation/phone rotation changes
    let textureDims: { width: number; height: number };
    if (Platform.OS === "ios") {
      textureDims = {
        height: 1920,
        width: 1080,
      };
    } else {
      textureDims = {
        height: 1200,
        width: 1600,
      };
    }

    const camView = (
      <View style={styles.cameraContainer}>
        <TensorCamera
          // Standard Camera props
          style={styles.camera}
          type={this.state.cameraType}
          quality={Camera.Constants.VideoQuality["480p"]}
          zoom={0}
          // tensor related props
          cameraTextureHeight={textureDims.height}
          cameraTextureWidth={textureDims.width}
          resizeHeight={inputTensorHeight}
          resizeWidth={inputTensorWidth}
          resizeDepth={3}
          onReady={this.handleImageTensorReady}
          autorender={AUTORENDER}
        />
        <View style={styles.modelResults}>
          {modelName === "posenet" ? this.renderFaces() : this.renderFaces()}
        </View>
      </View>
    );

    return (
      <View style={{ width: "100%" }}>
        <View style={styles.sectionContainer}>
          <Button onPress={this.props.returnToMain} title="Back" />
        </View>
        {isLoading ? (
          <View style={[styles.loadingIndicator]}>
            <ActivityIndicator size="large" color="#FF0266" />
          </View>
        ) : (
          camView
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  loadingIndicator: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 200,
  },
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  cameraContainer: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
    backgroundColor: "#fff",
  },
  camera: {
    position: "absolute",
    left: 50,
    top: 100,
    width: 600 / 2,
    height: 800 / 2,
    zIndex: 1,
    borderWidth: 1,
    borderColor: "black",
    borderRadius: 0,
  },
  modelResults: {
    position: "absolute",
    left: 50,
    top: 100,
    width: 600 / 2,
    height: 800 / 2,
    zIndex: 20,
    borderWidth: 1,
    borderColor: "black",
    borderRadius: 0,
  },
});
