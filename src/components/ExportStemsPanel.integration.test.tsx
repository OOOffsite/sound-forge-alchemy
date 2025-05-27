// ExportStemsPanel.integration.test.tsx
// Integration test for ExportStemsPanel: render, export action
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExportStemsPanel from './ExportStemsPanel';

describe('ExportStemsPanel integration', () => {
  it('renders and triggers export', () => {
    const onExport = vi.fn();
    const stems = [
      { id: 'vocal', name: 'Vocals', type: 'vocals' },
      { id: 'drums', name: 'Drums', type: 'drums' },
    ];
    render(
      <ExportStemsPanel
        stems={stems}
        isExporting={false}
        onExport={onExport}
      />
    );
    // Click export button
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(onExport).toHaveBeenCalled();
  });
});
