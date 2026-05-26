import PublicSiteNav from "@/components/public/PublicSiteNav";
import PublicEventsHub from "@/components/public/PublicEventsHub";
import { getPublicEventsHubData } from "@/lib/publicEventsHub";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Events",
  description: "Explore public student competitions, school events, and results",
};

export default async function PublicEventsPage() {
  const initialData = await getPublicEventsHubData();

  return (
    <main className="min-h-screen bg-[#f8f9fd] text-[#17120a]">
      <PublicSiteNav active="events" />
      <PublicEventsHub initialData={initialData} />
    </main>
  );
}
