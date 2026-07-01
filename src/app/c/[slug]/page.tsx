import { WeekView } from "@/components/WeekView";
import { defaultWeekStartStr } from "@/lib/dates";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CarpoolPage({ params }: PageProps) {
  const { slug } = await params;
  const weekStart = defaultWeekStartStr();

  return <WeekView slug={slug} initialWeekStart={weekStart} />;
}
