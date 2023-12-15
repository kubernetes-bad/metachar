import cv, { ImageData } from '@techstark/opencv-js';
import * as codecs from '@astropub/codecs';

export async function loadDataFile(cvFilePath: string, url: string) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const data = new Uint8Array(buffer);
  cv.FS_createDataFile("/", cvFilePath, data, true, false, false);
}

export async function loadHaarFaceModels() {
  return loadDataFile(
    "haarcascade_frontalface_default.xml",
    "https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml",
  );
}

export async function detectHaarFace(img: cv.Mat) {
  const newImg = img.clone();

  const gray = new cv.Mat();
  cv.cvtColor(newImg, gray, cv.COLOR_RGBA2GRAY, 0);

  const faces = new cv.RectVector();
  const faceCascade = new cv.CascadeClassifier();
  faceCascade.load("haarcascade_frontalface_default.xml");


  const foundFaces: { x: number, y: number, width: number, height: number }[] =  [];
  // detect faces
  const msize = new cv.Size(0, 0);
  faceCascade.detectMultiScale(gray, faces, 1.1, 3, 0, msize, msize);
  for (let i = 0; i < faces.size(); ++i) {
    foundFaces.push({
      x: faces.get(i).x,
      y: faces.get(i).y,
      width: faces.get(i).width,
      height: faces.get(i).height,
    });
  }

  gray.delete();
  faceCascade.delete();
  faces.delete();

  return foundFaces;
}

function processImage(imgSrc: ImageData) {
  if (!imgSrc) return [];
  const img = cv.matFromImageData(imgSrc)
  const faces = detectHaarFace(img);
  img.delete();
  return faces;
}

export async function detectFaces(imageBuffer: ArrayBuffer) {
  const imageData = await codecs.decode(imageBuffer);
  return processImage(imageData);
}
