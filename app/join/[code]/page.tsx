import ParticipantPage from "./ParticipantPage";

type JoinCodePageProps = {
  params: Promise<{ code: string }>;
};

export default async function JoinCodePage({ params }: JoinCodePageProps) {
  const { code } = await params;
  return <ParticipantPage code={code} />;
}
