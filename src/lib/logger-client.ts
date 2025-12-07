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

  /**
   * Formatea un valor individual para mostrarlo en el log
   */
  private formatValue(value: any): string {
    // Manejar null y undefined
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    
    // Manejar booleanos
    if (typeof value === 'boolean') return value.toString();
    
    // Manejar strings - truncar si son muy largos
    if (typeof value === 'string') {
      const maxLength = 100;
      if (value.length > maxLength) {
        return `${value.substring(0, maxLength)}...`;
      }
      return value;
    }
    
    // Manejar números
    if (typeof value === 'number') return value.toString();
    
    // Manejar objetos y arrays
    if (typeof value === 'object') {
      try {
        // Formato compacto pero legible
        const json = JSON.stringify(value);
        const maxLength = 200;
        if (json.length > maxLength) {
          return `${json.substring(0, maxLength)}...`;
        }
        return json;
      } catch {
        return '[object]';
      }
    }
    
    return String(value);
  }

  /**
   * Formatea los campos de contexto con orden alfabético
   */
  private formatOtherFields(context?: LogContext): string {
    if (!context || Object.keys(context).length === 0) return '';
    
    // Obtener campos excluyendo component y action, y ordenarlos alfabéticamente
    const otherFields = Object.entries(context)
      .filter(([key]) => key !== 'component' && key !== 'action')
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, value]) => {
        const formattedValue = this.formatValue(value);
        return `${key}=${formattedValue}`;
      });
    
    return otherFields.length > 0 ? ` - ${otherFields.join(' ')}` : '';
  }

  private colorize(level: LogLevel): string {
    // En el navegador, usar estilos de consola
    const levelNames = {
      [LogLevel.DEBUG]: 'DEBUG',
      [LogLevel.INFO]: 'INFO ',
      [LogLevel.WARN]: 'WARN ',
      [LogLevel.ERROR]: 'ERROR',
    };
    
    return levelNames[level];
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
    const componentStr = context?.component ? `[${context.component}]` : '';
    const otherFieldsStr = this.formatOtherFields(context);
    const levelStr = this.colorize(level);
    const fullMessage = `${timestamp} ${levelStr}${componentStr ? ` ${componentStr}` : ''} ${message}${otherFieldsStr}`;

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

