import { vi } from 'vitest';

// Mock next-auth globally
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));
