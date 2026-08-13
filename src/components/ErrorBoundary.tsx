import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

/**
 * Without this, any runtime error after mount unmounts the whole React tree
 * and leaves the dark page background with nothing on it — a silent black
 * screen with no indication anything went wrong. This catches that and shows
 * a recoverable screen instead, and clears the save in case corrupted
 * persisted state was the cause.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('The Pakistan Experiment crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="center-screen">
          <span className="badge" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>Something went wrong</span>
          <h2 style={{ marginTop: 16 }}>The simulation hit an error</h2>
          <p style={{ color: 'var(--text-dim)', maxWidth: 480, margin: '10px 0 24px' }}>
            {this.state.error.message || 'An unexpected error stopped the game.'}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => {
              localStorage.removeItem('pakistan-experiment-save');
              window.location.reload();
            }}
          >
            Reset and Start Over
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
