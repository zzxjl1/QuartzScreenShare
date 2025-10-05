import React from 'react';
import { useNavigate } from 'react-router-dom';
import { copyToClipboard } from '../utils/helpers';
import { useNotification } from '../hooks/useNotification';
import './Header.css';

const Header = ({ roomId, userCount, connectionStatus, onLeaveRoom }) => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  
  const handleCopyRoomId = async () => {
    const success = await copyToClipboard(roomId);
    if (success) {
      showNotification('success', '复制成功', `房间号 ${roomId} 已复制到剪贴板`);
    } else {
      showNotification('error', '复制失败', '请手动复制房间号');
    }
  };
  
  const handleLeaveRoom = () => {
    if (window.confirm('确定要离开房间吗？')) {
      onLeaveRoom();
    }
  };
  
  return (
    <header className="room-header glass-card">
      <div className="header-content">
        <div className="header-left">
          <div className="logo" onClick={() => navigate('/')}>
            <i className="fas fa-tv crystal-icon"></i>
            <span className="logo-text">晶莹投屏</span>
          </div>
          
          <div className="room-info">
            <div className="room-id-section">
              <span className="room-label">房间:</span>
              <div className="room-id-group">
                <span className="room-id">{roomId}</span>
                <button 
                  className="copy-btn"
                  onClick={handleCopyRoomId}
                  title="复制房间号"
                >
                  <i className="fas fa-copy"></i>
                </button>
              </div>
            </div>
            
            <div className="user-count">
              <i className="fas fa-users"></i>
              <span>{userCount} 人在线</span>
            </div>
          </div>
        </div>
        
        <div className="header-right">
          <div className={`connection-status connection-status-${connectionStatus}`}>
            <i className="fas fa-circle"></i>
            <span>
              {connectionStatus === 'connected' ? '已连接' : 
               connectionStatus === 'connecting' ? '连接中' : '未连接'}
            </span>
          </div>
          
          <button 
            className="crystal-btn danger"
            onClick={handleLeaveRoom}
          >
            <i className="fas fa-sign-out-alt"></i>
            离开房间
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;