import EventProposalForm from "@/components/partners/EventProposalForm";
import PublicExplorePanel from "@/components/public/PublicExplorePanel";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import { PublicPageShell } from "@/components/public/PublicLayout";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Become a Pravyo Partner",
  description:
    "Apply to partner with Pravyo on student competitions, showcases, school programs, and public opportunities.",
};

export default function PartnersPage() {
  return (
    <PublicPageShell className="bg-[#f8f9fd]">
      <PublicSiteNav active="partners" />

      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 sm:px-6 xl:grid-cols-[230px_minmax(0,1fr)]">
        <PublicExplorePanel active="partners" variant="partners" />

        <main className="min-w-0 space-y-5">
          <section className="rounded-xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase text-[#4326e8]">
              Partnership Application
            </p>
            <h1 className="mt-2 text-3xl font-black leading-tight text-[#17120a] md:text-4xl">
              Become a Pravyo Partner.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#52657d]">
              Share your organization details, partnership role, and the student
              opportunity you want to bring to schools.
            </p>
          </section>

          <EventProposalForm />
        </main>
      </div>
    </PublicPageShell>
  );
}
