import ScreenPage from "./ScreenPage";
import {
  createScreenConfiguration,
  resolvePreviewView,
  type ScreenConfiguration,
} from "@/lib/screenSettings";

type ScreenCodePageProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ preview?: string; configuration?: string; embedded?: string; title?: string }>;
};

function parsePreviewConfiguration(value: string | undefined): ScreenConfiguration | null {
  if (!value) {
    return null;
  }

  try {
    return createScreenConfiguration(JSON.parse(value) as unknown as Record<string, unknown>);
  } catch {
    return null;
  }
}

export default async function ScreenCodePage({ params, searchParams }: ScreenCodePageProps) {
  const { code } = await params;
  const query = await searchParams;
  const preview = query.preview
    ? {
        view: resolvePreviewView(query.preview),
        configuration: parsePreviewConfiguration(query.configuration),
        title: typeof query.title === "string" ? query.title.slice(0, 90) : "Sessie Interactief",
      }
    : null;

  return <ScreenPage code={code} disableHeartbeat={query.embedded === "1"} preview={preview} />;
}
