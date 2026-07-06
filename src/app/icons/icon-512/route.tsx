import { ImageResponse } from "next/og";
import { PwaIconImage } from "@/lib/pwa-icon-image";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(<PwaIconImage size={512} />, {
    width: 512,
    height: 512,
  });
}
