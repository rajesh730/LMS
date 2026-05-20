export default function Loading() {
  return (
    <main className="min-h-screen bg-[#071833] px-4 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="h-14 w-72 animate-pulse rounded-2xl bg-white/10" />
        <div className="mt-4 h-6 w-full max-w-2xl animate-pulse rounded-xl bg-white/5" />
        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((card) => (
            <div
              key={card}
              className="h-48 animate-pulse rounded-3xl border border-white/10 bg-slate-950/40"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
