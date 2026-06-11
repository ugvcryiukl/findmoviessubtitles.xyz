'use client';

import { useState } from 'react';

export default function ContactEmail() {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('mohammed.ilsd.official@gmail.com');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <a
        href="mailto:mohammed.ilsd.official@gmail.com"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1rem',
          fontWeight: 600,
          color: 'hsl(var(--primary))',
          textDecoration: 'none',
        }}
      >
        mohammed.ilsd.official@gmail.com
      </a>
      <button
        onClick={handleCopyEmail}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'hsl(var(--foreground-muted))',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px',
          borderRadius: 'var(--radius-sm)',
          transition: 'all var(--transition-fast)',
          fontSize: '0.8rem',
          fontWeight: 600,
        }}
        title="Copy email address"
      >
        {copied ? (
          <span style={{ color: 'hsl(var(--primary))' }}>Copied!</span>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        )}
      </button>
    </div>
  );
}
