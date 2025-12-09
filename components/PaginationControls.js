export default function PaginationControls({ currentPage, totalPages, onPageChange }) {
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-center gap-2 mt-6">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
                Prev
            </button>
            <span className="text-slate-400 text-sm">
                Page {currentPage} of {totalPages}
            </span>
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
                Next
            </button>
        </div>
    );
}
