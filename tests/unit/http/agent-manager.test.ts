import { describe, it, expect } from 'vitest';
import { AgentManager } from '@/lib/http/agent-manager';

describe('AgentManager', () => {
  it('reutiliza el mismo agente para el mismo origen', () => {
    const manager = new AgentManager();
    const agentA = manager.getAgentForOrigin('https://api.example.com');
    const agentB = manager.getAgentForOrigin('https://api.example.com');

    expect(agentA).toBe(agentB);
  });

  it('crea agentes distintos para orígenes distintos', () => {
    const manager = new AgentManager();
    const agentA = manager.getAgentForOrigin('https://api.example.com');
    const agentB = manager.getAgentForOrigin('https://otro.example.com');

    expect(agentA).not.toBe(agentB);
  });
});


