"use client";

import {
  BarChart3,
  Check,
  Clipboard,
  Copy,
  ExternalLink,
  Home,
  Monitor,
  PauseCircle,
  QrCode,
  RotateCcw,
  Save,
  Trophy,
  Undo2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_GENERAL_SCREEN_BACKGROUND_COLOR,
  DEFAULT_GENERAL_SCREEN_FONT_FAMILY,
  DEFAULT_GENERAL_SCREEN_FONT_SIZE,
  GENERAL_SCREEN_FONT_OPTIONS,
  MAX_GENERAL_SCREEN_FONT_SIZE,
  MIN_GENERAL_SCREEN_FONT_SIZE,
  getGeneralScreenContrastInfo,
  normalizeHexColor,
} from "@/lib/generalScreenAppearance";
import {
  DEFAULT_SCREEN_SETTINGS,
  SCREEN_STYLE_PRESETS,
  cloneScreenSettings,
  createScreenConfiguration,
  type PresentationScreenSettings,
  type ScreenConfiguration,
  type ScreenPreviewView,
} from "@/lib/screenSettings";

type ScreenSettingsPanelProps = {
  code: string;
  configuration: ScreenConfiguration;
  dirty: boolean;
  error: string;
  lastSeenAt: string | null;
  onChange: (configuration: ScreenConfiguration) => void;
  onDiscard: () => void;
  onRefreshConnection: () => void;
  onSave: () => void;
  presentationTitle: string;
  saving: boolean;
  screenConnected: boolean;
  screenLink: string;
};

const SCENES: Array<{
  id: ScreenPreviewView;
  label: string;
  icon: typeof Home;
}> = [
  { id: "general", label: "Algemeen", icon: Home },
  { id: "qr", label: "QR", icon: QrCode },
  { id: "question", label: "Vraag", icon: Monitor },
  { id: "results", label: "Resultaten", icon: BarChart3 },
  { id: "ranking", label: "Stand", icon: Trophy },
  { id: "pause", label: "Pauze", icon: PauseCircle },
];

const TRANSFER_KEY = "sessie-interactief-screen-style";

function fieldClass(invalid = false) {
  return `mt-1.5 w-full rounded-lg border bg-white/[0.07] px-3 py-2.5 text-sm font-semibold text-white outline-none transition placeholder:text-zinc-500 focus:ring-2 ${
    invalid
      ? "border-rose-400/70 focus:border-rose-300 focus:ring-rose-400/15"
      : "border-white/15 focus:border-emerald-300/70 focus:ring-emerald-300/15"
  }`;
}

function settingSectionClass() {
  return "rounded-lg border border-white/10 bg-white/[0.035] p-3 md:p-4";
}

function ColorControl({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const normalized = normalizeHexColor(value);
  const invalid = Boolean(value.trim() && !normalized);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-bold text-zinc-200" htmlFor={`${id}-hex`}>
          {label}
        </label>
        <span className="font-mono text-xs font-bold text-zinc-400">
          {normalized ?? "Ongeldige HEX"}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-[48px_minmax(0,1fr)_44px] items-center gap-2">
        <input
          aria-label={`${label} kiezen`}
          className="h-11 w-12 cursor-pointer rounded-lg border border-white/15 bg-white/[0.07] p-1"
          id={id}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          type="color"
          value={normalized ?? DEFAULT_GENERAL_SCREEN_BACKGROUND_COLOR}
        />
        <input
          aria-invalid={invalid}
          className={`${fieldClass(invalid)} mt-0 font-mono uppercase`}
          id={`${id}-hex`}
          maxLength={7}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          placeholder="#09090B"
          spellCheck={false}
          value={value}
        />
        <span
          aria-hidden="true"
          className="h-11 rounded-lg border border-white/15 shadow-inner"
          style={{ backgroundColor: normalized ?? DEFAULT_GENERAL_SCREEN_BACKGROUND_COLOR }}
        />
      </div>
      {invalid ? <p className="mt-1.5 text-xs font-semibold text-rose-300">Gebruik zes HEX-tekens, bijvoorbeeld #00963E.</p> : null}
    </div>
  );
}

function ToggleRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-lg border border-white/10 bg-black/15 px-3 py-2.5">
      <span className="text-sm font-bold text-zinc-200">{label}</span>
      <input
        checked={checked}
        className="h-5 w-5 accent-emerald-400"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}

