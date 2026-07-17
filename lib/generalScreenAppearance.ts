export const DEFAULT_GENERAL_SCREEN_BACKGROUND_COLOR = "#09090B";
export const DEFAULT_GENERAL_SCREEN_FONT_FAMILY = "system";
export const DEFAULT_GENERAL_SCREEN_FONT_SIZE = 96;
export const MIN_GENERAL_SCREEN_FONT_SIZE = 56;
export const MAX_GENERAL_SCREEN_FONT_SIZE = 132;

export const GENERAL_SCREEN_FONT_OPTIONS = [
  {
    id: "system",
    label: "Standaard",
    css: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  { id: "arial", label: "Arial", css: "Arial, Helvetica, sans-serif" },
  { id: "verdana", label: "Verdana", css: "Verdana, Geneva, sans-serif" },
  { id: "tahoma", label: "Tahoma", css: "Tahoma, Geneva, sans-serif" },
  { id: "trebuchet", label: "Trebuchet MS", css: '"Trebuchet MS", Arial, sans-serif' },
  { id: "georgia", label: "Georgia", css: "Georgia, serif" },
  { id: "times", label: "Times New Roman", css: '"Times New Roman", Times, serif' },
  { id: "courier", label: "Courier New", css: '"Courier New", Courier, monospace' },
  { id: "impact", label: "Impact", css: "Impact, Haettenschweiler, sans-serif" },
] as const;

export type GeneralScreenFontFamily = (typeof GENERAL_SCREEN_FONT_OPTIONS)[number]["id"];

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

export function resolveGeneralScreenFontFamily(value: unknown): GeneralScreenFontFamily {
  if (typeof value !== "string") {
    return DEFAULT_GENERAL_SCREEN_FONT_FAMILY;
  }

  return GENERAL_SCREEN_FONT_OPTIONS.some((option) => option.id === value)
    ? (value as GeneralScreenFontFamily)
    : DEFAULT_GENERAL_SCREEN_FONT_FAMILY;
}

export function normalizeGeneralScreenFontFamily(value: unknown) {
  const resolved = resolveGeneralScreenFontFamily(value);
  return resolved === DEFAULT_GENERAL_SCREEN_FONT_FAMILY ? null : resolved;
}

export function getGeneralScreenFontOption(value: unknown) {
  const resolved = resolveGeneralScreenFontFamily(value);
  return (
    GENERAL_SCREEN_FONT_OPTIONS.find((option) => option.id === resolved) ??
    GENERAL_SCREEN_FONT_OPTIONS[0]
  );
}

export function resolveGeneralScreenFontSize(value: unknown) {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : DEFAULT_GENERAL_SCREEN_FONT_SIZE;

  if (!Number.isFinite(numeric)) {
    return DEFAULT_GENERAL_SCREEN_FONT_SIZE;
  }

  return Math.min(
    Math.max(Math.round(numeric), MIN_GENERAL_SCREEN_FONT_SIZE),
    MAX_GENERAL_SCREEN_FONT_SIZE
  );
}

export function normalizeGeneralScreenFontSize(value: unknown) {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;

  if (
    !Number.isFinite(numeric) ||
    numeric < MIN_GENERAL_SCREEN_FONT_SIZE ||
    numeric > MAX_GENERAL_SCREEN_FONT_SIZE
  ) {
    return null;
  }

  const rounded = Math.round(numeric);
  return rounded === DEFAULT_GENERAL_SCREEN_FONT_SIZE ? null : rounded;
}

export function isValidGeneralScreenFontSize(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return true;
  }

  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;

  return (
    Number.isFinite(numeric) &&
    numeric >= MIN_GENERAL_SCREEN_FONT_SIZE &&
    numeric <= MAX_GENERAL_SCREEN_FONT_SIZE
  );
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

export function getGeneralScreenContrastInfo(backgroundColorInput: unknown) {
  const background = resolveGeneralScreenBackgroundColor(backgroundColorInput);
  const luminance = relativeLuminance(background);
  const whiteContrast = contrastRatio(1, luminance);
  const darkContrast = contrastRatio(0.01, luminance);
  const useDarkText = darkContrast >= whiteContrast;

  return {
    background,
    foreground: useDarkText ? "#111827" : "#FFFFFF",
    ratio: Math.max(whiteContrast, darkContrast),
    passesAA: Math.max(whiteContrast, darkContrast) >= 4.5,
  };
}
