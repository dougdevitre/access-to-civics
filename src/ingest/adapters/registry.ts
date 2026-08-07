import type { StateAdapter } from './types.js';
import { MissouriAdapter } from './missouri.js';

const adapters = new Map<string, StateAdapter>([['MO', new MissouriAdapter()]]);

export function getAdapter(state: string): StateAdapter {
  const a = adapters.get(state.toUpperCase());
  if (!a) {
    throw new Error(
      `No adapter for "${state}". Registered: ${[...adapters.keys()].join(', ') || 'none'}`,
    );
  }
  return a;
}

export function registeredStates(): string[] {
  return [...adapters.keys()].sort();
}
