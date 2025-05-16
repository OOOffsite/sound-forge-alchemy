import React from 'react';
import { X, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

// Example notification type
export interface Notification {
  id: string;
  message: string;
  icon: React.ReactNode;
  status: 'success' | 'error' | 'warning' | 'info';
  actionLabel?: string;
  onAction?: () => void;
}

interface NotificationLogProps {
  notifications?: Notification[];
  onClose: () => void;
}

// Dummy notifications for UI demo
const demoNotifications: Notification[] = [
  {
    id: '1',
    message: 'Model download complete',
    icon: <CheckCircle2 className="text-green-500" />,
    status: 'success',
  },
  {
    id: '2',
    message: 'Failed to analyze track',
    icon: <XCircle className="text-red-500" />,
    status: 'error',
    actionLabel: 'Retry',
    onAction: () => alert('Retrying...'),
  },
  {
    id: '3',
    message: 'Some models are missing',
    icon: <AlertTriangle className="text-yellow-500" />,
    status: 'warning',
  },
];

export default function NotificationLog({ notifications = demoNotifications, onClose }: NotificationLogProps) {
  return (
    <div className="absolute right-0 mt-2 w-96 bg-popover border border-border rounded shadow-lg z-50">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted-foreground/10">
        <span className="font-semibold">Notifications</span>
        <button onClick={onClose} aria-label="Close notifications">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="max-h-96 overflow-y-auto divide-y divide-border">
        {notifications.length === 0 && (
          <div className="p-4 text-center text-muted-foreground">No notifications</div>
        )}
        {notifications.map((n) => (
          <div key={n.id} className="flex items-center gap-3 px-4 py-3 relative group">
            <span className="relative">
              {n.icon}
              {/* Status badge */}
              {n.status === 'success' && <CheckCircle2 className="absolute -top-1 -right-1 h-3 w-3 text-green-500 bg-white rounded-full border border-white" />}
              {n.status === 'error' && <XCircle className="absolute -top-1 -right-1 h-3 w-3 text-red-500 bg-white rounded-full border border-white" />}
              {n.status === 'warning' && <AlertTriangle className="absolute -top-1 -right-1 h-3 w-3 text-yellow-500 bg-white rounded-full border border-white" />}
            </span>
            <span className="flex-1 text-sm">{n.message}</span>
            {n.actionLabel && n.onAction && (
              <button
                className="ml-auto px-2 py-1 text-xs rounded bg-primary text-white hover:bg-primary/80 transition"
                onClick={n.onAction}
              >
                {n.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
