import {
  DEFAULT_GENERAL_SCREEN_BACKGROUND_COLOR,
  DEFAULT_GENERAL_SCREEN_FONT_FAMILY,
  DEFAULT_GENERAL_SCREEN_FONT_SIZE,
  type GeneralScreenFontFamily,
  normalizeHexColor,
  resolveGeneralScreenFontFamily,
  resolveGeneralScreenFontSize,
} from "@/lib/generalScreenAppearance";

export type ScreenTextAlignment = "left" | "center";
export type ScreenContentWidth = "standard" | "wide";
export type ScreenResultDensity = "comfortable" | "compact";
export type ScreenQrSize = "medium" | "large";
export type ScreenPreviewView = "general" | "qr" | "question" | "results" | "ranking" | "pause";

export type PresentationScreenSettings = {
  general: {
    useGradient: boolean;
    gradientColor: string;
    alignment: ScreenTextAlignment;
    showSessionCode: boolean;
  };
  qr: {
    welcomeText: string;
    size: ScreenQrSize;
    showTitle: boolean;
    showSessionCode: boolean;
  };
  question: {
    backgroundColor: string;
    alignment: ScreenTextAlignment;
    contentWidth: ScreenContentWidth;
    showResponseCount: boolean;
  };
  results: {
    accentColor: string;
    density: ScreenResultDensity;
    highlightCorrectAnswer: boolean;
  };
  ranking: {
    visibleEntries: number;
    showScores: boolean;
    emphasizeTopThree: boolean;
  };
  pause: {
    message: string;
    showMessage: boolean;
  };
};

export type ScreenConfiguration = {
  idleScreenText: string;
  generalScreenBackgroundColor: string;
  generalScreenFontFamily: GeneralScreenFontFamily;
  generalScreenFontSize: number;
  screenSettings: PresentationScreenSettings;
};

export type ScreenStylePreset = {
  id: "dark-glass" | "brand-green" | "black-minimal" | "high-contrast";
  label: string;
  description: string;
  configuration: Omit<ScreenConfiguration, "idleScreenText">;
};

