import { describe, it, expect, vi } from 'vitest';
import { useMessageBus, MessageCategory, MessageSeverity } from './messageBus';

describe('messageBus', () => {
  it('should allow subscribing and publishing', () => {
    const handler = vi.fn();
    const store = useMessageBus.getState();
    const unsubscribe = store.subscribe('all', handler);
    const msg = {
      category: MessageCategory.UI,
      severity: MessageSeverity.INFO,
      title: 'Test',
      content: 'bar',
    };
    store.postMessage(msg);
    expect(handler).toHaveBeenCalled();
    unsubscribe();
  });
});
