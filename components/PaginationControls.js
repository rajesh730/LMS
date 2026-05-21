export default function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  start,
  end,
}) {
  if (totalPages <= 1) return null;

  const goToPage = (page) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    onPageChange(nextPage);
  };

  return (
    <nav
      aria-label="Pagination"
      className="mt-6 flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-700/70 bg-slate-950/40 px-4 py-3 sm:flex-row"
    >
      <p className="text-sm text-slate-400">
        {typeof totalItems === "number" ? (
          <>
            Showing{" "}
            <span className="font-semibold text-slate-100">{start || 0}</span>
            {" - "}
            <span className="font-semibold text-slate-100">{end || 0}</span>
            {" of "}
            <span className="font-semibold text-slate-100">{totalItems}</span>
          </>
        ) : (
          <>
            Page{" "}
            <span className="font-semibold text-slate-100">{currentPage}</span>{" "}
            of{" "}
            <span className="font-semibold text-slate-100">{totalPages}</span>
          </>
        )}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-sky-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
        >
          Next
        </button>
      </div>
    </nav>
  );
}
