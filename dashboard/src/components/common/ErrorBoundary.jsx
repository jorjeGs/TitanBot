import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import i18n from '../../i18n';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Dashboard ErrorBoundary caught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-discord-darkest flex items-center justify-center p-6 text-slate-100">
          <div className="max-w-md w-full bg-discord-darker border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400 shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                {i18n.t('errorBoundary.title', 'Algo salió mal')}
              </h2>
              <p className="text-sm text-slate-400">
                {i18n.t('errorBoundary.message', 'Ha ocurrido un error inesperado al renderizar la aplicación.')}
              </p>
            </div>

            {this.state.error?.message && (
              <div className="bg-discord-dark/80 border border-slate-800 rounded-lg p-3 text-left">
                <p className="text-xs font-mono text-slate-400 truncate" title={this.state.error.message}>
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:flex-1 py-2.5 px-4 bg-discord-blurple hover:bg-discord-blurple/90 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{i18n.t('errorBoundary.reload', 'Recargar')}</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors border border-slate-700/60"
              >
                <Home className="w-4 h-4" />
                <span>{i18n.t('errorBoundary.home', 'Inicio')}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
