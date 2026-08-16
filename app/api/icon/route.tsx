import { ImageResponse } from "next/og";

const HEART = [
  ".PP..PP.",
  "PPPPPPPP",
  "PPPPPPPP",
  "PPPPPPPP",
  ".PPPPPP.",
  "..PPPP..",
  "...PP...",
  "........",
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const size = Math.min(Number(searchParams.get("size") ?? 512) || 512, 512);
  const cell = size / 8;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#150b20",
        }}
      >
        {HEART.map((row, y) => (
          <div key={y} style={{ display: "flex" }}>
            {row
              .split("")
              .map((ch, x) => (
                <div
                  key={x}
                  style={{
                    width: cell,
                    height: cell,
                    backgroundColor: ch === "P" ? "#ff5da2" : "#150b20",
                  }}
                />
              ))}
          </div>
        ))}
      </div>
    ),
    { width: size, height: size }
  );
}