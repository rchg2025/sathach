import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  // Ensure we at least show 1 as totalPages if it's 0 to prevent "Trang 1 / 0"
  const displayTotalPages = totalPages > 0 ? totalPages : 1;

  return (
    <div className="pagination flex" style={{ gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
      <button 
        className="btn btn-outline" 
        style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem', borderRadius: '6px', minWidth: '80px', backgroundColor: '#f3f4f6', border: 'none', color: currentPage === 1 ? '#9ca3af' : '#4b5563' }}
        disabled={currentPage === 1} 
        onClick={() => onPageChange(currentPage - 1)}
      >
        Trước
      </button>
      
      <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#4b5563' }}>
        Trang {currentPage} / {displayTotalPages}
      </span>
      
      <button 
        className="btn btn-outline" 
        style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem', borderRadius: '6px', minWidth: '80px', backgroundColor: '#f3f4f6', border: 'none', color: currentPage >= totalPages ? '#9ca3af' : '#111827' }}
        disabled={currentPage >= totalPages} 
        onClick={() => onPageChange(currentPage + 1)}
      >
        Sau
      </button>
    </div>
  );
};
