import { describe, it, expect, vi } from 'vitest';
import { useModuleMessaging } from './ModuleMessaging';

describe('ModuleMessaging', () => {
  it('can subscribe and send messages', () => {
    const handler = vi.fn();
    const store = useModuleMessaging.getState();
    const unsubscribe = store.subscribe('test', handler);
    const message = {
      id: 'msg1',
      type: 'test',
      source: 'unit-test',
      timestamp: Date.now(),
      data: { foo: 'bar' }
    };
    store.sendMessage(message);
    expect(handler).toHaveBeenCalledWith(message);
    unsubscribe();
  });
});
