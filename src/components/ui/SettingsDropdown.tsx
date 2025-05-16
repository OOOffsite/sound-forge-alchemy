import React from 'react';
import { X } from 'lucide-react';

interface SettingsDropdownProps {
  onClose: () => void;
}

export default function SettingsDropdown({ onClose }: SettingsDropdownProps) {
  return (
    <div className="absolute right-0 mt-2 w-80 bg-popover border border-border rounded shadow-lg z-50">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted-foreground/10">
        <span className="font-semibold">Settings</span>
        <button onClick={onClose} aria-label="Close settings">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <div className="font-medium mb-1">Model Settings</div>
          <button className="text-xs px-2 py-1 rounded bg-primary text-white hover:bg-primary/80">Manage Models</button>
        </div>
        <div>
          <div className="font-medium mb-1">SpotDL Customizations</div>
          <div className="space-y-2">
            <input className="w-full px-2 py-1 border rounded" placeholder="Proxy URL (optional)" />
            <select className="w-full px-2 py-1 border rounded">
              <option>Output Format (default: mp3)</option>
              <option>mp3</option>
              <option>flac</option>
              <option>wav</option>
            </select>
            <input className="w-full px-2 py-1 border rounded" placeholder="Separation Stems (e.g. 2, 4, 6)" />
          </div>
        </div>
        <div>
          <div className="font-medium mb-1">Debugging</div>
          <label className="flex items-center gap-2">
            <input type="checkbox" /> Enable Debug Console
          </label>
        </div>
      </div>
    </div>
  );
}
