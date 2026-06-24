export default function Loading() {
  return (
    <main className="pravyo-page-shell px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="pravyo-skeleton h-10 w-64 rounded-xl" />
        <div className="pravyo-skeleton mt-4 h-4 w-full max-w-xl rounded-lg" />

        {/* Stat row */}
        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="pravyo-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="pravyo-skeleton h-3 w-20 rounded-md" />
                <div className="pravyo-skeleton h-9 w-9 rounded-xl" />
              </div>
              <div className="pravyo-skeleton mt-4 h-7 w-16 rounded-md" />
            </div>
          ))}
        </div>

        {/* Card grid */}
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((card) => (
            <div key={card} className="pravyo-card p-5">
              <div className="flex items-center gap-3">
                <div className="pravyo-skeleton h-11 w-11 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="pravyo-skeleton h-3.5 w-3/4 rounded-md" />
                  <div className="pravyo-skeleton h-3 w-1/2 rounded-md" />
                </div>
              </div>
              <div className="mt-5 space-y-2.5">
                <div className="pravyo-skeleton h-3 w-full rounded-md" />
                <div className="pravyo-skeleton h-3 w-5/6 rounded-md" />
                <div className="pravyo-skeleton h-3 w-2/3 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
