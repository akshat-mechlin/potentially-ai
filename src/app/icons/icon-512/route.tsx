import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#4A6741",
        }}
      >
        <div style={{ fontSize: 256, color: "#F9F8F3", fontWeight: 700 }}>P</div>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
