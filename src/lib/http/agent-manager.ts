import 'server-only';
import { Agent } from 'undici';
import { log } from '@/lib/logger';

export interface AgentManagerOptions {
  keepAliveTimeout?: number;
  keepAliveMaxTimeout?: number;
  headersTimeout?: number;
  bodyTimeout?: number;
  connections?: number;
}

/**
 * Administra agentes HTTP por origen para habilitar keep-alive y pools reutilizables.
 * Un agente se crea por origen (protocol + host + puerto) y se reutiliza entre llamadas.
 */
export class AgentManager {
  private readonly agents: Map<string, Agent>;
  private readonly options: Required<AgentManagerOptions>;

  constructor(options?: AgentManagerOptions) {
    this.agents = new Map();
    this.options = {
      keepAliveTimeout: options?.keepAliveTimeout ?? 30_000,
      keepAliveMaxTimeout: options?.keepAliveMaxTimeout ?? 60_000,
      headersTimeout: options?.headersTimeout ?? 30_000,
      bodyTimeout: options?.bodyTimeout ?? 60_000,
      connections: options?.connections ?? 10,
    };
  }

  /**
   * Obtiene (o crea) un agente para el origen indicado.
   */
  getAgentForOrigin(origin: string): Agent {
    const key = this.normalizeOrigin(origin);
    if (!key) {
      throw new Error(`Origen inválido: ${origin}`);
    }

    const existing = this.agents.get(key);
    if (existing) {
      log.debug('Reutilizando agente HTTP persistente', {
        module: 'AgentManager',
        origin: key,
      });
      return existing;
    }

    const agent = new Agent({
      keepAliveTimeout: this.options.keepAliveTimeout,
      keepAliveMaxTimeout: this.options.keepAliveMaxTimeout,
      headersTimeout: this.options.headersTimeout,
      bodyTimeout: this.options.bodyTimeout,
      connections: this.options.connections,
    });

    this.agents.set(key, agent);
    log.debug('Creando nuevo agente HTTP persistente', {
      module: 'AgentManager',
      origin: key,
      keepAliveTimeout: this.options.keepAliveTimeout,
      keepAliveMaxTimeout: this.options.keepAliveMaxTimeout,
      headersTimeout: this.options.headersTimeout,
      bodyTimeout: this.options.bodyTimeout,
      connections: this.options.connections,
    });
    return agent;
  }

  /**
   * Cierra todos los agentes creados (para tests o shutdown controlado).
   */
  async closeAll(): Promise<void> {
    const closers = Array.from(this.agents.values()).map(agent => agent.close());
    await Promise.allSettled(closers);
    this.agents.clear();
  }

  private normalizeOrigin(urlLike: string): string | null {
    try {
      const url = new URL(urlLike);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      return url.origin;
    } catch {
      return null;
    }
  }
}


