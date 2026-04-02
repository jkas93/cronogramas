"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="flex flex-col items-center justify-center w-full h-[600px] bg-slate-50 border border-red-100 rounded-xl p-8 text-center glass-card">
          <div className="w-16 h-16 bg-red-100/50 rounded-full flex items-center justify-center mb-4 border-2 border-red-200">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Algo salió mal en el despliegue del cronograma</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            Ha ocurrido un error interno renderizando este gráfico interactivo.
            Nuestro equipo ha sido notificado (&quot;Panic Engine&quot;). Intenta recargar la página.
          </p>
          <button
            title="Recargar Sistema"
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition-colors shadow-sm"
          >
            Recargar la Plataforma
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
