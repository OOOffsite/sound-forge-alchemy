import React from 'react';
import { render } from '@testing-library/react';
import { ModuleRegistryProvider, useModuleRegistry } from './ModuleRegistry';

describe('ModuleRegistry', () => {
  it('provides context', () => {
    let contextValue;
    function TestComponent() {
      contextValue = useModuleRegistry();
      return <div>Test</div>;
    }
    render(
      <ModuleRegistryProvider>
        <TestComponent />
      </ModuleRegistryProvider>
    );
    expect(contextValue).toBeDefined();
  });
});
