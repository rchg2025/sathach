import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="pagination flex" style={{ gap: '0.25rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '2rem', paddingBottom: '1rem' }}>
      <button 
        className="btn btn-outline" 
        style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
        disabled={currentPage === 1} 
        onClick={() => onPageChange(currentPage - 1)}
      >
        Trước
      </button>
      {getPageNumbers().map((page, index) => (
        <button 
          key={index} 
          className={`btn ${currentPage === page ? 'btn-primary' : 'btn-outline'}`}
          style={page === '...' 
            ? { pointerEvents: 'none', border: 'none', background: 'transparent', padding: '0.25rem 0.5rem', fontSize: '0.85rem' } 
            : { padding: '0.25rem 0.65rem', fontSize: '0.85rem', minWidth: '32px' }
          }
          onClick={() => typeof page === 'number' && onPageChange(page)}
          disabled={page === '...'}
        >
          {page}
        </button>
      ))}
      <button 
        className="btn btn-outline" 
        style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
        disabled={currentPage === totalPages} 
        onClick={() => onPageChange(currentPage + 1)}
      >
        Sau
      </button>
    </div>
  );
};
