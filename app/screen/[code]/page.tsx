import ScreenPage from "./ScreenPage";

type ScreenCodePageProps = {
  params: Promise<{ code: string }>;
};

export default async function ScreenCodePage({ params }: ScreenCodePageProps) {
  const { code } = await params;
  return <ScreenPage code={code} />;
}
