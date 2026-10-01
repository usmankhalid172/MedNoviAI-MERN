import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function downscaleImageDataUrl(
  dataUrl: string,
  maxWidth = 320,
  maxHeight = 320,
  quality = 0.8,
  maxBytes = 60 * 1024
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }

      // JPEG has no alpha channel, so a transparent PNG would otherwise be
      // flattened onto black. Profile pictures are usually transparent, so fill
      // white first.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      let currentQuality = quality;
      let result = canvas.toDataURL("image/jpeg", currentQuality);

      while (result.length > maxBytes && currentQuality > 0.4) {
        currentQuality -= 0.1;
        result = canvas.toDataURL("image/jpeg", currentQuality);
      }

      resolve(result);
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}
