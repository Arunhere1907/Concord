/**
 * Centralized logging utility for Concord26
 * Provides structured logging with context
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  component?: string;
  userId?: string;
  requestId?: string;
  [key: string]: unknown;
}

/**
 * Structured logger with support for production and development environments
 */
export class Logger {
  private static log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      }),
    };

    if (process.env.NODE_ENV === "production") {
      // In production, output structured JSON for log aggregation services
      console.log(JSON.stringify(logEntry));
    } else {
      // In development, use human-readable format
      const consoleMethod = level === "debug" ? "log" : level;
      console[consoleMethod](
        `[${timestamp}] ${level.toUpperCase()}: ${message}`,
        context || "",
        error || ""
      );
    }
  }

  /**
   * Log an error with optional context and Error object
   */
  static error(message: string, context?: LogContext, error?: Error): void {
    this.log("error", message, context, error);
  }

  /**
   * Log a warning with optional context
   */
  static warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  /**
   * Log an informational message with optional context
   */
  static info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  /**
   * Log a debug message with optional context
   */
  static debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }
}