export const DEFAULT_SCREEN_SETTINGS: PresentationScreenSettings = {
  general: {
    useGradient: true,
    gradientColor: "#00963E",
    alignment: "center",
    showSessionCode: false,
  },
  qr: {
    welcomeText: "Scan de QR-code",
    size: "large",
    showTitle: true,
    showSessionCode: true,
  },
  question: {
    backgroundColor: DEFAULT_GENERAL_SCREEN_BACKGROUND_COLOR,
    alignment: "center",
    contentWidth: "standard",
    showResponseCount: true,
  },
  results: {
    accentColor: "#38BDF8",
    density: "comfortable",
    highlightCorrectAnswer: true,
  },
  ranking: {
    visibleEntries: 15,
    showScores: true,
    emphasizeTopThree: true,
  },
  pause: {
    message: "Even pauze",
    showMessage: true,
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function recordAt(value: Record<string, unknown>, key: string) {
  return isRecord(value[key]) ? value[key] : {};
}

function booleanAt(value: Record<string, unknown>, key: string, fallback: boolean) {
  return typeof value[key] === "boolean" ? value[key] : fallback;
}

function textAt(value: Record<string, unknown>, key: string, fallback: string, maxLength: number) {
  return typeof value[key] === "string" ? value[key].trim().slice(0, maxLength) : fallback;
}

function colorAt(value: Record<string, unknown>, key: string, fallback: string) {
  return normalizeHexColor(value[key]) ?? fallback;
}

function parseSettingsInput(value: unknown): Record<string, unknown> {
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return isRecord(value) ? value : {};
}

export function cloneScreenSettings(settings: PresentationScreenSettings) {
  return JSON.parse(JSON.stringify(settings)) as PresentationScreenSettings;
}

export function normalizeScreenSettings(value: unknown): PresentationScreenSettings {
  const source = parseSettingsInput(value);
  const general = recordAt(source, "general");
  const qr = recordAt(source, "qr");
  const question = recordAt(source, "question");
  const results = recordAt(source, "results");
  const ranking = recordAt(source, "ranking");
  const pause = recordAt(source, "pause");
  const visibleEntries = Number(ranking.visibleEntries);

  return {
    general: {
      useGradient: booleanAt(general, "useGradient", DEFAULT_SCREEN_SETTINGS.general.useGradient),
      gradientColor: colorAt(general, "gradientColor", DEFAULT_SCREEN_SETTINGS.general.gradientColor),
      alignment: general.alignment === "left" ? "left" : "center",
      showSessionCode: booleanAt(
        general,
        "showSessionCode",
        DEFAULT_SCREEN_SETTINGS.general.showSessionCode
      ),
    },
    qr: {
      welcomeText: textAt(qr, "welcomeText", DEFAULT_SCREEN_SETTINGS.qr.welcomeText, 90),
      size: qr.size === "medium" ? "medium" : "large",
      showTitle: booleanAt(qr, "showTitle", DEFAULT_SCREEN_SETTINGS.qr.showTitle),
      showSessionCode: booleanAt(qr, "showSessionCode", DEFAULT_SCREEN_SETTINGS.qr.showSessionCode),
    },
    question: {
      backgroundColor: colorAt(
        question,
        "backgroundColor",
        DEFAULT_SCREEN_SETTINGS.question.backgroundColor
      ),
      alignment: question.alignment === "left" ? "left" : "center",
      contentWidth: question.contentWidth === "wide" ? "wide" : "standard",
      showResponseCount: booleanAt(
        question,
        "showResponseCount",
        DEFAULT_SCREEN_SETTINGS.question.showResponseCount
      ),
    },
    results: {
      accentColor: colorAt(results, "accentColor", DEFAULT_SCREEN_SETTINGS.results.accentColor),
      density: results.density === "compact" ? "compact" : "comfortable",
      highlightCorrectAnswer: booleanAt(
        results,
        "highlightCorrectAnswer",
        DEFAULT_SCREEN_SETTINGS.results.highlightCorrectAnswer
      ),
    },
    ranking: {
      visibleEntries: Number.isFinite(visibleEntries)
        ? Math.min(Math.max(Math.round(visibleEntries), 3), 30)
        : DEFAULT_SCREEN_SETTINGS.ranking.visibleEntries,
      showScores: booleanAt(ranking, "showScores", DEFAULT_SCREEN_SETTINGS.ranking.showScores),
      emphasizeTopThree: booleanAt(
        ranking,
        "emphasizeTopThree",
        DEFAULT_SCREEN_SETTINGS.ranking.emphasizeTopThree
      ),
    },
    pause: {
      message: textAt(pause, "message", DEFAULT_SCREEN_SETTINGS.pause.message, 90),
      showMessage: booleanAt(pause, "showMessage", DEFAULT_SCREEN_SETTINGS.pause.showMessage),
    },
  };
}

export function createScreenConfiguration(input: {
  idleScreenText?: unknown;
  title?: unknown;
  generalScreenBackgroundColor?: unknown;
  generalScreenFontFamily?: unknown;
  generalScreenFontSize?: unknown;
  screenSettings?: unknown;
}): ScreenConfiguration {
  const title = typeof input.title === "string" ? input.title : "";
  const idleScreenText =
    typeof input.idleScreenText === "string" && input.idleScreenText.trim()
      ? input.idleScreenText.trim().slice(0, 90)
      : title.trim().slice(0, 90) || "Sessie Interactief";

  return {
    idleScreenText,
    generalScreenBackgroundColor:
      normalizeHexColor(input.generalScreenBackgroundColor) ?? DEFAULT_GENERAL_SCREEN_BACKGROUND_COLOR,
    generalScreenFontFamily: resolveGeneralScreenFontFamily(input.generalScreenFontFamily),
    generalScreenFontSize: resolveGeneralScreenFontSize(input.generalScreenFontSize),
    screenSettings: normalizeScreenSettings(input.screenSettings),
  };
}

function presetSettings(overrides: Partial<PresentationScreenSettings>) {
  return normalizeScreenSettings({
    ...cloneScreenSettings(DEFAULT_SCREEN_SETTINGS),
    ...overrides,
  });
}

export const SCREEN_STYLE_PRESETS: ScreenStylePreset[] = [
  {
    id: "dark-glass",
    label: "Dark Glass",
    description: "Donker glas met groene diepte.",
    configuration: {
      generalScreenBackgroundColor: DEFAULT_GENERAL_SCREEN_BACKGROUND_COLOR,
      generalScreenFontFamily: DEFAULT_GENERAL_SCREEN_FONT_FAMILY,
      generalScreenFontSize: DEFAULT_GENERAL_SCREEN_FONT_SIZE,
      screenSettings: presetSettings({
        general: { ...DEFAULT_SCREEN_SETTINGS.general },
        question: { ...DEFAULT_SCREEN_SETTINGS.question },
        results: { ...DEFAULT_SCREEN_SETTINGS.results },
      }),
    },
  },
  {
    id: "brand-green",
    label: "Merkgroen",
    description: "Groen algemeen scherm met rustig contrast.",
    configuration: {
      generalScreenBackgroundColor: "#063C22",
      generalScreenFontFamily: "trebuchet",
      generalScreenFontSize: 96,
      screenSettings: presetSettings({
        general: {
          ...DEFAULT_SCREEN_SETTINGS.general,
          gradientColor: "#00B84A",
        },
        results: {
          ...DEFAULT_SCREEN_SETTINGS.results,
          accentColor: "#34D399",
        },
      }),
    },
  },
  {
    id: "black-minimal",
    label: "Zwart minimalistisch",
    description: "Volledig zwart, zonder verloop.",
    configuration: {
      generalScreenBackgroundColor: "#000000",
      generalScreenFontFamily: DEFAULT_GENERAL_SCREEN_FONT_FAMILY,
      generalScreenFontSize: 92,
      screenSettings: presetSettings({
        general: {
          ...DEFAULT_SCREEN_SETTINGS.general,
          useGradient: false,
        },
        question: {
          ...DEFAULT_SCREEN_SETTINGS.question,
          backgroundColor: "#000000",
        },
      }),
    },
  },
  {
    id: "high-contrast",
    label: "Hoog contrast",
    description: "Helder wit met zwarte tekst en sterke accenten.",
    configuration: {
      generalScreenBackgroundColor: "#FFFFFF",
      generalScreenFontFamily: "arial",
      generalScreenFontSize: 100,
      screenSettings: presetSettings({
        general: {
          ...DEFAULT_SCREEN_SETTINGS.general,
          useGradient: false,
          showSessionCode: true,
        },
        question: {
          ...DEFAULT_SCREEN_SETTINGS.question,
          backgroundColor: "#FFFFFF",
        },
        results: {
          ...DEFAULT_SCREEN_SETTINGS.results,
          accentColor: "#0057B8",
        },
      }),
    },
  },
];

export function resolvePreviewView(value: unknown): ScreenPreviewView {
  return value === "qr" ||
    value === "question" ||
    value === "results" ||
    value === "ranking" ||
    value === "pause"
    ? value
    : "general";
}

export function hexToRgba(value: unknown, alpha: number) {
  const hex = normalizeHexColor(value);
  if (!hex) {
    return `rgba(0, 150, 62, ${alpha})`;
  }

  const numeric = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(numeric >> 16) & 255}, ${(numeric >> 8) & 255}, ${numeric & 255}, ${alpha})`;
}
