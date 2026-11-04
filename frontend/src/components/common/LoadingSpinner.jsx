import React from 'react';

export const LoadingSpinner = ({ text = 'Loading clinical data...', small = false }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: small ? '1.5rem' : '3.5rem',
        gap: '0.85rem',
      }}
    >
      <div className={`spinner ${small ? 'spinner-sm' : ''}`} />
      {text && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>{text}</span>}
    </div>
  );
};

export const TableSkeleton = ({ rows = 5, cols = 4 }) => {
  return (
    <div style={{ padding: '1rem' }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: '1rem',
            padding: '0.85rem 0',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="skeleton skeleton-text" style={{ width: c === 0 ? '70%' : '90%' }} />
          ))}
        </div>
      ))}
    </div>
  );
};
