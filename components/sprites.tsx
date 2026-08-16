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
  book: [
    "........",
    "BB....BB",
    "BWB..BWB",
    "BWWBBWWB",
    "BWWWWWWB",
    "BWWWWWWB",
    ".BBBBBB.",
    "........",
  ],
  water: [
    "...C....",
    "...CC...",
    "..CCCC..",
    ".CCCCCC.",
    ".CLCCCC.",
    ".CCCCCC.",
    "..CCCC..",
    "........",
  ],
  moon: [
    "..MMMM..",
    ".MM.....",
    "MM......",
    "MM......",
    "MM......",
    ".MM.....",
    "..MMMM..",
    "........",
  ],
};

export const SPRITE_PALETTES: Record<string, Record<string, string>> = {
  code: { W: "#d7e0ea", C: "#4de3ff" },
  drive: { R: "#ff4d6d", C: "#4de3ff", Y: "#ffd93d", G: "#aab2c0" },
  train: { G: "#8dff5b" },
  flame: { O: "#ff9f43", Y: "#ffd93d" },
  heart: { P: "#ff5da2" },
  book: { B: "#b0713f", W: "#f2ead8" },
  water: { C: "#4de3ff", L: "#d8f8ff" },
  moon: { M: "#ffd93d" },
};

export const SPRITE_OPTIONS = [
  "code",
  "drive",
  "train",
  "book",
  "water",
  "moon",
  "flame",
  "heart",
];

export function Px({
  rows,
  palette,
  className,
  glow,
}: {
  rows: string[];
  palette?: Record<string, string>;
  className?: string;
  glow?: string;
}) {
  const colors = palette ?? {};
  return (
    <svg
      viewBox="0 0 8 8"
      className={className}
      shapeRendering="crispEdges"
      style={glow ? { filter: `drop-shadow(0 0 5px ${glow})` } : undefined}
    >
      {rows.flatMap((row, y) =>
        row.split("").map((ch, x) => {
          const fill = colors[ch];
          if (ch === "." || !fill) return null;
          return (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={fill}
            />
          );
        }),
      )}
    </svg>
  );
}
