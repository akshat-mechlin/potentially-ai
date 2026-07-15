import type { Area } from "react-easy-crop";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Failed to load image")));
    image.crossOrigin = "anonymous";
    image.src = src;
  });
}

/** Export a square crop as a JPEG File for avatar upload. */
export async function getCroppedAvatarFile(
  imageSrc: string,
  pixelCrop: Area,
  fileName = "avatar.jpg",
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const size = Math.round(Math.min(pixelCrop.width, pixelCrop.height));
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not crop image");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) reject(new Error("Could not export cropped image"));
        else resolve(result);
      },
      "image/jpeg",
      0.92,
    );
  });

  return new File([blob], fileName, { type: "image/jpeg" });
}

export function createObjectUrl(file: File) {
  return URL.createObjectURL(file);
}
