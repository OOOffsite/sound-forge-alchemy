import { describe, it, expect } from 'vitest';
import { useModuleRegistry } from './ModuleRegistry';
import { ModuleType, ModuleDependency, ModuleStatus } from './ModuleTypes';

describe('useModuleRegistry', () => {
  it('can register and retrieve a module', () => {
    const store = useModuleRegistry.getState();
    store.registerModule({
      id: 'test',
      type: ModuleType.DEBUG_CONSOLE,
      title: 'Test',
      dependencies: [ModuleDependency.DEBUG],
      status: ModuleStatus.IDLE,
      component: () => null,
    });
    expect(store.getModule('test')).toBeDefined();
  });
});
