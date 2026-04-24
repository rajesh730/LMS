import Link from "next/link";
import EventProposalForm from "@/components/partners/EventProposalForm";

export const metadata = {
  title: "Organize a Student Event With Us",
  description:
    "Submit a proposal for a partner-backed student competition, showcase, or talent event.",
};

export default function OrganizeEventPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <Link
            href="/"
            className="text-slate-400 hover:text-white transition"
          >
            Back to platform
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid lg:grid-cols-[0.9fr_1.4fr] gap-10 items-start">
          <aside className="space-y-6 lg:sticky lg:top-8">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-blue-400 mb-4">
                Partner Events
              </p>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                Bring your competition or showcase to schools.
              </h1>
              <p className="text-slate-400 mt-5 leading-8">
                Companies, academies, clubs, and NGOs can propose student
                events here. Our platform reviews each idea first, then works
                with schools through a safe, school-managed participation flow.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
              <h2 className="text-xl font-bold mb-4">How it works</h2>
              <div className="space-y-4 text-sm text-slate-300">
                <p>1. Submit your idea without creating an account.</p>
                <p>2. Platform admin reviews organization, safety, and fit.</p>
                <p>3. Approved partners get a profile and partner-branded event.</p>
                <p>4. Schools opt in and register students from their dashboards.</p>
                <p>5. Public results can appear on event, school, and partner pages.</p>
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6">
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
