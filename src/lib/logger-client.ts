/**
 * Sistema de logging para el cliente (frontend)
 * 
 * Versión simplificada del logger para uso en componentes React del cliente.
 * Los logs aparecen en la consola del navegador.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogContext {
  component?: string;
  action?: string;
  [key: string]: any;
}

class ClientLogger {
  private minLevel: LogLevel;

  constructor() {
    // En desarrollo, mostrar todos los logs. En producción, solo WARN y ERROR
    this.minLevel = process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG;
  }

  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substring(0, 23);
  }

  private formatContext(context?: LogContext): string {
    if (!context || Object.keys(context).length === 0) return '';
    
    const parts: string[] = [];
    if (context.component) parts.push(`[${context.component}]`);
    if (context.action) parts.push(`<${context.action}>`);
    
    // Añadir otros campos del contexto
    const otherFields = Object.entries(context)
      .filter(([key]) => key !== 'component' && key !== 'action')
      .map(([key, value]) => {
        if (typeof value === 'object') {
          try {
            return `${key}=${JSON.stringify(value)}`;
          } catch {
            return `${key}=[object]`;
          }
        }
        return `${key}=${value}`;
      });
    
    if (otherFields.length > 0) {
      parts.push(otherFields.join(' '));
    }
    
    return parts.length > 0 ? ` ${parts.join(' ')}` : '';
  }

  private colorize(level: LogLevel, message: string): string {
    // En el navegador, usar estilos de consola
    const levelNames = {
      [LogLevel.DEBUG]: 'DEBUG',
      [LogLevel.INFO]: 'INFO ',
      [LogLevel.WARN]: 'WARN ',
      [LogLevel.ERROR]: 'ERROR',
    };
    
    return `${levelNames[level]} ${message}`;
  }

  /**
   * Envía el log al servidor para centralización
   */
  private async sendToServer(level: LogLevel, message: string, context?: LogContext, error?: Error): Promise<void> {
    try {
      // Solo enviar INFO, WARN y ERROR al servidor (no DEBUG para evitar spam)
      if (level === LogLevel.DEBUG) return;

      await fetch('/api/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level: level === LogLevel.INFO ? 'INFO' : 
                 level === LogLevel.WARN ? 'WARN' : 
                 level === LogLevel.ERROR ? 'ERROR' : 'DEBUG',
          message,
          context: {
            ...context,
            ...(error && { errorMessage: error.message, errorStack: error.stack }),
          },
        }),
      });
    } catch (err) {
      // Silenciar errores de envío para no crear un bucle infinito
      // Solo loguear en consola si falla (sin enviar al servidor)
      console.warn('Failed to send log to server:', err);
    }
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
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    } else {
      const logMethod = level === LogLevel.ERROR ? console.error : 
                       level === LogLevel.WARN ? console.warn : 
                       level === LogLevel.INFO ? console.info :
                       console.log;
      logMethod(fullMessage);
    }

    // Enviar al servidor para centralización (excepto DEBUG)
    this.sendToServer(level, message, context, error);
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
   * Log específico para componentes del juego
   */
  gameComponent(component: string, message: string, data?: { [key: string]: any }): void {
    this.info(message, {
      component,
      ...data,
    });
  }

  /**
   * Log específico para eventos de UI
   */
  uiEvent(component: string, message: string, data?: { [key: string]: any }): void {
    this.info(message, {
      component,
      action: 'uiEvent',
      ...data,
    });
  }

  /**
   * Log específico para errores de UI
   */
  uiError(component: string, message: string, error?: Error, data?: { [key: string]: any }): void {
    this.error(message, {
      component,
      ...data,
    }, error);
  }
}

// Exportar una instancia singleton
export const clientLogger = new ClientLogger();

// Exportar funciones de conveniencia
export const logClient = {
  debug: (message: string, context?: LogContext) => clientLogger.debug(message, context),
  info: (message: string, context?: LogContext) => clientLogger.info(message, context),
  warn: (message: string, context?: LogContext) => clientLogger.warn(message, context),
  error: (message: string, context?: LogContext, error?: Error) => clientLogger.error(message, context, error),
  gameComponent: (component: string, message: string, data?: { [key: string]: any }) => 
    clientLogger.gameComponent(component, message, data),
  uiEvent: (component: string, message: string, data?: { [key: string]: any }) => 
    clientLogger.uiEvent(component, message, data),
  uiError: (component: string, message: string, error?: Error, data?: { [key: string]: any }) => 
    clientLogger.uiError(component, message, error, data),
};

