import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { errorLogger, ErrorSeverity } from '@/lib/errorLogger';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorId?: string;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error with detailed information
        const errorLog = errorLogger.log(
            `Application Error: ${error.message}`,
            ErrorSeverity.CRITICAL,
            {
                component: 'ErrorBoundary',
                stack: error.stack || errorInfo.componentStack || undefined,
                context: {
                    componentStack: errorInfo.componentStack,
                },
            }
        );

        // Update state with error ID for user reference
        this.setState({ errorId: errorLog.id });

        console.error('Uncaught error in application:', error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: undefined, errorId: '' });
        window.location.href = '/'; // Hard reload to home to clear any corrupted state
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0f0a1f] text-white">
                    <div className="max-w-md w-full text-center">
                        <div className="w-24 h-24 bg-red-500/20 border-4 border-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-12 h-12 text-red-500" />
                        </div>

                        <h1 className="text-4xl font-pixel-title text-red-400 mb-4">أوبس! خطأ فني</h1>

                        <p className="text-xl text-[#e9d5ff]/80 font-pixel-text mb-8">
                            يبدو أن الأوتوبيس عطلان شوية. ما تقلقش، هنرجعك المحطة وتصلح كل حاجة.
                        </p>

                        {this.state.errorId && (
                            <p className="text-xs text-[#e9d5ff]/50 mb-4 font-mono break-all">
                                رقم الخطأ: {this.state.errorId}
                            </p>
                        )}

                        {this.state.error?.message && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded p-3 mb-6 text-left">
                                <p className="text-xs text-red-200 font-mono overflow-auto max-h-32">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}

                        <div className="flex flex-col gap-4">
                            <Button
                                onClick={this.handleReset}
                                size="lg"
                                className="w-full h-16 text-xl bg-gradient-to-r from-[#7c3aed] to-[#4c1d95] text-white font-pixel-title shadow-[0_4px_0_0_#2e1065] border-[3px] border-[#a78bfa]"
                            >
                                <Home className="w-6 h-6 ml-2" />
                                رجوع للمحطة الرئيسية
                            </Button>

                            <Button
                                onClick={() => window.location.reload()}
                                variant="outline"
                                size="lg"
                                className="w-full h-14 text-white hover:bg-white/10 hover:text-white border-white/20 font-pixel-text"
                            >
                                <RefreshCw className="w-5 h-5 ml-2" />
                                حاول مرة تانية
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