function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-bold text-zinc-200">{label}</legend>
      <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
        {options.map((option) => (
          <button
            className={`min-h-10 rounded-md px-3 py-2 text-sm font-bold transition ${
              option.value === value
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-300 hover:bg-white/[0.07] hover:text-white"
            }`}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function formatConnectionTime(value: string | null) {
  if (!value) {
    return "Nog niet gezien";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Onbekend";
  }

  return `Laatst gezien om ${date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
}

export function ScreenSettingsPanel({
  code,
  configuration,
  dirty,
  error,
  lastSeenAt,
  onChange,
  onDiscard,
  onRefreshConnection,
  onSave,
  presentationTitle,
  saving,
  screenConnected,
  screenLink,
}: ScreenSettingsPanelProps) {
  const [scene, setScene] = useState<ScreenPreviewView>("general");
  const [previewConfiguration, setPreviewConfiguration] = useState(configuration);
  const [transferNotice, setTransferNotice] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setPreviewConfiguration(configuration), 160);
    return () => window.clearTimeout(timer);
  }, [configuration]);

  const invalidColors = [
    configuration.generalScreenBackgroundColor,
    configuration.screenSettings.general.gradientColor,
    configuration.screenSettings.question.backgroundColor,
    configuration.screenSettings.results.accentColor,
  ].some((value) => !normalizeHexColor(value));
  const contrastBackground =
    scene === "question"
      ? configuration.screenSettings.question.backgroundColor
      : configuration.generalScreenBackgroundColor;
  const contrast = getGeneralScreenContrastInfo(contrastBackground);
  const previewLink = useMemo(() => {
    if (!screenLink) {
      return "";
    }

    const params = new URLSearchParams({
      preview: scene,
      title: presentationTitle,
      configuration: JSON.stringify(previewConfiguration),
    });
    return `${screenLink}?${params.toString()}`;
  }, [presentationTitle, previewConfiguration, scene, screenLink]);

  function changeSettings<K extends keyof PresentationScreenSettings>(
    section: K,
    patch: Partial<PresentationScreenSettings[K]>
  ) {
    onChange({
      ...configuration,
      screenSettings: {
        ...configuration.screenSettings,
        [section]: {
          ...configuration.screenSettings[section],
          ...patch,
        },
      },
    });
  }

  function restoreScene() {
    if (scene === "general") {
      onChange({
        ...configuration,
        generalScreenBackgroundColor: DEFAULT_GENERAL_SCREEN_BACKGROUND_COLOR,
        generalScreenFontFamily: DEFAULT_GENERAL_SCREEN_FONT_FAMILY,
        generalScreenFontSize: DEFAULT_GENERAL_SCREEN_FONT_SIZE,
        screenSettings: {
          ...configuration.screenSettings,
          general: { ...DEFAULT_SCREEN_SETTINGS.general },
        },
      });
      return;
    }

    onChange({
      ...configuration,
      screenSettings: {
        ...configuration.screenSettings,
        [scene]: { ...DEFAULT_SCREEN_SETTINGS[scene] },
      },
    });
  }

  function applyPreset(presetId: (typeof SCREEN_STYLE_PRESETS)[number]["id"]) {
    const preset = SCREEN_STYLE_PRESETS.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }

    onChange({
      ...configuration,
      ...preset.configuration,
      screenSettings: cloneScreenSettings(preset.configuration.screenSettings),
    });
  }

  function copyStyle() {
    window.localStorage.setItem(
      TRANSFER_KEY,
      JSON.stringify({
        ...configuration,
        idleScreenText: "",
      })
    );
    setTransferNotice("Vormgeving klaar om in een andere presentatie te plakken.");
  }

  function pasteStyle() {
    const stored = window.localStorage.getItem(TRANSFER_KEY);
    if (!stored) {
      setTransferNotice("Er staat nog geen gekopieerde vormgeving op dit apparaat.");
      return;
    }

    try {
      const copied = createScreenConfiguration(JSON.parse(stored) as Record<string, unknown>);
      onChange({ ...copied, idleScreenText: configuration.idleScreenText });
      setTransferNotice("Gekopieerde vormgeving toegepast. Sla op om te bewaren.");
    } catch {
      setTransferNotice("De gekopieerde vormgeving kon niet worden gelezen.");
    }
  }

  async function copyScreenLink() {
    await navigator.clipboard.writeText(screenLink);
    setTransferNotice("Groot-scherm-URL gekopieerd.");
  }

  return (
    <article className="glass-surface overflow-hidden rounded-lg border border-white/10">
      <div className="border-b border-white/10 p-3 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-emerald-300">Groot scherm</p>
            <h2 className="mt-1 text-xl font-black text-white md:text-2xl">Schermstudio</h2>
            <p className="mt-1 text-sm font-semibold text-zinc-400">
              Vorm het beeld per schermtype. Live bedienen blijft in Regie.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-black ${
                screenConnected
                  ? "border-emerald-300/35 bg-emerald-400/10 text-emerald-200"
                  : "border-amber-300/30 bg-amber-400/10 text-amber-200"
              }`}
              title={formatConnectionTime(lastSeenAt)}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${screenConnected ? "bg-emerald-300" : "bg-amber-300"}`} />
              {screenConnected ? "Scherm verbonden" : "Scherm niet actief"}
            </span>
            <button
              aria-label="Verbindingsstatus vernieuwen"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-sm font-bold text-white hover:bg-white/10"
              onClick={onRefreshConnection}
              type="button"
            >
              <RotateCcw aria-hidden className="h-4 w-4" />
              Test
            </button>
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-sm font-bold text-white hover:bg-white/10"
              onClick={copyScreenLink}
              type="button"
            >
              <Copy aria-hidden className="h-4 w-4" />
              URL
            </button>
            <a
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-black text-zinc-950 hover:bg-zinc-200"
              href={screenLink}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink aria-hidden className="h-4 w-4" />
              Open scherm
            </a>
          </div>
        </div>
      </div>

      <div className="border-b border-white/10 px-3 py-3 md:px-5">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {SCENES.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${
                  scene === item.id
                    ? "bg-white text-zinc-950"
                    : "border border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] hover:text-white"
                }`}
                key={item.id}
                onClick={() => setScene(item.id)}
                type="button"
              >
                <Icon aria-hidden className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 p-3 md:p-5 xl:grid-cols-[minmax(300px,0.78fr)_minmax(520px,1.22fr)]">
        <section className="min-w-0 space-y-4">
          <div className={settingSectionClass()}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-zinc-500">Snelle stijl</p>
                <h3 className="mt-1 text-base font-black text-white">Presets</h3>
              </div>
              <button
                className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-white/10"
                onClick={restoreScene}
                type="button"
              >
                <RotateCcw aria-hidden className="h-3.5 w-3.5" />
                Scherm herstellen
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {SCREEN_STYLE_PRESETS.map((preset) => (
                <button
                  className="rounded-lg border border-white/10 bg-black/15 p-2.5 text-left transition hover:border-emerald-300/35 hover:bg-white/[0.07]"
                  key={preset.id}
                  onClick={() => applyPreset(preset.id)}
                  title={preset.description}
                  type="button"
                >
                  <span className="block text-sm font-black text-white">{preset.label}</span>
                  <span className="mt-1 line-clamp-1 block text-xs font-semibold text-zinc-500">{preset.description}</span>
                </button>
              ))}
            </div>
          </div>

          {scene === "general" ? (
            <>
              <div className={settingSectionClass()}>
                <label className="text-sm font-bold text-zinc-200" htmlFor="screen-idle-title">
                  Tekst op algemeen scherm
                </label>
                <input
                  className={fieldClass()}
                  id="screen-idle-title"
                  maxLength={90}
                  onChange={(event) => onChange({ ...configuration, idleScreenText: event.target.value })}
                  placeholder={presentationTitle}
                  value={configuration.idleScreenText}
                />
                <p className="mt-2 text-xs font-semibold text-zinc-500">
                  Deze tekst staat in de lobby, het wachtenscherm en tussen twee vragen.
                </p>
              </div>
              <div className={`${settingSectionClass()} space-y-4`}>
                <ColorControl
                  id="general-background"
                  label="Achtergrondkleur"
                  onChange={(value) => onChange({ ...configuration, generalScreenBackgroundColor: value })}
                  value={configuration.generalScreenBackgroundColor}
                />
                <ToggleRow
                  checked={configuration.screenSettings.general.useGradient}
                  label="Radiaal kleurverloop"
                  onChange={(checked) => changeSettings("general", { useGradient: checked })}
                />
                {configuration.screenSettings.general.useGradient ? (
                  <ColorControl
                    id="general-gradient"
                    label="Kleur verloop"
                    onChange={(value) => changeSettings("general", { gradientColor: value })}
                    value={configuration.screenSettings.general.gradientColor}
                  />
                ) : null}
                <SegmentedControl
                  label="Uitlijning"
                  onChange={(alignment) => changeSettings("general", { alignment })}
                  options={[{ value: "center", label: "Midden" }, { value: "left", label: "Links" }]}
                  value={configuration.screenSettings.general.alignment}
                />
                <ToggleRow
                  checked={configuration.screenSettings.general.showSessionCode}
                  label="Sessiecode tonen"
                  onChange={(checked) => changeSettings("general", { showSessionCode: checked })}
                />
              </div>
              <div className={`${settingSectionClass()} space-y-4`}>
                <div>
                  <label className="text-sm font-bold text-zinc-200" htmlFor="general-font-family">Lettertype</label>
                  <select
                    className={fieldClass()}
                    id="general-font-family"
                    onChange={(event) => onChange({
                      ...configuration,
                      generalScreenFontFamily: event.target.value as ScreenConfiguration["generalScreenFontFamily"],
                    })}
                    value={configuration.generalScreenFontFamily}
                  >
                    {GENERAL_SCREEN_FONT_OPTIONS.map((option) => (
                      <option className="bg-zinc-950" key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-bold text-zinc-200" htmlFor="general-font-size">Lettergrootte</label>
                    <span className="font-mono text-xs font-black text-zinc-400">{configuration.generalScreenFontSize}px</span>
                  </div>
                  <input
                    className="mt-3 w-full accent-emerald-300"
                    id="general-font-size"
                    max={MAX_GENERAL_SCREEN_FONT_SIZE}
                    min={MIN_GENERAL_SCREEN_FONT_SIZE}
                    onChange={(event) => onChange({ ...configuration, generalScreenFontSize: Number(event.target.value) })}
                    step={4}
                    type="range"
                    value={configuration.generalScreenFontSize}
                  />
                </div>
              </div>
            </>
          ) : null}

          {scene === "qr" ? (
            <div className={`${settingSectionClass()} space-y-4`}>
              <div>
                <label className="text-sm font-bold text-zinc-200" htmlFor="qr-welcome">Welkomsttekst</label>
                <input
                  className={fieldClass()}
                  id="qr-welcome"
                  maxLength={90}
                  onChange={(event) => changeSettings("qr", { welcomeText: event.target.value })}
                  value={configuration.screenSettings.qr.welcomeText}
                />
              </div>
              <SegmentedControl
                label="Formaat QR-code"
                onChange={(size) => changeSettings("qr", { size })}
                options={[{ value: "medium", label: "Normaal" }, { value: "large", label: "Extra groot" }]}
                value={configuration.screenSettings.qr.size}
              />
              <ToggleRow
                checked={configuration.screenSettings.qr.showTitle}
                label="Presentatietitel tonen"
                onChange={(checked) => changeSettings("qr", { showTitle: checked })}
              />
              <ToggleRow
                checked={configuration.screenSettings.qr.showSessionCode}
                label="Sessiecode tonen"
                onChange={(checked) => changeSettings("qr", { showSessionCode: checked })}
              />
            </div>
          ) : null}

          {scene === "question" ? (
            <div className={`${settingSectionClass()} space-y-4`}>
              <ColorControl
                id="question-background"
                label="Achtergrondkleur"
                onChange={(value) => changeSettings("question", { backgroundColor: value })}
                value={configuration.screenSettings.question.backgroundColor}
              />
              <SegmentedControl
                label="Uitlijning vraag"
                onChange={(alignment) => changeSettings("question", { alignment })}
                options={[{ value: "center", label: "Midden" }, { value: "left", label: "Links" }]}
                value={configuration.screenSettings.question.alignment}
              />
              <SegmentedControl
                label="Breedte inhoud"
                onChange={(contentWidth) => changeSettings("question", { contentWidth })}
                options={[{ value: "standard", label: "Standaard" }, { value: "wide", label: "Breed" }]}
                value={configuration.screenSettings.question.contentWidth}
              />
              <ToggleRow
                checked={configuration.screenSettings.question.showResponseCount}
                label="Aantal reacties tonen"
                onChange={(checked) => changeSettings("question", { showResponseCount: checked })}
              />
            </div>
          ) : null}

          {scene === "results" ? (
            <div className={`${settingSectionClass()} space-y-4`}>
              <ColorControl
                id="results-accent"
                label="Accentkleur"
                onChange={(value) => changeSettings("results", { accentColor: value })}
                value={configuration.screenSettings.results.accentColor}
              />
              <SegmentedControl
                label="Dichtheid"
                onChange={(density) => changeSettings("results", { density })}
                options={[{ value: "comfortable", label: "Ruim" }, { value: "compact", label: "Compact" }]}
                value={configuration.screenSettings.results.density}
              />
              <ToggleRow
                checked={configuration.screenSettings.results.highlightCorrectAnswer}
                label="Juiste quizantwoord uitlichten"
                onChange={(checked) => changeSettings("results", { highlightCorrectAnswer: checked })}
              />
            </div>
          ) : null}

          {scene === "ranking" ? (
            <div className={`${settingSectionClass()} space-y-4`}>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-bold text-zinc-200" htmlFor="ranking-entries">Aantal deelnemers</label>
                  <span className="font-mono text-xs font-black text-zinc-400">{configuration.screenSettings.ranking.visibleEntries}</span>
                </div>
                <input
                  className="mt-3 w-full accent-amber-300"
                  id="ranking-entries"
                  max={30}
                  min={3}
                  onChange={(event) => changeSettings("ranking", { visibleEntries: Number(event.target.value) })}
                  type="range"
                  value={configuration.screenSettings.ranking.visibleEntries}
                />
              </div>
              <ToggleRow
                checked={configuration.screenSettings.ranking.showScores}
                label="Punten tonen"
                onChange={(checked) => changeSettings("ranking", { showScores: checked })}
              />
              <ToggleRow
                checked={configuration.screenSettings.ranking.emphasizeTopThree}
                label="Top 3 extra uitlichten"
                onChange={(checked) => changeSettings("ranking", { emphasizeTopThree: checked })}
              />
            </div>
          ) : null}

          {scene === "pause" ? (
            <div className={`${settingSectionClass()} space-y-4`}>
              <div>
                <label className="text-sm font-bold text-zinc-200" htmlFor="pause-message">Pauzetekst</label>
                <input
                  className={fieldClass()}
                  id="pause-message"
                  maxLength={90}
                  onChange={(event) => changeSettings("pause", { message: event.target.value })}
                  value={configuration.screenSettings.pause.message}
                />
              </div>
              <ToggleRow
                checked={configuration.screenSettings.pause.showMessage}
                label="Pauzetekst tonen"
                onChange={(checked) => changeSettings("pause", { showMessage: checked })}
              />
            </div>
          ) : null}
        </section>

        <aside className="min-w-0 xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-lg border border-white/10 bg-black/25 p-3 md:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase text-emerald-300">Live conceptpreview</p>
                <p className="mt-1 text-sm font-semibold text-zinc-400">16:9, zonder wijzigingen live te zetten</p>
              </div>
              <span className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-black ${
                contrast.passesAA
                  ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200"
                  : "border-rose-300/30 bg-rose-400/10 text-rose-200"
              }`}>
                {contrast.passesAA ? <Check aria-hidden className="h-3.5 w-3.5" /> : null}
                Contrast {contrast.ratio.toFixed(1)}:1
              </span>
            </div>
            <div className="mt-4 overflow-hidden rounded-lg border border-white/15 bg-black shadow-2xl">
              <div className="relative aspect-video w-full overflow-hidden">
                {previewLink ? (
                  <iframe
                    className="pointer-events-none absolute left-0 top-0 h-[400%] w-[400%] origin-top-left border-0"
                    src={previewLink}
                    style={{ transform: "scale(0.25)" }}
                    title={`Preview ${scene} groot scherm`}
                  />
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-zinc-500">
              <span>{presentationTitle}</span>
              <span className="font-mono">{code}</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2 text-sm font-bold text-zinc-200 hover:bg-white/10"
              onClick={copyStyle}
              type="button"
            >
              <Clipboard aria-hidden className="h-4 w-4" />
              Kopieer stijl
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2 text-sm font-bold text-zinc-200 hover:bg-white/10"
              onClick={pasteStyle}
              type="button"
            >
              <Copy aria-hidden className="h-4 w-4" />
              Plak stijl
            </button>
          </div>
          {transferNotice ? <p className="mt-2 text-xs font-semibold text-zinc-400">{transferNotice}</p> : null}
        </aside>
      </div>

      <div className="sticky bottom-0 z-20 flex flex-col gap-3 border-t border-white/10 bg-zinc-950/90 p-3 backdrop-blur-xl md:flex-row md:items-center md:justify-between md:px-5">
        <div className="min-w-0">
          <p className={`text-sm font-black ${dirty ? "text-amber-200" : "text-emerald-200"}`}>
            {saving ? "Scherminstellingen opslaan..." : dirty ? "Niet-opgeslagen wijzigingen" : "Alles opgeslagen"}
          </p>
          <p className={`mt-0.5 text-xs font-semibold ${error ? "text-rose-300" : "text-zinc-500"}`}>
            {error || (invalidColors ? "Corrigeer de ongeldige HEX-kleur voordat je opslaat." : "Opgeslagen wijzigingen verschijnen direct op een geopend groot scherm.")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.05] px-4 py-2 text-sm font-bold text-zinc-200 hover:bg-white/10 disabled:opacity-40"
            disabled={!dirty || saving}
            onClick={onDiscard}
            type="button"
          >
            <Undo2 aria-hidden className="h-4 w-4" />
            Ongedaan
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-black text-emerald-950 hover:bg-emerald-300 disabled:opacity-40"
            disabled={!dirty || saving || invalidColors}
            onClick={onSave}
            type="button"
          >
            <Save aria-hidden className="h-4 w-4" />
            Opslaan
          </button>
        </div>
      </div>
    </article>
  );
}
