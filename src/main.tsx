import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept Firestore quota limit and backoff log messages at window entry
if (typeof window !== 'undefined') {
  const isQuotaStr = (str: string) => {
    const s = str.toLowerCase();
    return s.includes('resource-exhausted') || 
           s.includes('quota') || 
           s.includes('backoff') || 
           s.includes('overloading the backend') ||
           s.includes('write units');
  };

  const origError = console.error;
  console.error = function (...args: any[]) {
    const text = args.map(a => String(a?.message || a?.code || a?.name || a?.stack || a)).join(' ');
    if (isQuotaStr(text)) {
      try {
        localStorage.setItem('sinan_firestore_quota_exhausted', String(Date.now()));
      } catch {}
      return;
    }
    origError.apply(console, args);
  };

  const origWarn = console.warn;
  console.warn = function (...args: any[]) {
    const text = args.map(a => String(a?.message || a?.code || a?.name || a?.stack || a)).join(' ');
    if (isQuotaStr(text)) {
      return;
    }
    origWarn.apply(console, args);
  };

  window.addEventListener('unhandledrejection', (event) => {
    const text = String(event.reason?.message || event.reason?.code || event.reason || '');
    if (isQuotaStr(text)) {
      try {
        localStorage.setItem('sinan_firestore_quota_exhausted', String(Date.now()));
      } catch {}
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const text = String(event.error?.message || event.message || '');
    if (isQuotaStr(text)) {
      try {
        localStorage.setItem('sinan_firestore_quota_exhausted', String(Date.now()));
      } catch {}
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
