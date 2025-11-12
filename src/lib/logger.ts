/**
 * Sistema de logging estructurado para el backend
 * 
 * Proporciona logs consistentes y legibles en la terminal del servidor,
 * facilitando la depuración y el seguimiento del flujo de la aplicación.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogContext {
  module?: string;
  action?: string;
  [key: string]: any;
}

class Logger {
  private minLevel: LogLevel;
  private colors: boolean;

  constructor() {
    // En desarrollo, mostrar todos los logs. En producción, solo INFO y superiores
    this.minLevel = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    this.colors = process.stdout.isTTY && !process.env.NO_COLOR;
  }

  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substring(0, 23);
  }

  private formatContext(context?: LogContext): string {
    if (!context || Object.keys(context).length === 0) return '';
    
    const parts: string[] = [];
    if (context.module) parts.push(`[${context.module}]`);
    if (context.action) parts.push(`<${context.action}>`);
    
    // Añadir otros campos del contexto
    const otherFields = Object.entries(context)
      .filter(([key]) => key !== 'module' && key !== 'action')
      .map(([key, value]) => {
        if (typeof value === 'object') {
          return `${key}=${JSON.stringify(value)}`;
        }
        return `${key}=${value}`;
      });
    
    if (otherFields.length > 0) {
      parts.push(otherFields.join(' '));
    }
    
    return parts.length > 0 ? ` ${parts.join(' ')}` : '';
  }

  private colorize(level: LogLevel, message: string): string {
    if (!this.colors) return message;
    
    const colors = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
    };
    const reset = '\x1b[0m';
    
    const levelNames = {
      [LogLevel.DEBUG]: 'DEBUG',
      [LogLevel.INFO]: 'INFO ',
      [LogLevel.WARN]: 'WARN ',
      [LogLevel.ERROR]: 'ERROR',
    };
    
    return `${colors[level]}${levelNames[level]}${reset} ${message}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (level < this.minLevel) return;

    const timestamp = this.formatTimestamp();
    const contextStr = this.formatContext(context);
    const fullMessage = `${timestamp} ${this.colorize(level, message)}${contextStr}`;

    if (error) {
      const errorDetails = error.stack || error.message;
      console.error(fullMessage);
      console.error(errorDetails);
    } else {
      const logMethod = level === LogLevel.ERROR ? console.error : 
                       level === LogLevel.WARN ? console.warn : 
                       console.log;
      logMethod(fullMessage);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log específico para el flujo de coordinación del juego
   */
  gameCoordinator(message: string, data?: { action?: string; inCombat?: boolean; turnIndex?: number }): void {
    this.info(message, {
      module: 'GameCoordinator',
      ...data,
    });
  }

  /**
   * Log específico para acciones del servidor
   */
  serverAction(message: string, data?: { action?: string; [key: string]: any }): void {
    this.info(message, {
      module: 'ServerAction',
      ...data,
    });
  }

  /**
   * Log específico para herramientas de IA
   */
  aiTool(toolName: string, message: string, data?: { [key: string]: any }): void {
    this.debug(message, {
      module: 'AITool',
      tool: toolName,
      ...data,
    });
  }

  /**
   * Log específico para flujos de IA
   */
  aiFlow(flowName: string, message: string, data?: { [key: string]: any }): void {
    this.debug(message, {
      module: 'AIFlow',
      flow: flowName,
      ...data,
    });
  }
}

// Exportar una instancia singleton
export const logger = new Logger();

// Exportar funciones de conveniencia
export const log = {
  debug: (message: string, context?: LogContext) => logger.debug(message, context),
  info: (message: string, context?: LogContext) => logger.info(message, context),
  warn: (message: string, context?: LogContext) => logger.warn(message, context),
  error: (message: string, context?: LogContext, error?: Error) => logger.error(message, context, error),
  gameCoordinator: (message: string, data?: { action?: string; inCombat?: boolean; turnIndex?: number }) => 
    logger.gameCoordinator(message, data),
  serverAction: (message: string, data?: { action?: string; [key: string]: any }) => 
    logger.serverAction(message, data),
  aiTool: (toolName: string, message: string, data?: { [key: string]: any }) => 
    logger.aiTool(toolName, message, data),
  aiFlow: (flowName: string, message: string, data?: { [key: string]: any }) => 
    logger.aiFlow(flowName, message, data),
};

