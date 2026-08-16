export const COLOR_OPTIONS = [
  { id: "cyan", hex: "#4de3ff", name: "CYAN" },
  { id: "pink", hex: "#ff5da2", name: "PINK" },
  { id: "gold", hex: "#ffd93d", name: "GOLD" },
  { id: "lime", hex: "#8dff5b", name: "LIME" },
  { id: "violet", hex: "#b78bff", name: "VIOLET" },
  { id: "orange", hex: "#ff9f43", name: "ORANGE" },
];

export function colorHex(id?: string, fallback = "#4de3ff"): string {
  return COLOR_OPTIONS.find((c) => c.id === id)?.hex ?? fallback;
}