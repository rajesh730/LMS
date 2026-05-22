import Link from "next/link";
import EventProposalForm from "@/components/partners/EventProposalForm";
import PublicSiteNav from "@/components/public/PublicSiteNav";

export const metadata = {
  title: "Request a Partner Event Review",
  description:
    "Submit a proposal for a partner-led student competition, showcase, or school activity event.",
};

export default function OrganizeEventPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <PublicSiteNav active="partners" />

      <section className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <Link
            href="/partners"
            className="text-slate-400 hover:text-white transition"
          >
            Back to partners
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid lg:grid-cols-[0.9fr_1.4fr] gap-10 items-start">
          <aside className="space-y-6 lg:sticky lg:top-8">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-blue-400 mb-4">
                Partner Event Request
              </p>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                Bring a trusted student opportunity to schools.
              </h1>
              <p className="text-slate-400 mt-5 leading-8">
                Share your event concept, audience, format, timeline, and
                support details. The Pratyo team reviews each request before it
                becomes visible to schools.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <h2 className="text-xl font-bold mb-4">How review works</h2>
              <div className="space-y-4 text-sm text-slate-300">
                <p>
                  <strong className="text-white">1. Submit:</strong> share the
                  event purpose, contact details, audience, preferred schedule,
                  and support offered.
                </p>
                <p>
                  <strong className="text-white">2. Review:</strong> platform
                  admins check school relevance, safety, timeline, and
                  operational fit.
                </p>
                <p>
                  <strong className="text-white">3. Prepare:</strong> approved
                  requests are converted into platform events with clear partner
                  attribution.
                </p>
                <p>
                  <strong className="text-white">4. Invite schools:</strong>{" "}
                  schools review the event and decide whether to participate.
                </p>
                <p>
                  <strong className="text-white">5. Publish outcomes:</strong>{" "}
                  results, certificates, and selected highlights can be shared
                  after the event is completed.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6">
              <h2 className="text-xl font-bold text-emerald-200 mb-3">
                Student safety first
              </h2>
              <p className="text-sm text-emerald-50/80 leading-7">
                External partners do not automatically receive student data.
                Schools and platform admins control participation, visibility,
                and public recognition.
              </p>
            </div>
          </aside>

          <EventProposalForm />
        </div>
      </section>
    </main>
  );
}
