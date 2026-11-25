import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAFAFA] text-[#141413] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-[#E4E4E0] rounded-lg p-6 space-y-4">
            <h1 className="font-serif text-2xl font-medium">
              Something went wrong
            </h1>
            <p className="text-xs text-[#5A5A56] leading-relaxed">
              We encountered an issue while communicating with the store database. Please reload the page or sign in again if you are the store administrator.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] transition-colors cursor-pointer"
            >
              Reload Storefront
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
