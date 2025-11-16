/**
 * Test setup file
 * Configures testing environment and global mocks
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock logger to avoid console noise during tests
vi.mock('@/lib/logger', () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Genkit tools that require API calls
vi.mock('@/ai/tools/dice-roller', () => ({
  diceRollerTool: vi.fn(),
}));

