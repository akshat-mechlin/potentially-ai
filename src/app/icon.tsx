import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 8,
        }}
      >
        <div style={{ fontSize: 20, color: "#F9F8F3", fontWeight: 700 }}>P</div>
      </div>
    ),
    { ...size },
  );
}
