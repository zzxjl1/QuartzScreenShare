import { useState, useCallback, createContext, useContext } from 'react';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const useNotificationState = () => {
  const [notifications, setNotifications] = useState([]);
  
  const showNotification = useCallback((type, title, message, duration = 5000) => {
    const id = Date.now() + Math.random();
    const notification = {
      id,
      type,
      title,
      message,
      duration
    };
    
    setNotifications(prev => [...prev, notification]);
    
    // 自动移除通知
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
    
    return id;
  }, []);
  
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);
  
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);
  
  return {
    notifications,
    showNotification,
    removeNotification,
    clearAllNotifications
  };
};

export { NotificationContext };