import React, { useState, useRef, useEffect } from 'react';

interface DebugConsoleOverlayProps {
  minimized?: boolean;
  onClose: () => void;
  onMinimize: () => void;
}

const DebugConsoleOverlay: React.FC<DebugConsoleOverlayProps> = ({ onClose, onMinimize, minimized }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Example: Listen for custom debug events (replace with real events as needed)
  useEffect(() => {
    function handleDebugEvent(e: CustomEvent) {
      setLogs((prev) => [...prev, e.detail]);
    }
    window.addEventListener('debug-log', handleDebugEvent as EventListener);
    return () => {
      window.removeEventListener('debug-log', handleDebugEvent as EventListener);
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (minimized) {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-between items-center p-4 bg-gray-900 border-b border-gray-700">
        <span className="text-lg font-semibold text-white">Debug Console</span>
        <div className="flex gap-2">
          <button onClick={onMinimize} className="text-white hover:text-yellow-400">&#8211;</button>
          <button onClick={onClose} className="text-white hover:text-red-400">✕</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 text-mono text-xs text-green-200 bg-gray-950">
        {logs.length === 0 ? (
          <div className="text-gray-400">No debug logs yet.</div>
        ) : (
          logs.map((log, idx) => <div key={idx}>{log}</div>)
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

export default DebugConsoleOverlay;
