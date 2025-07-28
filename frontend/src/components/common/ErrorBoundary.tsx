import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-900 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 max-w-2xl w-full border border-red-500/30">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">💥</div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Oops! Something went wrong
              </h1>
              <p className="text-red-200">
                The application encountered an unexpected error.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-black/20 rounded-lg p-4 mb-6">
                <h2 className="text-lg font-semibold text-white mb-2">
                  Error Details:
                </h2>
                <p className="text-red-200 font-mono text-sm break-all">
                  {this.state.error.message}
                </p>
                {process.env.NODE_ENV === "development" &&
                  this.state.errorInfo && (
                    <details className="mt-4">
                      <summary className="text-red-300 cursor-pointer hover:text-red-100">
                        Stack Trace (Development)
                      </summary>
                      <pre className="text-xs text-red-200 mt-2 overflow-auto max-h-40">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <button
                onClick={this.handleReset}
                className="btn-secondary px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="btn-primary px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105"
              >
                Reload Page
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-red-300 text-sm">
                If this problem persists, please refresh the page or contact
                support.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
