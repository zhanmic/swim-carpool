import { WeekView } from "@/components/WeekView";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CarpoolPage({ params }: PageProps) {
  const { slug } = await params;

  return <WeekView slug={slug} />;
}
