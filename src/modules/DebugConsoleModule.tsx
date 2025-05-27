import React, { useEffect, useState } from 'react';
import { 
  ModuleType, 
  ModulePosition, 
  ModuleSize, 
  useRegisterModule 
} from '../context/ModuleRegistry';
import { Bug } from 'lucide-react';
import { useMessageBus, MessageCategory, MessageSeverity, Message } from '../state/messageBus';

interface DebugConsoleModuleProps {
  // Module-specific props (if any)
}

const DebugConsoleModule: React.FC<DebugConsoleModuleProps> = (props) => {
  // Register this component as a module
  useRegisterModule({
    id: 'debug-console',
    type: ModuleType.DEBUG,
    title: 'Debug Console',
    description: 'View debug logs and system events',
    component: DebugConsoleInner,
    position: ModulePosition.OVERLAY,
    size: ModuleSize.MEDIUM,
    initialProps: props,
    icon: <Bug size={18} />,
  });
  
  // This component doesn't render anything itself
  return null;
};

// Inner component that will be rendered within the module container
const DebugConsoleInner: React.FC<DebugConsoleModuleProps> = (props) => {
  const messageBus = useMessageBus();
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Subscribe to debug messages
  useEffect(() => {
    // Get initial debug messages
    setMessages(messageBus.getMessages(MessageCategory.DEBUG));
    
    // Subscribe to new debug messages
    const unsubscribe = messageBus.subscribe(MessageCategory.DEBUG, (message) => {
      setMessages(prev => [message, ...prev]);
    });
    
    return unsubscribe;
  }, []);
  
  // Generate a test debug message
  const sendTestDebug = () => {
    messageBus.postMessage({
      category: MessageCategory.DEBUG,
      severity: MessageSeverity.DEBUG,
      title: 'Test Debug Event',
      content: `Debug event at ${new Date().toLocaleTimeString()}`,
      source: 'Debug Console',
      actions: [
        {
          id: 'clear',
          label: 'Clear',
          action: () => messageBus.clearMessages(MessageCategory.DEBUG),
          primary: true
        }
      ]
    });
  };
  
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between px-4 pt-2 pb-1">
        <span className="text-xs text-muted-foreground">Debug Console</span>
        <button
          onClick={sendTestDebug}
          className="text-xs px-2 py-1 rounded bg-primary text-white hover:bg-primary/80"
          aria-label="Send test debug event"
        >
          Test Event
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 text-mono text-xs text-green-200 bg-gray-950">
        {messages.length === 0 ? (
          <div className="text-gray-400">No debug logs yet.</div>
        ) : (
          <div className="space-y-1">
            {messages.map((message) => (
              <div key={message.id} className="flex flex-col">
                <div className="flex items-center">
                  <span className="text-gray-400 mr-2">[{new Date(message.timestamp).toLocaleTimeString()}]</span>
                  <span className="font-semibold mr-2">{message.title}</span>
                  {message.source && (
                    <span className="text-gray-400 text-xs ml-auto">{message.source}</span>
                  )}
                </div>
                <div className="ml-6">{message.content}</div>
                {message.actions && message.actions.length > 0 && (
                  <div className="ml-6 mt-1 flex gap-2">
                    {message.actions.map((action) => (
                      <button
                        key={action.id}
                        onClick={action.action}
                        className={`text-xs px-2 py-0.5 rounded ${
                          action.primary 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugConsoleModule;
