import React, { useEffect, useState } from 'react';
import { 
  ModuleType, 
  ModulePosition, 
  ModuleSize, 
  useRegisterModule 
} from '../context/ModuleRegistry';
import NotificationLog from '../components/ui/NotificationLog';
import { Bell } from 'lucide-react';
import { useMessageBus, MessageCategory, MessageSeverity, Message } from '../state/messageBus';
import { useToast } from '../hooks/use-toast';

interface NotificationLogModuleProps {
  // Module-specific props
}

const NotificationLogModule: React.FC<NotificationLogModuleProps> = (props) => {
  // Register this component as a module
  useRegisterModule({
    id: 'notification-log',
    type: ModuleType.NOTIFICATION,
    title: 'Notifications',
    description: 'View system notifications and alerts',
    component: NotificationLogInner,
    position: ModulePosition.OVERLAY,
    size: ModuleSize.MEDIUM,
    initialProps: props,
    icon: <Bell size={18} />,
  });
  
  // This component doesn't render anything itself
  return null;
};

// Inner component that will be rendered within the module container
const NotificationLogInner: React.FC<NotificationLogModuleProps> = (props) => {
  const messageBus = useMessageBus();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Subscribe to messages for notifications
  useEffect(() => {
    // Get initial messages
    setMessages(messageBus.getMessages());
    
    // Subscribe to new messages
    const unsubscribe = messageBus.subscribe('all', (message) => {
      // Update local state
      setMessages(prev => [message, ...prev]);
      
      // Show toast for new messages (except debug messages)
      if (message.severity !== MessageSeverity.DEBUG) {
        toast({
          title: message.title,
          description: message.content,
          variant: message.severity === MessageSeverity.ERROR 
            ? 'destructive' 
            : message.severity === MessageSeverity.SUCCESS 
              ? 'success' 
              : message.severity === MessageSeverity.WARNING 
                ? 'warning' 
                : 'default'
        });
      }
    });
    
    return unsubscribe;
  }, []);
  
  // Convert messages to notification format
  const notifications = messages.map(message => ({
    id: message.id,
    message: `${message.title}: ${message.content}`,
    status: message.severity === MessageSeverity.ERROR 
      ? 'error' 
      : message.severity === MessageSeverity.SUCCESS 
        ? 'success' 
        : message.severity === MessageSeverity.WARNING 
          ? 'warning' 
          : 'info',
    onAction: message.actions && message.actions.length > 0 
      ? message.actions[0].action 
      : undefined,
    actionLabel: message.actions && message.actions.length > 0 
      ? message.actions[0].label 
      : undefined,
  }));
  
  return <NotificationLog notifications={notifications} />;
};

export default NotificationLogModule;
