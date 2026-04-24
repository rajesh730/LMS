import Link from "next/link";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import "@/models/ExternalOrganizer";

export const dynamic = "force-dynamic";

export default async function PublicEventsPage() {
  await connectDB();

  const [featuredEvents, publicEvents] = await Promise.all([
    Event.find({
      visibility: "PUBLIC",
      status: "APPROVED",
      lifecycleStatus: { $ne: "ARCHIVED" },
      featuredOnLanding: true,
    })
      .sort({ date: 1 })
      .limit(4)
      .populate("school", "schoolName")
      .populate(
        "partners.organizer",
        "organizationName slug logoUrl website verificationStatus profileVisibility"
      )
      .lean(),
    Event.find({
      visibility: "PUBLIC",
      status: "APPROVED",
      lifecycleStatus: { $ne: "ARCHIVED" },
    })
      .sort({ date: 1 })
      .limit(24)
      .populate("school", "schoolName")
      .populate(
        "partners.organizer",
        "organizationName slug logoUrl website verificationStatus profileVisibility"
      )
      .lean(),
  ]);

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-16 md:px-12">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-3xl mb-12">
          <p className="text-sm uppercase tracking-[0.35em] text-blue-400 mb-4">
            Public Events
          </p>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">
            Discover talent showcases, competitions, and platform events before login
          </h1>
          <p className="text-slate-400 mt-4 text-lg">
            Explore what schools and the platform are organizing across music, debate, arts, clubs, innovation, and more.
          </p>
        </div>

        {featuredEvents.length > 0 && (
          <section className="mb-14">
            <h2 className="text-2xl font-bold mb-6">Featured Events</h2>
            <div className="grid lg:grid-cols-2 gap-6">
              {featuredEvents.map((event) => (
                <Link
                  key={String(event._id)}
                  href={`/events/${event._id}`}
                  className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 hover:border-blue-500/40 transition"
                >
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <span className="px-3 py-1 rounded-full text-xs bg-blue-500/15 text-blue-300 border border-blue-500/30">
                      Featured
                    </span>
                    <div className="flex items-center gap-2">
                      {event.resultsPublished && (
                        <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 uppercase">
                          Results Published
                        </span>
                      )}
                      <span className="text-xs text-slate-400 uppercase">
                        {event.eventType}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold">{event.title}</h3>
                  <p className="text-slate-400 mt-3 line-clamp-3">
                    {event.description}
                  </p>
                  <div className="mt-5 text-sm text-slate-300 space-y-1">
                    <div>Date: {new Date(event.date).toLocaleDateString()}</div>
                    {event.partnerBrandingEnabled && event.partners?.length > 0 && (
                      <div>
                        Partner:{" "}
                        {event.partners[0]?.organizer?.slug ? (
                          <span>{event.partners[0].organizer.organizationName}</span>
                        ) : (
                          event.partners[0]?.displayName || "Approved partner"
                        )}
                      </div>
                    )}
                    <div>
                      Organizer:{" "}
                      {event.eventScope === "PLATFORM"
                        ? "Platform"
                        : event.school?.schoolName || "School event"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-2xl font-bold mb-6">All Public Events</h2>
          <div className="grid lg:grid-cols-2 gap-6">
            {publicEvents.map((event) => (
              <Link
                key={String(event._id)}
                href={`/events/${event._id}`}
                className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 hover:border-emerald-500/40 transition"
              >
                <div className="flex items-center justify-between gap-4 mb-3">
                  <span className="text-xs uppercase text-slate-400">
                    {event.eventScope}
                  </span>
                  <div className="flex items-center gap-2">
                    {event.resultsPublished && (
                      <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 uppercase">
                        Results
                      </span>
                    )}
                    <span className="text-xs uppercase text-slate-400">
                      {event.eventType}
                    </span>
                  </div>
                </div>
                <h3 className="text-xl font-bold">{event.title}</h3>
                <p className="text-slate-400 mt-3 line-clamp-3">{event.description}</p>
                <div className="mt-5 text-sm text-slate-300">
                  <div>Date: {new Date(event.date).toLocaleDateString()}</div>
                  {event.partnerBrandingEnabled && event.partners?.length > 0 && (
                    <div className="mt-1 text-emerald-300">
                      In partnership with{" "}
                      {event.partners[0]?.organizer?.organizationName ||
                        event.partners[0]?.displayName ||
                        "approved partner"}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
