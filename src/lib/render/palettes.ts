export const PALETTES: Record<string, string[]> = {
  phosphor: ["#00FF41", "#00CC33", "#009926", "#33FF66", "#66FF99"],
  crt_warm: ["#FFD700", "#FF8C00", "#FF6347", "#FFE4B5", "#FFA500"],
  ice: ["#00CCFF", "#00FFFF", "#87CEEB", "#4169E1", "#1E90FF"],
  magenta_burn: ["#FF0055", "#FF1493", "#FF69B4", "#C71585", "#FF00FF"],
  monochrome: ["#FFFFFF", "#CCCCCC", "#999999", "#666666", "#E0E0E0"],
  custom: ["#00FF41", "#FF0055", "#FFD700", "#00CCFF", "#FF00FF"],
  // CGA palette mode 1 — cyan/magenta/white (classic CGA)
  cga_mode1: ["#55FFFF", "#FF55FF", "#FFFFFF", "#55FFFF", "#FF55FF"],
  // CGA palette mode 0 — red/green/yellow
  cga_mode0: ["#FF5555", "#55FF55", "#FFFF55", "#FF5555", "#55FF55"],
  // Amber terminal — P7 phosphor monochrome
  amber: ["#FFB000", "#FF8C00", "#CC7000", "#FFD060", "#FFCC00"],
  // Tandy 1000 — full CGA rainbow
  tandy: ["#5555FF", "#55FF55", "#FF5555", "#FFFF55", "#FF55FF"],
  // IBM 5153 — blue/cyan cold CRT
  ibm_cold: ["#5555FF", "#55FFFF", "#0000AA", "#00AAAA", "#FFFFFF"],
  // Sierra adventure — earthy CGA tones
  sierra: ["#AA0000", "#00AA00", "#AA5500", "#FFFF55", "#FF5555"],
};

export function getPalette(name: string): string[] {
  return PALETTES[name] ?? PALETTES.phosphor!;
}
