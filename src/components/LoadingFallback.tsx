import React from 'react';

const LoadingFallback: React.FC<{ message?: string }> = ({ message = 'Đang tải dữ liệu...' }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '260px',
      padding: '2rem',
      width: '100%'
    }}>
      <div style={{
        width: '36px',
        height: '36px',
        border: '3px solid #e9ecef',
        borderTopColor: 'var(--primary, #0056b3)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite'
      }} />
      <span style={{
        marginTop: '14px',
        color: '#6c757d',
        fontSize: '0.9rem',
        fontWeight: 500
      }}>
        {message}
      </span>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingFallback;
