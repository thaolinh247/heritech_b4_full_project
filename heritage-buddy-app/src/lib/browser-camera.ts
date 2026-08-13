export async function captureBrowserCamera(): Promise<string> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera không khả dụng trong trình duyệt này");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
    audio: false,
  });

  try {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
    await new Promise((resolve) => window.setTimeout(resolve, 900));

    const size = Math.min(video.videoWidth, video.videoHeight);
    if (size <= 0) throw new Error("Camera chưa trả về khung hình");
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Không tạo được khung chụp");
    context.translate(size, 0);
    context.scale(-1, 1);
    context.drawImage(
      video,
      (video.videoWidth - size) / 2,
      (video.videoHeight - size) / 2,
      size,
      size,
      0,
      0,
      size,
      size,
    );
    return canvas.toDataURL("image/jpeg", 0.9);
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

export function pickBrowserImage(): Promise<string> {
  if (typeof document === "undefined") {
    return Promise.reject(new Error("Chọn ảnh chỉ khả dụng trên trình duyệt"));
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.setAttribute("capture", "environment");
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error("Bạn chưa chọn ảnh"));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Không đọc được ảnh đã chọn"));
      reader.readAsDataURL(file);
    };
    input.click();
  });
}
