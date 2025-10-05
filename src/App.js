import React from 'react';
import { Routes, Route } from 'react-router-dom';
import WelcomePage from './pages/WelcomePage';
import RoomPage from './pages/RoomPage';
import RoomNotFoundPage from './pages/RoomNotFoundPage';
import NotificationProvider from './components/NotificationProvider';

function App() {
  return (
    <NotificationProvider>
      <div className="app">
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/room/:roomId" element={<RoomPage />} />
          <Route path="/room" element={<RoomPage />} />
          <Route path="/room-not-found/:roomId" element={<RoomNotFoundPage />} />
        </Routes>
      </div>
    </NotificationProvider>
  );
}

export default App;