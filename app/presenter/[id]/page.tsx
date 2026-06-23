import PresenterDashboard from "./PresenterDashboard";

type PresenterPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PresenterPage({ params }: PresenterPageProps) {
  const { id } = await params;
  return <PresenterDashboard id={id} />;
}
