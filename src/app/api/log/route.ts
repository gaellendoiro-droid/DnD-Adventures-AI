import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';

/**
 * API endpoint para centralizar logs del cliente en el servidor
 * 
 * Permite que el cliente envíe eventos de logging que se registrarán
 * en la terminal del servidor usando el sistema de logging estructurado.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { level, message, context } = body;

    // Validar que tenemos los campos requeridos
    if (!level || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: level and message' },
        { status: 400 }
      );
    }

    // Mapear niveles del cliente a los del servidor
    const levelMap: Record<string, 'debug' | 'info' | 'warn' | 'error'> = {
      'DEBUG': 'debug',
      'INFO': 'info',
      'WARN': 'warn',
      'ERROR': 'error',
    };

    const logLevel = levelMap[level.toUpperCase()] || 'info';
    const logContext = {
      module: 'Client',
      ...context,
    };

    // Registrar en el servidor usando el sistema de logging estructurado
    switch (logLevel) {
      case 'debug':
        log.debug(message, logContext);
        break;
      case 'info':
        log.info(message, logContext);
        break;
      case 'warn':
        log.warn(message, logContext);
        break;
      case 'error':
        log.error(message, logContext);
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    log.error('API: Failed to process client log', {
      module: 'API',
      endpoint: '/api/log',
    }, error);
    return NextResponse.json(
      { error: 'Failed to process log' },
      { status: 500 }
    );
  }
}

