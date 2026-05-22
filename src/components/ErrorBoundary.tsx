import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App error', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 24,
            maxWidth: 480,
            margin: '40px auto',
            fontFamily: 'system-ui, sans-serif',
            color: '#682e24',
          }}
        >
          <h1 style={{ fontSize: '1.1rem' }}>Something went wrong</h1>
          <p style={{ fontSize: '0.9rem' }}>{this.state.error.message}</p>
          <p style={{ fontSize: '0.85rem', color: '#666' }}>
            Check the browser console (F12), then reload the app.
          </p>
          <button
            type="button"
            style={{
              marginTop: 16,
              padding: '10px 18px',
              borderRadius: 8,
              border: 'none',
              background: '#2d8a7e',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={() => window.location.reload()}
          >
            Reload app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
