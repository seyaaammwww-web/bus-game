/**
 * Error handling utilities
 * Provides structured error handling and logging
 */

import { performanceMonitor } from './performance';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorLog {
  id: string;
  timestamp: number;
  message: string;
  severity: ErrorSeverity;
  component?: string;
  stack?: string;
  context?: Record<string, unknown>;
  userId?: string;
  url?: string;
  metrics?: Record<string, unknown>;
}

class ErrorLogger {
  private errors: ErrorLog[] = [];
  private maxErrors = 100;
  private webhookUrl?: string;

  constructor(webhookUrl?: string) {
    this.webhookUrl = webhookUrl;
  }

  /**
   * Log an error
   */
  log(
    message: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    options: {
      component?: string;
      stack?: string;
      context?: Record<string, unknown>;
      userId?: string;
    } = {}
  ): ErrorLog {
    const error: ErrorLog = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      message,
      severity,
      component: options.component,
      stack: options.stack,
      context: options.context,
      userId: options.userId,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      metrics: severity === ErrorSeverity.CRITICAL ? performanceMonitor.getMetrics() : undefined,
    };

    this.errors.push(error);

    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${severity.toUpperCase()}] ${message}`, error);
    }

    // Send critical errors to webhook
    if (severity === ErrorSeverity.CRITICAL && this.webhookUrl) {
      this.sendToWebhook(error);
    }

    return error;
  }

  /**
   * Send error to webhook (e.g., Discord, Slack)
   */
  private async sendToWebhook(error: ErrorLog): Promise<void> {
    if (!this.webhookUrl) return;

    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🚨 **CRITICAL ERROR**\n**Message:** ${error.message}\n**Component:** ${error.component || 'Unknown'}\n**Time:** ${new Date(error.timestamp).toISOString()}`,
          embeds: [
            {
              color: 16711680, // Red
              fields: [
                { name: 'Error ID', value: error.id, inline: true },
                { name: 'Severity', value: error.severity.toUpperCase(), inline: true },
                { name: 'URL', value: error.url || 'Unknown', inline: false },
                { name: 'Stack', value: `\`\`\`${error.stack || 'No stack trace'}\`\`\``, inline: false },
              ],
            },
          ],
        }),
      });
    } catch (err) {
      console.error('Failed to send error to webhook:', err);
    }
  }

  /**
   * Get all logged errors
   */
  getErrors(severity?: ErrorSeverity): ErrorLog[] {
    if (!severity) return [...this.errors];
    return this.errors.filter((e) => e.severity === severity);
  }

  /**
   * Clear error logs
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * Export errors as JSON
   */
  exportErrors(): string {
    return JSON.stringify(this.errors, null, 2);
  }
}

export const errorLogger = new ErrorLogger();

/**
 * User-friendly error messages
 */
export const userFriendlyMessages: Record<string, string> = {
  NETWORK_ERROR: 'حدث خطأ في الاتصال. تحقق من اتصالك بالإنترنت.',
  TIMEOUT: 'انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى.',
  SERVER_ERROR: 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً.',
  INVALID_INPUT: 'الإدخال غير صحيح. تحقق من البيانات المدخلة.',
  PERMISSION_DENIED: 'ليس لديك إذن للقيام بهذا الإجراء.',
  RESOURCE_NOT_FOUND: 'المورد المطلوب غير موجود.',
  DUPLICATE_REQUEST: 'تم رفع الطلب مؤخراً. انتظر قليلاً.',
  RATE_LIMITED: 'تحاول بسرعة كبيرة. انتظر قليلاً.',
};

/**
 * Get user-friendly error message
 */
export function getUserErrorMessage(errorKey: string): string {
  return userFriendlyMessages[errorKey] || userFriendlyMessages.SERVER_ERROR;
}
