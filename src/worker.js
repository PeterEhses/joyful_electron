const electron = require('electron');
const ipcRenderer = electron.ipcRenderer;

import * as faceapi from 'face-api.js';

// init detection options
const minConfidenceFace = 0.5;
const faceapiOptions = new faceapi.SsdMobilenetv1Options({ minConfidenceFace });

// cam reference
let cam;

let isRunning = true;
let isReady = false;

// configure face API
faceapi.env.monkeyPatch({
  Canvas: HTMLCanvasElement,
  Image: HTMLImageElement,
  ImageData: ImageData,
  Video: HTMLVideoElement,
  createCanvasElement: () => document.createElement('canvas'),
  createImageElement: () => document.createElement('img')
});

const loadNet = async () => {

  const detectionNet = faceapi.nets.ssdMobilenetv1;
  await detectionNet.load('/data/weights');
  await faceapi.loadFaceExpressionModel('/data/weights');
};

const initCamera = async (width, height) => {

  const video = document.getElementById('cam');
  video.width = width;
  video.height = height;

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: "user",
      width: width,
      height: height
    }
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
};

const detectExpressions = async () => {

  // detect expression
  let result = await faceapi.detectSingleFace(cam, faceapiOptions)
    .withFaceExpressions();

  if(!isReady) {
    isReady = true;
    onReady();
  }

  if(typeof result !== 'undefined') {

    if(result.expressions) {
      let res = result.expressions
      onExpression(res);
    }
  }

  if(isRunning) {
    detectExpressions();
  }
};

let onReady = () => {
  notifyRenderer('ready', {});
};

let onExpression = (expressions) => {
  notifyRenderer('expressions', {
    "expressions": expressions
  });
};

let notifyRenderer = (command, payload) => {

  // notify renderer
  ipcRenderer.send('window-message-from-worker', {
    command: command, payload: payload
  });
}

loadNet()
.then(_ => {
  console.log('Network has loaded');
  return initCamera(640, 480);
})
.then(video => {
  console.log('Camera was initialized');
  cam = video;
  detectExpressions();
});
