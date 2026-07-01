import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-8 text-right" dir="rtl">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-black text-red-700 mb-2">⚠️ حدث خطأ غير متوقع</h3>
            <p className="text-sm font-bold text-red-600 mb-4">تفاصيل الخطأ:</p>
            <pre className="bg-red-100 p-4 rounded-xl text-xs font-mono text-red-800 whitespace-pre-wrap break-words max-h-80 overflow-auto">
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
