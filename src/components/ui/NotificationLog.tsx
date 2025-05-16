import React from 'react';
import { X, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

export interface Notification {
  id: string;
  message: string;
  icon: React.ReactNode;
  status: 'success' | 'error' | 'warning' | 'info';
  actionLabel?: string;
  onAction?: () => void;
}

interface NotificationLogProps {
  minimized?: boolean;
  onClose: () => void;
  onMinimize: () => void;
}

export default function NotificationLog({ onClose, onMinimize, minimized }: NotificationLogProps) {
  const { toasts, dismiss } = useToast();
  const [unreadIds, setUnreadIds] = React.useState(() => toasts.map(n => n.id));

  function handleDismiss(id: string) {
    setUnreadIds(ids => ids.filter(nid => nid !== id));
    dismiss(id);
  }

  if (minimized) {
    return null;
  }
  return (
    <div
      className="bg-popover border border-border rounded shadow-lg z-50 w-96"
      style={{
        position: 'absolute',
        top: '5rem',
        margin: '0 auto',
        left: '60%',
        right: 0,
      }}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted-foreground/10">
        <span className="font-semibold">Notifications</span>
        <div className="flex gap-2">
          <button onClick={onMinimize} className="text-muted-foreground hover:text-yellow-400">&#8211;</button>
          <button onClick={onClose} aria-label="Close notifications" className="text-muted-foreground hover:text-red-500">✕</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {toasts.length === 0 ? (
          <div className="text-gray-400">No notifications</div>
        ) : (
          toasts.map((n) => (
            <div
              key={n.id}
              className={`group flex items-center gap-2 px-3 py-2 rounded transition-all duration-200 border border-transparent relative bg-background ${
                unreadIds.includes(n.id)
                  ? 'ring-2 ring-primary/40 bg-primary/5' : 'hover:bg-accent/40'
              } animate-fade-in`}
              onMouseEnter={() => setUnreadIds(ids => ids.filter(id => id !== n.id))}
            >
              {/* Icon based on status */}
              {n.variant === 'destructive' ? (
                <XCircle className="text-red-500" />
              ) : n.variant === 'success' ? (
                <CheckCircle2 className="text-green-500" />
              ) : n.variant === 'warning' ? (
                <AlertTriangle className="text-yellow-500" />
              ) : (
                <CheckCircle2 className="text-primary" />
              )}
              <span className="truncate flex-1 text-sm">{n.title || n.description}</span>
              {n.action && (
                <button onClick={n.action} className="text-xs px-2 py-1 rounded bg-primary text-white hover:bg-primary/80 ml-2">Action</button>
              )}
              <button
                onClick={() => handleDismiss(n.id)}
                className="ml-2 text-muted-foreground hover:text-red-500 opacity-70 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center"
                aria-label="Dismiss notification"
                style={{ alignSelf: 'center' }}
              >
                <span className="sr-only">Dismiss</span>✕
              </button>
            </div>
          ))
        )}
      </div>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s cubic-bezier(.4,0,.2,1); }
      `}</style>
    </div>
  );
}
