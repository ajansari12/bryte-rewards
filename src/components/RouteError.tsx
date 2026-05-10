import React from 'react';
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router';

interface ErrorBoundaryState { error: Error | null }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('Caught render error:', error, info);
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return <BoundaryFallback error={this.state.error} onReset={this.reset} />;
  }
}

function BoundaryFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <div
      role="alert"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--b-canvas, #F2EDE6)',
        padding: 24,
      }}
    >
      <div style={{
        maxWidth: 480, width: '100%',
        background: 'var(--b-card, #FFFFFF)',
        borderRadius: 12, padding: '40px 36px',
        border: '1px solid var(--b-border, #E8E0D5)',
        textAlign: 'center',
      }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '2.4rem', fontWeight: 700, color: 'var(--b-gold, #C2882D)', marginBottom: 16 }}>
          Hmm.
        </div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.3rem', fontWeight: 700, color: 'var(--b-ink, #1C1410)', margin: '0 0 12px' }}>
          Something broke while rendering this page
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--b-ink-3, #8C7B74)', lineHeight: 1.6, margin: '0 0 24px' }}>
          You can try again, or head back to the feed.
        </p>
        {import.meta.env.DEV && (
          <pre style={{
            background: 'var(--b-surface, #F9F6F0)',
            border: '1px solid var(--b-border, #E8E0D5)',
            borderRadius: 8, padding: '12px 14px',
            fontSize: '0.75rem', textAlign: 'left',
            overflowX: 'auto', marginBottom: 20,
            color: 'var(--b-ink-2, #4A3728)',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {error.stack ?? error.message}
          </pre>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onReset} style={{
            padding: '10px 20px', borderRadius: 6,
            border: '1px solid var(--b-border, #E8E0D5)',
            background: 'transparent', cursor: 'pointer',
            fontSize: '0.875rem', color: 'var(--b-ink-2, #4A3728)',
          }}>Try again</button>
          <button onClick={() => { window.location.href = '/app/feed'; }} style={{
            padding: '10px 20px', borderRadius: 6, border: 'none',
            background: 'var(--b-ink, #1C1410)', color: '#FAF6EF',
            cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
          }}>Go to feed</button>
        </div>
      </div>
    </div>
  );
}


export function RouteError() {
  const error = useRouteError();
  const navigate = useNavigate();

  const is404 = isRouteErrorResponse(error) && error.status === 404;
  const title = is404 ? 'Page not found' : 'Something went wrong';
  const message = is404
    ? "We couldn't find the page you were looking for."
    : 'An unexpected error occurred. Our team has been notified.';

  return (
    <div
      role="alert"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--b-canvas, #F2EDE6)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          background: 'var(--b-card, #FFFFFF)',
          borderRadius: 12,
          padding: '40px 36px',
          border: '1px solid var(--b-border, #E8E0D5)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '3rem',
            fontWeight: 700,
            color: 'var(--b-gold, #C2882D)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
            marginBottom: 20,
          }}
        >
          {is404 ? '404' : '500'}
        </div>

        <h1
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '1.4rem',
            fontWeight: 700,
            color: 'var(--b-ink, #1C1410)',
            margin: '0 0 12px',
          }}
        >
          {title}
        </h1>

        <p style={{ fontSize: '0.9rem', color: 'var(--b-ink-3, #8C7B74)', lineHeight: 1.6, margin: '0 0 28px' }}>
          {message}
        </p>

        {!is404 && import.meta.env.DEV && error instanceof Error && (
          <pre
            style={{
              background: 'var(--b-surface, #F9F6F0)',
              border: '1px solid var(--b-border, #E8E0D5)',
              borderRadius: 8,
              padding: '12px 14px',
              fontSize: '0.75rem',
              textAlign: 'left',
              overflowX: 'auto',
              marginBottom: 24,
              color: 'var(--b-ink-2, #4A3728)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {error.stack ?? error.message}
          </pre>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '10px 20px',
              borderRadius: 6,
              border: '1px solid var(--b-border, #E8E0D5)',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '0.875rem',
              color: 'var(--b-ink-2, #4A3728)',
            }}
          >
            Go back
          </button>
          <button
            onClick={() => navigate('/app/feed')}
            style={{
              padding: '10px 20px',
              borderRadius: 6,
              border: 'none',
              background: 'var(--b-ink, #1C1410)',
              color: '#FAF6EF',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            Go to feed
          </button>
        </div>
      </div>
    </div>
  );
}
