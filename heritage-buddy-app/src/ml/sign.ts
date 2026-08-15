import { SIGN_MODEL } from "@/ml/sign-model";
import { EmbeddedNetwork } from "@/ml/runtime";
import { Platform } from "react-native";
import { photoUriToInput } from "@/lib/native-image";

const INPUT_SIZE = 28;
const MIN_CONFIDENCE = 0.35;
const LETTERS = SIGN_MODEL.extra?.letters ?? "";
const network = new EmbeddedNetwork(SIGN_MODEL);

export interface SignPrediction {
  letter: string;
  confidence: number;
  confident: boolean;
  alternatives: { letter: string; confidence: number }[];
  tookMs: number;
}

export const SIGN_TEST_ACCURACY = SIGN_MODEL.testAccuracy;
export const SIGN_LETTERS = LETTERS;
export const SIGN_SOURCE = SIGN_MODEL.extra?.source ?? "";
export const SIGN_LICENSE = SIGN_MODEL.extra?.license ?? "";

function loadBrowserImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Không đọc được ảnh đã chọn"));
    image.src = uri;
  });
}

async function imageToInput(uri: string, isPreparedSample: boolean): Promise<Float32Array> {
  // Native (iOS/Android): không có canvas → decode ảnh qua expo-image-manipulator + jpeg-js
  if (Platform.OS !== "web") {
    return photoUriToInput(uri);
  }

  if (typeof document === "undefined") {
    throw new Error("Bản thử nghiệm hiện chạy nhận diện trên trình duyệt");
  }

  const image = await loadBrowserImage(uri);
  const canvas = document.createElement("canvas");
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh");

  if (isPreparedSample) {
    context.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, 0, 0, INPUT_SIZE, INPUT_SIZE);
  } else {
    const side = Math.min(image.naturalWidth, image.naturalHeight) * 0.82;
    const left = (image.naturalWidth - side) / 2;
    const top = (image.naturalHeight - side) / 2;
    context.drawImage(image, left, top, side, side, 0, 0, INPUT_SIZE, INPUT_SIZE);
  }

  const rgba = context.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
  const input = new Float32Array(INPUT_SIZE * INPUT_SIZE);
  for (let index = 0; index < input.length; index += 1) {
    const offset = index * 4;
    input[index] = (rgba[offset] * 299 + rgba[offset + 1] * 587 + rgba[offset + 2] * 114) / 255000;
  }
  return input;
}

function probabilitiesFor(input: Float32Array, invert: boolean): Float32Array {
  if (!invert) return network.predict(input);
  const inverted = Float32Array.from(input, (value) => 1 - value);
  return network.predict(inverted);
}

export async function recognizeSign(uri: string, isPreparedSample = false): Promise<SignPrediction> {
  const startedAt = performance.now();
  const input = await imageToInput(uri, isPreparedSample);
  return recognizeFromInput(input, startedAt);
}

// Nhận diện từ input 28x28 đã có sẵn (native: ảnh đã decode sẵn thành pixel)
export function recognizeFromInput(input: Float32Array, startedAt = performance.now()): SignPrediction {
  const normal = probabilitiesFor(input, false);
  const inverted = probabilitiesFor(input, true);
  const maxNormal = Math.max(...normal);
  const maxInverted = Math.max(...inverted);
  const probabilities = maxNormal >= maxInverted ? normal : inverted;

  const alternatives = Array.from(probabilities)
    .map((confidence, index) => ({ letter: LETTERS[index] ?? "?", confidence }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
  const best = alternatives[0];

  return {
    letter: best.letter,
    confidence: best.confidence,
    confident: best.confidence >= MIN_CONFIDENCE,
    alternatives,
    tookMs: Math.round(performance.now() - startedAt),
  };
}
