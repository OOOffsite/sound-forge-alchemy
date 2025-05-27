/*
 * Author: Sound Forge Team <word@iite.bet>, Jeremiah Pegues <jeremiah@pegues.io>
 * Version: 1.0.0
 * License: MIT
 *
 * OverlayGrid component for Sound Forge Alchemy frontend.
 * Manages overlay panes and their layout.
 *
 * Logging is maximized at all levels for overlay grid and error events.
 */

import logger from '../../lib/logger';
import React, { CSSProperties, useRef, useState } from 'react';
import {
  DndContext,
  useDraggable,
  closestCenter,
  DragEndEvent,
} from '@dnd-kit/core';

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
const paneWidth = 420;
const baseOffset = 24;

function DraggableOverlayPane({
  id,
  children,
  defaultPosition,
  style,
  position,
  setPosition,
  ...props
}: {
  id: string;
  children: React.ReactNode;
  defaultPosition: { x: number; y: number };
  style?: CSSProperties;
  position: { x: number; y: number };
  setPosition: (pos: { x: number; y: number }) => void;
  [key: string]: unknown;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
  const nodeRef = useRef<HTMLDivElement>(null);

  // Calculate the final position with transform
  const finalStyle = {
    ...style,
    position: 'absolute' as const,
    zIndex: 1000,
    left: position.x,
    top: position.y,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    cursor: 'move',
    minWidth: 200,
    maxWidth: 480,
    pointerEvents: 'auto' as React.CSSProperties['pointerEvents'],
  };

  return (
    <div
      ref={setNodeRef}
      style={finalStyle}
      {...attributes}
      {...listeners}
      tabIndex={0}
      aria-grabbed="true"
      role="dialog"
      onMouseDown={e => {
        // Bring to front on click
        if (nodeRef.current) nodeRef.current.style.zIndex = '2000';
      }}
      {...props}
    >
      {children}
    </div>
  );
}

const OverlayGrid: React.FC<OverlayGridProps> = ({ panes, onUpdatePane, stickyPlayerActive = false, stickyPlayerHeight = 72 }) => {
  const openPanes = panes.filter(p => !p.minimized);
  const minimizedPanes = panes.filter(p => p.minimized);
  const bottomOffset = stickyPlayerActive ? stickyPlayerHeight + 16 : 16;

  // Track positions for each pane by id
  const [positions, setPositions] = useState<{ [id: string]: { x: number; y: number } }>(() => {
    const pos: { [id: string]: { x: number; y: number } } = {};
    openPanes.forEach((pane, idx) => {
      pos[pane.id] = {
        x: window.innerWidth - (paneWidth + baseOffset) * (idx + 1),
        y: window.innerHeight - 320 - bottomOffset,
      };
    });
    minimizedPanes.forEach((pane, idx) => {
      pos[pane.id + '-min'] = {
        x: window.innerWidth - (minimizedPaneWidth + 12) * (idx + 1),
        y: window.innerHeight - 80 - bottomOffset,
      };
    });
    return pos;
  });

  // Handle drag end to update position
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (!active || !active.id) return;
    setPositions(prev => {
      const prevPos = prev[active.id as string] || { x: 0, y: 0 };
      return {
        ...prev,
        [active.id as string]: {
          x: prevPos.x + delta.x,
          y: prevPos.y + delta.y,
        },
      };
    });
  };

  // Use absolute positioning for draggable overlays
  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div
        className="fixed right-4 z-50 flex flex-row-reverse gap-4 pointer-events-none"
        style={{ bottom: bottomOffset, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none' }}
      >
        {openPanes.map((pane, idx) => (
          <DraggableOverlayPane
            key={pane.id}
            id={pane.id}
            defaultPosition={{ x: window.innerWidth - (paneWidth + baseOffset) * (idx + 1), y: window.innerHeight - 320 - bottomOffset }}
            position={positions[pane.id] || { x: 100 + idx * 40, y: 100 }}
            setPosition={pos => setPositions(prev => ({ ...prev, [pane.id]: pos }))}
            style={{ marginLeft: idx * baseOffset }}
          >
            <div
              className="bg-popover border border-border rounded-lg shadow-lg w-[420px] min-h-[200px] flex flex-col relative pointer-events-auto animate-fade-in"
              role="dialog"
              aria-modal="true"
              aria-label={pane.title}
            >
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted-foreground/10 overlay-drag-handle cursor-move rounded-t-lg select-none">
                <div className="flex items-center gap-2">
                  {pane.icon}
                  <span className="font-semibold text-base">{pane.title}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      if (pane.onMinimize) {
                        pane.onMinimize();
                      } else {
                        onUpdatePane(pane.id, { minimized: true });
                      }
                    }}
                    className="text-muted-foreground hover:text-primary"
                    title="Minimize"
                    tabIndex={0}
                  >
                    <span style={{fontWeight:600}}>&#8211;</span>
                  </button>
                  <button
                    onClick={pane.onClose}
                    className="text-muted-foreground hover:text-red-500"
                    title="Close"
                    tabIndex={0}
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto">{pane.content}</div>
            </div>
          </DraggableOverlayPane>
        ))}
      </div>
      <div
        className="fixed right-4 z-50 flex flex-row-reverse gap-2 pointer-events-auto"
        style={{ bottom: bottomOffset }}
      >
        {minimizedPanes.map((pane, idx) => (
          <DraggableOverlayPane
            key={pane.id}
            id={pane.id + '-min'}
            defaultPosition={{ x: window.innerWidth - (minimizedPaneWidth + 12) * (idx + 1), y: window.innerHeight - 80 - bottomOffset }}
            position={positions[pane.id + '-min'] || { x: 100 + idx * 40, y: 100 }}
            setPosition={pos => setPositions(prev => ({ ...prev, [pane.id + '-min']: pos }))}
            style={{ marginRight: idx * 12 }}
          >
            <div
              className="bg-popover border border-border rounded-t-lg shadow-lg w-[220px] h-10 flex items-center justify-between px-3 cursor-pointer overlay-drag-handle select-none"
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
                className="text-muted-foreground hover:text-red-500" title="Close" tabIndex={0}
              >
                ✕
              </button>
            </div>
          </DraggableOverlayPane>
        ))}
      </div>
    </DndContext>
  );
};

export default OverlayGrid;
