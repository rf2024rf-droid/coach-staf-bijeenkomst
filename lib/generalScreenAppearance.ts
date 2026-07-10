export const DEFAULT_GENERAL_SCREEN_BACKGROUND_COLOR = "#09090B";

const HEX_COLOR_PATTERN = /^#?[0-9a-f]{6}$/i;

function expandHex(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

export function normalizeHexColor(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const expanded = expandHex(value);
  if (!HEX_COLOR_PATTERN.test(expanded)) {
    return null;
  }

  return expanded.toUpperCase();
}

export function normalizeGeneralScreenBackgroundColor(value: unknown) {
  const normalized = normalizeHexColor(value);
  if (!normalized || normalized === DEFAULT_GENERAL_SCREEN_BACKGROUND_COLOR) {
    return null;
  }

  return normalized;
}

export function resolveGeneralScreenBackgroundColor(value: unknown) {
  return normalizeHexColor(value) ?? DEFAULT_GENERAL_SCREEN_BACKGROUND_COLOR;
}

function hexToRgb(hex: string) {
  const normalized = resolveGeneralScreenBackgroundColor(hex).slice(1);
  const numeric = Number.parseInt(normalized, 16);

  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255,
  };
}

function luminanceChannel(value: number) {
  const normalized = value / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return (
    0.2126 * luminanceChannel(r) +
    0.7152 * luminanceChannel(g) +
    0.0722 * luminanceChannel(b)
  );
}

function contrastRatio(first: number, second: number) {
  const light = Math.max(first, second);
  const dark = Math.min(first, second);
  return (light + 0.05) / (dark + 0.05);
}

export function getGeneralScreenPalette(backgroundColorInput: unknown) {
  const background = resolveGeneralScreenBackgroundColor(backgroundColorInput);
  const luminance = relativeLuminance(background);
  const whiteContrast = contrastRatio(1, luminance);
  const darkContrast = contrastRatio(0.01, luminance);
  const useDarkText = darkContrast >= whiteContrast;

  return {
    background,
    foreground: useDarkText ? "#111827" : "#FFFFFF",
    muted: useDarkText ? "#3F3F46" : "#E4E4E7",
    subtle: useDarkText ? "#047857" : "#6EE7B7",
    border: useDarkText ? "rgba(17, 24, 39, 0.18)" : "rgba(255, 255, 255, 0.22)",
    panel: useDarkText ? "rgba(255, 255, 255, 0.72)" : "rgba(24, 24, 27, 0.76)",
    panelStrong: useDarkText ? "rgba(255, 255, 255, 0.88)" : "rgba(24, 24, 27, 0.88)",
    badgeBackground: useDarkText ? "rgba(17, 24, 39, 0.92)" : "rgba(255, 255, 255, 0.92)",
    badgeForeground: useDarkText ? "#FFFFFF" : "#111827",
  };
}
