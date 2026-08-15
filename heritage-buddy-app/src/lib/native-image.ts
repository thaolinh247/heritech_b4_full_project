import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import jpeg from "jpeg-js";

const INPUT_SIZE = 28;

function base64ToBytes(base64: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  // Fallback thủ công khi môi trường không có atob
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of base64) {
    if (ch === "=") break;
    const value = chars.indexOf(ch);
    if (value < 0) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

// Giải mã JPEG → grayscale 28x28 (luminance + box-average, giống bản web ml/sign.ts).
// Hoạt động với mọi kích thước ảnh đầu vào.
function jpegBytesToInput(bytes: Uint8Array): Float32Array {
  const decoded = jpeg.decode(bytes, { useTArray: true });
  const rgba = decoded.data as Uint8Array;
  const { width, height } = decoded;

  const input = new Float32Array(INPUT_SIZE * INPUT_SIZE);
  for (let oy = 0; oy < INPUT_SIZE; oy += 1) {
    for (let ox = 0; ox < INPUT_SIZE; ox += 1) {
      const x0 = Math.floor((ox * width) / INPUT_SIZE);
      const x1 = Math.floor(((ox + 1) * width) / INPUT_SIZE);
      const y0 = Math.floor((oy * height) / INPUT_SIZE);
      const y1 = Math.floor(((oy + 1) * height) / INPUT_SIZE);
      let r = 0;
      let g = 0;
      let b = 0;
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const px = y * width + x;
          r += rgba[px * 4];
          g += rgba[px * 4 + 1];
          b += rgba[px * 4 + 2];
        }
      }
      const count = (x1 - x0) * (y1 - y0);
      input[oy * INPUT_SIZE + ox] = ((r / count) * 299 + (g / count) * 587 + (b / count) * 114) / 255000;
    }
  }
  return input;
}

// Chuyển ảnh camera/ảnh chọn từ máy (native) thành mảng pixel 28x28 grayscale
// đúng định dạng model — cùng công thức crop/luminance với bản web (ml/sign.ts).
export async function photoUriToInput(uri: string): Promise<Float32Array> {
  // 1) Đọc kích thước ảnh gốc để tính crop vuông 82% giữa (giống bản web)
  const probe = ImageManipulator.manipulate(uri);
  const probeImage = await probe.renderAsync();
  const { width, height } = probeImage;

  const side = Math.min(width, height) * 0.82;
  const left = (width - side) / 2;
  const top = (height - side) / 2;

  // 2) Crop + resize 224x224 bằng native (nhanh, không decode JPEG lớn)
  const context = ImageManipulator.manipulate(uri);
  context.crop({ originX: left, originY: top, width: side, height: side });
  context.resize({ width: 224, height: 224 });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ base64: true, format: SaveFormat.JPEG, compress: 0.9 });

  const base64 = result.base64;
  if (!base64) throw new Error("Không đọc được ảnh đã chụp");

  // 3) Giải mã JPEG (jpeg-js thuần JS, useTArray để không cần Buffer)
  return jpegBytesToInput(base64ToBytes(base64));
}
