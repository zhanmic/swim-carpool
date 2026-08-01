import { WeekView } from "@/components/WeekView";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CarpoolPage({ params }: PageProps) {
  const { slug } = await params;
  const adminEnabled = !!process.env.ADMIN_PASSWORD;

  return <WeekView slug={slug} adminEnabled={adminEnabled} />;
}
