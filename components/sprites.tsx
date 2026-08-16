export const SPRITES: Record<string, string[]> = {
  code: [
    "........",
    "WWWWWWWW",
    "WCCCCCCW",
    "WCCCCCCW",
    "WCCCCCCW",
    "WWWWWWWW",
    ".WWWWWW.",
    "........",
  ],
  drive: [
    "........",
    "..RRRR..",
    ".RCCCCR.",
    "RRRRRRRR",
    "YRRRRRRY",
    ".BB..BB.",
    ".BB..BB.",
    "........",
  ],
  train: [
    "........",
    "........",
    "GG....GG",
    "GGGGGGGG",
    "GGGGGGGG",
    "GG....GG",
    "........",
    "........",
  ],
  flame: [
    "...O....",
    "...OO...",
    "..OOO...",
    ".OOOOO..",
    ".OYYYO..",
    "OYYYYYO.",
    "OYYYYYO.",
    ".OOOOO..",
  ],
  heart: [
    ".PP..PP.",
    "PPPPPPPP",
    "PPPPPPPP",
    "PPPPPPPP",
    ".PPPPPP.",
    "..PPPP..",
    "...PP...",
    "........",
  ],
};

export const SPRITE_PALETTES: Record<string, Record<string, string>> = {
  code: { W: "#d7e0ea", C: "#4de3ff" },
  drive: { R: "#ff4d6d", C: "#4de3ff", Y: "#ffd93d", G: "#aab2c0" },
  train: { G: "#8dff5b" },
  flame: { O: "#ff9f43", Y: "#ffd93d" },
};

export function Px({
  rows,
  palette,
  className,
  glow,
}: {
  rows: string[];
  palette: Record<string, string>;
  className?: string;
  glow?: string;
}) {
  return (
    <svg
      viewBox="0 0 8 8"
      className={className}
      shapeRendering="crispEdges"
      style={glow ? { filter: `drop-shadow(0 0 5px ${glow})` } : undefined}
    >
      {rows.flatMap((row, y) =>
        row
          .split("")
          .map((ch, x) =>
            ch === "." ? null : (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width={1}
                height={1}
                fill={palette[ch]}
              />
            )
          )
      )}
    </svg>
  );
}