import { ImageResponse } from "next/og";

const RED = "#FF4B4B";
const GREEN = "#58CC02";
const GRADIENT =
  "linear-gradient(140deg, #FFB1CE 0%, #FF9ED9 22%, #E093FF 50%, #B597FF 78%, #8FB6FF 100%)";

export function renderPradoIcon(dim: number, fontData: Buffer) {
  const fontSize = dim * 0.62;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: GRADIENT,
          fontFamily: "Fredoka",
          fontSize,
          lineHeight: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            paddingBottom: dim * 0.04,
            filter: `drop-shadow(0 ${dim * 0.04}px ${dim * 0.06}px rgba(60, 25, 100, 0.32))`,
          }}
        >
          <div
            style={{
              display: "flex",
              color: RED,
              transform: "rotate(-4deg)",
            }}
          >
            P
          </div>
          <div
            style={{
              display: "flex",
              color: GREEN,
              transform: "rotate(3deg)",
              marginLeft: dim * -0.02,
            }}
          >
            t
          </div>
        </div>
      </div>
    ),
    {
      width: dim,
      height: dim,
      fonts: [
        {
          name: "Fredoka",
          data: fontData,
          weight: 600,
          style: "normal",
        },
      ],
    },
  );
}
