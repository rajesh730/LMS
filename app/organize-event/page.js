import Link from "next/link";
import EventProposalForm from "@/components/partners/EventProposalForm";

export const metadata = {
  title: "Request a School Competition Partnership",
  description:
    "Submit a proposal for a partner-backed student competition, showcase, or talent event.",
};

export default function OrganizeEventPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
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
                Bring a verified competition to schools.
              </h1>
              <p className="text-slate-400 mt-5 leading-8">
                If an organization like ECA Academy wants to run a singing
                competition, this is the first step. Share the idea, audience,
                safety needs, and expected scale. The platform reviews it before
                any school sees the event.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <h2 className="text-xl font-bold mb-4">Process Flow</h2>
              <div className="space-y-4 text-sm text-slate-300">
                <p>
                  <strong className="text-white">1. Request:</strong> ECA
                  Academy submits the singing competition proposal.
                </p>
                <p>
                  <strong className="text-white">2. Review:</strong> platform
                  admin checks fit, safety, timeline, and data access.
                </p>
                <p>
                  <strong className="text-white">3. Publish:</strong> if
                  approved, admin creates a platform event with ECA as partner.
                </p>
                <p>
                  <strong className="text-white">4. School opt-in:</strong>{" "}
                  schools approve the invitation and register students.
                </p>
                <p>
                  <strong className="text-white">5. Results:</strong> winners
                  and certificates can be published after approval.
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
