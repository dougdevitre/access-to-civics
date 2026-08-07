import { Component, StrictMode } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.js';
import { NEUTRAL } from './copy.js';
import './styles.css';

/**
 * Classroom devices get a plain-language failure card, never a blank screen — and never a
 * raw exception message. The real error goes to the console for whoever is debugging.
 */
class ErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  override state = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  override componentDidCatch(error: Error) {
    console.error('[charter]', error);
  }

  override render() {
    if (this.state.crashed) {
      return (
        <main className="convention">
          <h1>{NEUTRAL.crashTitle}</h1>
          <p role="alert">{NEUTRAL.crashBody}</p>
        </main>
      );
    }
    return this.props.children;
  }
}

const el = document.getElementById('root');
if (!el) throw new Error('Root element missing from index.html');

createRoot(el).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
