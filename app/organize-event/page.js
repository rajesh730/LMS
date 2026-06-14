import Link from "next/link";
import EventProposalForm from "@/components/partners/EventProposalForm";
import PublicExplorePanel from "@/components/public/PublicExplorePanel";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import {
  PublicCard,
  PublicContainer,
  PublicPageShell,
} from "@/components/public/PublicLayout";

export const metadata = {
  title: "Become a Pravyo Partner",
  description:
    "Apply to partner with Pravyo on student competitions, showcases, school programs, and public opportunities.",
};

export default function OrganizeEventPage() {
  return (
    <PublicPageShell className="bg-[#f8f9fd]">
      <PublicSiteNav active="partners" />

      <section className="border-b border-[#e6eaf7] bg-[#f8f9fd]">
        <PublicContainer className="py-4">
          <Link
            href="/partners"
            className="text-sm font-black text-[#4326e8] transition hover:text-[#3217d3]"
          >
            Back to partners
          </Link>
        </PublicContainer>
      </section>

      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 sm:px-6 xl:grid-cols-[230px_minmax(0,1fr)]">
        <PublicExplorePanel active="partners" />

        <div className="grid min-w-0 gap-5 lg:grid-cols-[0.8fr_1.4fr] lg:items-start">
          <aside className="space-y-5 lg:sticky lg:top-24">
            <div>
              <p className="mb-3 text-[11px] font-black uppercase text-[#4326e8]">
                Partnership Application
              </p>
              <h1 className="text-3xl font-black leading-tight text-[#17120a] md:text-4xl">
                Become a Pravyo Partner.
              </h1>
              <p className="mt-4 text-sm leading-7 text-[#52657d]">
                Share your organization details, partnership role, and the
                student opportunity you want to bring to schools.
              </p>
            </div>

            <PublicCard className="rounded-xl border-[#e6eaf7]">
              <h2 className="mb-4 text-lg font-black text-[#17120a]">
                Review Process
              </h2>
              <div className="space-y-4 text-sm text-[#52657d]">
                <p>
                  <strong className="text-[#17120a]">1. Submit:</strong> send
                  your organization and program details.
                </p>
                <p>
                  <strong className="text-[#17120a]">2. Review:</strong> Pravyo
                  checks school relevance, safety, and operations.
                </p>
                <p>
                  <strong className="text-[#17120a]">3. Publish:</strong>{" "}
                  approved opportunities become visible with clear partner
                  attribution.
                </p>
                <p>
                  <strong className="text-[#17120a]">4. Share results:</strong>{" "}
                  achievements, certificates, and highlights can be published
                  after completion.
                </p>
              </div>
            </PublicCard>

            <PublicCard className="rounded-xl border-emerald-200 bg-emerald-50">
              <h2 className="mb-3 text-lg font-black text-emerald-900">
                Student safety first
              </h2>
              <p className="text-sm text-emerald-800 leading-7">
                External partners do not automatically receive student data.
                Schools and platform admins control participation, visibility,
                and public recognition.
              </p>
            </PublicCard>
          </aside>

          <EventProposalForm />
        </div>
      </div>
    </PublicPageShell>
  );
}
