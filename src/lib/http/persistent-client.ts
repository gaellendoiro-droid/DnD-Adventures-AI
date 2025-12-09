// import 'server-only';
import type { Dispatcher } from 'undici';
import { AgentManager, type AgentManagerOptions } from './agent-manager';

export interface PersistentClientConfig extends AgentManagerOptions {
  /**
   * Permite inyectar un fetch base (útil en tests). Por defecto usa globalThis.fetch.
   */
  baseFetch?: typeof fetch;
}

type FetchLike = typeof fetch;

/**
 * Crea una función fetch que reutiliza conexiones (keep-alive) por origen usando undici.
 * Si la URL no es absoluta HTTP/HTTPS, delega al fetch base sin cambios.
 */
export function createPersistentFetch(config?: PersistentClientConfig): FetchLike {
  const agentManager = new AgentManager(config);
  const baseFetch: FetchLike = config?.baseFetch ?? globalThis.fetch;

  const persistentFetch: FetchLike = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url = extractUrl(input);

      // Para rutas relativas o esquemas no http(s), usar fetch base sin dispatcher.
      if (!url || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
        return baseFetch(input as any, init as any);
      }

      const agent = agentManager.getAgentForOrigin(url.origin);
      const dispatcher = agent as unknown as Dispatcher;

      return baseFetch(input as any, {
        ...(init || {}),
        dispatcher,
      } as any);
    } catch {
      // Si algo falla al resolver el origen, hacer fallback al fetch base.
      return baseFetch(input as any, init as any);
    }
  };

  return persistentFetch;
}

/**
 * Instancia lista para usar con configuración por defecto.
 */
export const persistentFetch = createPersistentFetch();

function extractUrl(input: RequestInfo | URL): URL | null {
  if (typeof input === 'string') {
    try {
      return new URL(input);
    } catch {
      return null;
    }
  }

  if (input instanceof URL) {
    return input;
  }

  if (typeof Request !== 'undefined' && input instanceof Request) {
    try {
      return new URL(input.url);
    } catch {
      return null;
    }
  }

  return null;
}


