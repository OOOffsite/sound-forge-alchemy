import React, { useState } from 'react';
import Draggable from 'react-draggable';

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
  stickyPlayerActive?: boolean;
  stickyPlayerHeight?: number; // px
}

const minimizedPaneWidth = 220;

const OverlayGrid: React.FC<OverlayGridProps> = ({ panes, onUpdatePane, stickyPlayerActive = false, stickyPlayerHeight = 72 }) => {
  const openPanes = panes.filter(p => !p.minimized);
  const minimizedPanes = panes.filter(p => p.minimized);
  const baseOffset = 24;
  const paneWidth = 420;
  // Calculate bottom offset for overlays/minimized bar
  const bottomOffset = stickyPlayerActive ? stickyPlayerHeight + 16 : 16;

  return (
    <>
      {/* Overlay grid for open panes, bottom right, tiled right-to-left, draggable */}
      <div
        className="fixed right-4 z-50 flex flex-row-reverse gap-4 pointer-events-none"
        style={{ bottom: bottomOffset }}
      >
        {openPanes.map((pane, idx) => (
          <Draggable
            key={pane.id}
            handle=".overlay-drag-handle"
            defaultPosition={{ x: -idx * (paneWidth + baseOffset), y: 0 }}
            bounds="body"
          >
            <div
              className="bg-popover border border-border rounded-lg shadow-lg w-[420px] min-h-[200px] flex flex-col relative pointer-events-auto animate-fade-in"
              style={{ marginLeft: idx * baseOffset }}
              role="dialog"
              aria-modal="true"
              aria-label={pane.title}
            >
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted-foreground/10 overlay-drag-handle cursor-move rounded-t-lg">
                <div className="flex items-center gap-2">
                  {pane.icon}
                  <span className="font-semibold text-base">{pane.title}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={pane.onMinimize || (() => onUpdatePane(pane.id, { minimized: true }))} className="text-muted-foreground hover:text-primary" title="Minimize"><span style={{fontWeight:600}}>&#8211;</span></button>
                  <button onClick={pane.onClose} className="text-muted-foreground hover:text-red-500" title="Close">✕</button>
                </div>
              </div>
              <div className="flex-1 overflow-auto">{pane.content}</div>
            </div>
          </Draggable>
        ))}
      </div>
      {/* Minimized panes, sticky above player if active, draggable bar */}
      <div
        className="fixed right-4 z-50 flex flex-row-reverse gap-2 pointer-events-auto"
        style={{ bottom: bottomOffset }}
      >
        {minimizedPanes.map((pane, idx) => (
          <Draggable
            key={pane.id}
            axis="x"
            bounds="body"
            defaultPosition={{ x: -idx * (minimizedPaneWidth + 12), y: 0 }}
          >
            <div
              className="bg-popover border border-border rounded-t-lg shadow-lg w-[220px] h-10 flex items-center justify-between px-3 cursor-pointer overlay-drag-handle"
              style={{ marginRight: idx * 12 }}
              onClick={() => onUpdatePane(pane.id, { minimized: false })}
              role="button"
              tabIndex={0}
              aria-label={`Expand ${pane.title}`}
            >
              <div className="flex items-center gap-2">
                {pane.icon}
                <span className="font-semibold text-sm truncate">{pane.title}</span>
              </div>
              <button
                onClick={e => {
                  e.stopPropagation();
                  if (pane.onClose) pane.onClose();
                }}
                className="text-muted-foreground hover:text-red-500" title="Close"
              >
                ✕
              </button>
            </div>
          </Draggable>
        ))}
      </div>
    </>
  );
};

export default OverlayGrid;
