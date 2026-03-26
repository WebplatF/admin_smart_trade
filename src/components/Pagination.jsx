import "./Pagination.css";

const Pagination = ({ currentPage, totalPages, onPageChange }) => {

  // 🔥 LIMIT PAGE BUTTONS (PRO UX)
  const pages = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="pagination-container">

      {/* PREVIOUS */}
      <button
        className="arrow-btn"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        ‹
      </button>

      {/* FIRST PAGE */}
      {start > 1 && (
        <>
          <button
            className="page-btn"
            onClick={() => onPageChange(1)}
          >
            1
          </button>
          {start > 2 && <span style={{ padding: "0 6px" }}>...</span>}
        </>
      )}

      {/* MIDDLE PAGES */}
      {pages.map((page) => (
        <button
          key={page}
          className={`page-btn ${currentPage === page ? "active" : ""}`}
          onClick={() => onPageChange(page)}
        >
          {page}
        </button>
      ))}

      {/* LAST PAGE */}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span style={{ padding: "0 6px" }}>...</span>}
          <button
            className="page-btn"
            onClick={() => onPageChange(totalPages)}
          >
            {totalPages}
          </button>
        </>
      )}

      {/* NEXT */}
      <button
        className="arrow-btn"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        ›
      </button>

    </div>
  );
};

export default Pagination;