import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateRoomId } from '../utils/helpers';
import './WelcomePage.css';

const WelcomePage = () => {
  const [roomId, setRoomId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoinRoom = () => {
    if (!roomId.trim()) {
      alert('请输入房间号');
      return;
    }
    
    setIsLoading(true);
    setTimeout(() => {
      navigate(`/room/${roomId.trim()}`);
    }, 500);
  };

  const handleCreateRoom = () => {
    const newRoomId = generateRoomId();
    setIsLoading(true);
    setTimeout(() => {
      navigate(`/room/${newRoomId}?action=create`);
    }, 500);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleJoinRoom();
    }
  };

  return (
    <div className="welcome-page">
      <div className="welcome-background">
        <div className="crystal-orbs">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
        </div>
      </div>
      
      <div className="welcome-container">
        <div className="welcome-header fade-in">
          <i className="fas fa-tv crystal-icon-huge"></i>
          <h1 className="welcome-title">
            欢迎使用
            <span className="brand-name">晶莹投屏</span>
          </h1>
          <p className="welcome-subtitle">
            现代化屏幕共享应用，基于WebRTC技术，支持高清画质和低延迟传输
          </p>
        </div>

        <div className="welcome-card glass-card slide-in-up">
          <div className="card-header">
            <h2>
              <i className="fas fa-door-open"></i>
              加入或创建房间
            </h2>
            <p>输入房间号加入现有房间，或创建一个新的房间</p>
          </div>

          <div className="card-content">
            <div className="input-section">
              <div className="input-group">
                <i className="fas fa-hashtag input-icon"></i>
                <input
                  type="text"
                  className="crystal-input"
                  placeholder="输入房间号 (例如: ROOM-123456)"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="action-buttons">
              <button
                className="crystal-btn primary large"
                onClick={handleJoinRoom}
                disabled={isLoading || !roomId.trim()}
              >
                <i className="fas fa-sign-in-alt"></i>
                {isLoading ? '连接中...' : '加入房间'}
              </button>

              <div className="divider">
                <span>或</span>
              </div>

              <button
                className="crystal-btn success large"
                onClick={handleCreateRoom}
                disabled={isLoading}
              >
                <i className="fas fa-plus"></i>
                {isLoading ? '创建中...' : '创建新房间'}
              </button>
            </div>
          </div>

          <div className="card-footer">
            <div className="features">
              <div className="feature">
                <i className="fas fa-shield-alt"></i>
                <span>安全可靠</span>
              </div>
              <div className="feature">
                <i className="fas fa-bolt"></i>
                <span>低延迟</span>
              </div>
              <div className="feature">
                <i className="fas fa-hd-video"></i>
                <span>高清画质</span>
              </div>
            </div>
          </div>
        </div>

        <div className="welcome-info fade-in">
          <div className="info-cards">
            <div className="info-card glass-card">
              <div className="info-icon">
                <i className="fas fa-desktop"></i>
              </div>
              <h3>屏幕共享</h3>
              <p>支持全屏或窗口共享，多种画质选择</p>
            </div>

            <div className="info-card glass-card">
              <div className="info-icon">
                <i className="fas fa-users"></i>
              </div>
              <h3>多人协作</h3>
              <p>支持多人同时观看，实时音视频同步</p>
            </div>

            <div className="info-card glass-card">
              <div className="info-icon">
                <i className="fas fa-mobile-alt"></i>
              </div>
              <h3>跨平台</h3>
              <p>支持桌面和移动设备，无需安装插件</p>
            </div>
          </div>
        </div>

        <div className="welcome-footer">
          <p>© 2024 晶莹投屏 - 基于现代Web技术构建</p>
        </div>
      </div>

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>正在连接...</p>
        </div>
      )}
    </div>
  );
};

export default WelcomePage;