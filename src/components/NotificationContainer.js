import React from 'react';
import { useNotification } from '../hooks/useNotification';
import './NotificationContainer.css';

const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotification();
  
  if (notifications.length === 0) return null;
  
  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type}`}
          onClick={() => removeNotification(notification.id)}
        >
          <div className="notification-icon">
            {notification.type === 'success' && <i className="fas fa-check-circle" />}
            {notification.type === 'error' && <i className="fas fa-exclamation-circle" />}
            {notification.type === 'info' && <i className="fas fa-info-circle" />}
            {notification.type === 'warning' && <i className="fas fa-exclamation-triangle" />}
          </div>
          
          <div className="notification-content">
            <div className="notification-title">{notification.title}</div>
            {notification.message && (
              <div className="notification-message">{notification.message}</div>
            )}
          </div>
          
          <button
            className="notification-close"
            onClick={(e) => {
              e.stopPropagation();
              removeNotification(notification.id);
            }}
          >
            <i className="fas fa-times" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationContainer;