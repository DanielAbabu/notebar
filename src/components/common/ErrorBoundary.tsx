import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

interface ErrorBoundaryProps {
    children: ReactNode;
    /** When provided, the fallback offers a "Go back" action instead of a full reload — used for scoped boundaries around a single note/sketch so one bad item doesn't take down the whole app. */
    onReset?: () => void;
    resetLabel?: string;
    message?: string;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

/**
 * Catches JavaScript errors anywhere in their child component tree.
 * Logs those errors and displays a fallback UI instead of the component tree that crashed.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    public static getDerivedStateFromError(_: Error): ErrorBoundaryState {
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReload = () => {
        window.location.reload();
    };

    private handleReset = () => {
        this.setState({ hasError: false });
        this.props.onReset?.();
    };

    public render(): React.ReactNode {
        if (this.state.hasError) {
            const scoped = !!this.props.onReset;
            return (
                <div className="flex flex-col items-center justify-center min-h-[500px] w-full p-8 text-center space-y-6 theme-bg text-theme-text">
                    <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                        <AlertTriangle className="w-10 h-10 text-red-500" />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-xl font-bold">Oops, something went wrong</h2>
                        <p className="text-sm opacity-60 max-w-[280px] mx-auto leading-relaxed">
                            {this.props.message || "NoteBar encountered an unexpected error. Don't worry, your notes are likely safe."}
                        </p>
                    </div>

                    {scoped ? (
                        <button
                            onClick={this.handleReset}
                            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-theme-text text-theme-bg text-sm font-bold shadow-lg shadow-black/5 hover:opacity-90 transition-all"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            {this.props.resetLabel || 'Go back'}
                        </button>
                    ) : (
                        <button
                            onClick={this.handleReload}
                            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-theme-text text-theme-bg text-sm font-bold shadow-lg shadow-black/5 hover:opacity-90 transition-all"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Reload Extension
                        </button>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
