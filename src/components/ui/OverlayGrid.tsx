import React, { useState } from 'react';

export interface OverlayPane {
  id: string;
  title: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  minimized?: boolean;
  onClose?: () => void;
  onMinimize?: () => void;
  onExpand?: () => void;
}

interface OverlayGridProps {
  panes: OverlayPane[];
  onUpdatePane: (id: string, updates: Partial<OverlayPane>) => void;
}

const minimizedPaneWidth = 220;

const OverlayGrid: React.FC<OverlayGridProps> = ({ panes, onUpdatePane }) => {
  // Only show non-minimized panes in the overlay grid
  const openPanes = panes.filter(p => !p.minimized);
  const minimizedPanes = panes.filter(p => p.minimized);

  return (
    <>
      {/* Overlay grid for open panes */}
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div className="absolute top-8 right-8 flex flex-col gap-4 pointer-events-auto">
          {openPanes.map((pane) => (
            <div key={pane.id} className="bg-background border border-border rounded-lg shadow-lg w-[420px] min-h-[200px] flex flex-col relative">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted-foreground/10 cursor-move">
                <div className="flex items-center gap-2">
                  {pane.icon}
                  <span className="font-semibold text-base">{pane.title}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => onUpdatePane(pane.id, { minimized: true })} className="text-muted-foreground hover:text-primary" title="Minimize"><span style={{fontWeight:600}}>&#8211;</span></button>
                  <button onClick={pane.onClose} className="text-muted-foreground hover:text-red-500" title="Close">✕</button>
                </div>
              </div>
              <div className="flex-1 overflow-auto">{pane.content}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Minimized panes, sticky bottom right, tiled rtl */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-row-reverse gap-2 pointer-events-auto">
        {minimizedPanes.map((pane, idx) => (
          <div key={pane.id} className="bg-background border border-border rounded-t-lg shadow-lg w-[220px] h-10 flex items-center justify-between px-3 cursor-pointer"
            style={{ marginRight: idx * 12 }}
            onClick={() => onUpdatePane(pane.id, { minimized: false })}
          >
            <div className="flex items-center gap-2">
              {pane.icon}
              <span className="font-semibold text-sm truncate">{pane.title}</span>
            </div>
            <button onClick={e => { e.stopPropagation(); pane.onClose && pane.onClose(); }} className="text-muted-foreground hover:text-red-500" title="Close">✕</button>
          </div>
        ))}
      </div>
    </>
  );
};

export default OverlayGrid;
