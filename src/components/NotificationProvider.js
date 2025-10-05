import React from 'react';
import { NotificationContext, useNotificationState } from '../hooks/useNotification';
import NotificationContainer from './NotificationContainer';

const NotificationProvider = ({ children }) => {
  const notificationState = useNotificationState();
  
  return (
    <NotificationContext.Provider value={notificationState}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;