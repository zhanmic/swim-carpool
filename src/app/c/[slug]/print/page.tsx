import { PrintScheduleView } from "@/components/PrintScheduleView";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ start?: string }>;
}

export default async function PrintSchedulePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { start } = await searchParams;

  return <PrintScheduleView slug={slug} weekStart={start} />;
}
