import React, { useState } from 'react';
import SettingsPanel from './SettingsPanel';
import './ControlPanel.css';

const ControlPanel = ({ roomId, isSharing, onStartShare, onStopShare, roomMembers = [], onSettingsChange }) => {
  const [settings, setSettings] = useState({
    quality: 'high',
    fps: 60,
    codec: 'auto',
    bitrate: 8,
    audioEnabled: true,
    echoCancellation: true,
    noiseSuppression: true,
    hardwareAccel: true,
    adaptiveBitrate: true
  });

  const handleSettingsChange = (newSettings) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    // 如果正在推流，立即应用设置
    if (isSharing && onSettingsChange) {
      onSettingsChange(newSettings);
    }
  };

  return (
    <div className="control-panel glass-card">
      <div className="panel-header">
        <h2>
          <i className="fas fa-cog"></i>
          控制中心
        </h2>
        <p>管理您的屏幕共享设置</p>
      </div>

      <div className="panel-content">
        <div className="share-controls">
          <h3>
            <i className="fas fa-desktop"></i>
            屏幕共享控制
          </h3>
          
          <div className="control-buttons">
            {!isSharing ? (
              <button
                className="crystal-btn success large"
                onClick={onStartShare}
              >
                <i className="fas fa-play"></i>
                开始共享屏幕
              </button>
            ) : (
              <button
                className="crystal-btn danger large"
                onClick={onStopShare}
              >
                <i className="fas fa-stop"></i>
                停止共享
              </button>
            )}
          </div>

          {isSharing && (
            <div className="sharing-status">
              <div className="status-indicator">
                <i className="fas fa-broadcast-tower pulse"></i>
                <span>正在共享屏幕</span>
              </div>
              <p className="status-text">
                其他用户现在可以看到您的屏幕内容
              </p>
            </div>
          )}
        </div>

        {isSharing && (
          <SettingsPanel 
            settings={settings}
            onChange={handleSettingsChange}
            disabled={false}
          />
        )}

        <div className="room-members">
          <h3>
            <i className="fas fa-users"></i>
            房间成员 ({roomMembers.length})
          </h3>
          <div className="members-list">
            {roomMembers.length === 0 ? (
              <div className="empty-members">
                <i className="fas fa-user-slash"></i>
                <span>暂无其他成员</span>
              </div>
            ) : (
              roomMembers.map((member, index) => (
                <div key={member.id || index} className="member-item">
                  <div className="member-avatar">
                    <i className="fas fa-user"></i>
                  </div>
                  <div className="member-info">
                    <span className="member-name">
                      {member.name || `用户 ${member.id?.substring(0, 6) || index + 1}`}
                    </span>
                    <span className="member-status">
                      {member.isSharing ? (
                        <span className="status-sharing">
                          <i className="fas fa-desktop"></i>
                          正在共享
                        </span>
                      ) : (
                        <span className="status-watching">
                          <i className="fas fa-eye"></i>
                          观看中
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="member-connection">
                    <i className={`fas fa-circle ${member.connected ? 'connected' : 'disconnected'}`}></i>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;