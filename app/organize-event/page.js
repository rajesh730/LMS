import Link from "next/link";
import EventProposalForm from "@/components/partners/EventProposalForm";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import {
  PublicCard,
  PublicContainer,
  PublicPageShell,
} from "@/components/public/PublicLayout";

export const metadata = {
  title: "Request a Partner Event Review",
  description:
    "Submit a proposal for a partner-led student competition, showcase, or school activity event.",
};

export default function OrganizeEventPage() {
  return (
    <PublicPageShell>
      <PublicSiteNav active="partners" />

      <section className="border-b border-[#d7cdbb] bg-[#f8fbff]">
        <PublicContainer className="py-4">
          <Link
            href="/partners"
            className="text-sm font-black text-[#0a2f66] transition hover:text-[#123f82]"
          >
            Back to partners
          </Link>
        </PublicContainer>
      </section>

      <PublicContainer className="py-6 sm:py-10">
        <div className="grid lg:grid-cols-[0.9fr_1.4fr] gap-10 items-start">
          <aside className="space-y-6 lg:sticky lg:top-8">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0a2f66] mb-4">
                Partner Event Request
              </p>
              <h1 className="text-[1.7rem] font-black leading-[1.08] tracking-tight text-slate-950 md:text-5xl">
                Bring a trusted student opportunity to schools.
              </h1>
              <p className="text-slate-600 mt-5 leading-8">
                Share your event concept, audience, format, timeline, and
                support details. The Pratyo team reviews each request before it
                becomes visible to schools.
              </p>
            </div>

            <PublicCard>
              <h2 className="mb-4 text-lg font-black text-slate-950 sm:text-xl">How review works</h2>
              <div className="space-y-4 text-sm text-slate-600">
                <p>
                  <strong className="text-slate-950">1. Submit:</strong> share the
                  event purpose, contact details, audience, preferred schedule,
                  and support offered.
                </p>
                <p>
                  <strong className="text-slate-950">2. Review:</strong> platform
                  admins check school relevance, safety, timeline, and
                  operational fit.
                </p>
                <p>
                  <strong className="text-slate-950">3. Prepare:</strong> approved
                  requests are converted into platform events with clear partner
                  attribution.
                </p>
                <p>
                  <strong className="text-slate-950">4. Invite schools:</strong>{" "}
                  schools review the event and decide whether to participate.
                </p>
                <p>
                  <strong className="text-slate-950">5. Publish outcomes:</strong>{" "}
                  results, certificates, and selected highlights can be shared
                  after the event is completed.
                </p>
              </div>
            </PublicCard>

            <PublicCard className="border-emerald-200 bg-emerald-50">
              <h2 className="mb-3 text-lg font-black text-emerald-900 sm:text-xl">
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
      </PublicContainer>
    </PublicPageShell>
  );
}
