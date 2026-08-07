import { Component, StrictMode } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.js';
import './styles.css';

/** Classroom devices get a plain-language failure card, never a blank screen. */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override render() {
    if (this.state.error) {
      return (
        <main className="convention">
          <h1>The convention hit a snag</h1>
          <p role="alert">
            Something went wrong: {this.state.error.message}. Reload the page to reconvene.
          </p>
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
