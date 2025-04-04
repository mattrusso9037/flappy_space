import * as log from 'loglevel';

/**
 * Available log levels in order from most to least verbose
 */
export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  SILENT = 'silent'
}

/**
 * Interface for the logger configuration
 */
export interface LoggerConfig {
  /** Default log level */
  level: LogLevel;
  /** Whether to include timestamps in log messages */
  showTimestamp: boolean;
  /** Whether to include log level in the message */
  showLogLevel: boolean;
}

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  level: process.env.NODE_ENV === 'production' ? LogLevel.ERROR : LogLevel.DEBUG,
  showTimestamp: true,
  showLogLevel: true
};

/**
 * Initialize the logger with configuration
 */
export function initLogger(config: Partial<LoggerConfig> = {}): void {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Set the log level
  log.setLevel(finalConfig.level);
  
  // Save config for formatters
  (window as any).__loggerConfig = finalConfig;
  
  // Log the current configuration
  Logger.info('Logger initialized', { level: finalConfig.level });
}

/**
 * Format a log message with context information
 */
function formatMessage(level: LogLevel, context: string, message: string): string {
  const config = (window as any).__loggerConfig || DEFAULT_CONFIG;
  
  const parts: string[] = [];
  
  if (config.showTimestamp) {
    parts.push(`[${new Date().toISOString()}]`);
  }
  
  if (config.showLogLevel) {
    parts.push(`[${level.toUpperCase()}]`);
  }
  
  if (context) {
    parts.push(`[${context}]`);
  }
  
  parts.push(message);
  
  return parts.join(' ');
}

/**
 * Create a contextualized logger
 */
export function getLogger(context: string) {
  return {
    trace: (message: string, ...args: any[]) => 
      log.trace(formatMessage(LogLevel.TRACE, context, message), ...args),
    
    debug: (message: string, ...args: any[]) => 
      log.debug(formatMessage(LogLevel.DEBUG, context, message), ...args),
    
    info: (message: string, ...args: any[]) => 
      log.info(formatMessage(LogLevel.INFO, context, message), ...args),
    
    warn: (message: string, ...args: any[]) => 
      log.warn(formatMessage(LogLevel.WARN, context, message), ...args),
    
    error: (message: string, ...args: any[]) => 
      log.error(formatMessage(LogLevel.ERROR, context, message), ...args)
  };
}

/**
 * Default logger without context
 */
export const Logger = getLogger('');

/**
 * Set the global log level
 */
export function setLogLevel(level: LogLevel): void {
  log.setLevel(level);
  Logger.info(`Log level set to ${level}`);
}

/**
 * Enable logging to a persistent location (like localStorage or a file)
 * This is a placeholder for potential future enhancement
 */
export function enablePersistence(): void {
  // This is where you could add persistence - e.g., writing to localStorage or sending to a server
  Logger.info('Log persistence enabled');
}

/**
 * Initialize with default configuration
 */
initLogger();

export default Logger;
