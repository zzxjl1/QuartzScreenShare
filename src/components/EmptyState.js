import React from 'react';
import './EmptyState.css';

const EmptyState = () => {
  return (
    <div className="empty-state glass-card">
      <div className="empty-content">
        <div className="empty-icon">
          <i className="fas fa-tv crystal-icon-large"></i>
        </div>
        
        <h3>准备开始屏幕共享</h3>
        
        <p>
          点击左侧的"开始共享屏幕"按钮来共享您的屏幕，
          或等待其他用户开始共享。
        </p>
        
        <div className="feature-highlights">
          <div className="feature-item">
            <div className="feature-icon">
              <i className="fas fa-hd-video"></i>
            </div>
            <div className="feature-text">
              <strong>高清画质</strong>
              <span>支持最高4K分辨率</span>
            </div>
          </div>
          
          <div className="feature-item">
            <div className="feature-icon">
              <i className="fas fa-bolt"></i>
            </div>
            <div className="feature-text">
              <strong>低延迟</strong>
              <span>WebRTC直连技术</span>
            </div>
          </div>
          
          <div className="feature-item">
            <div className="feature-icon">
              <i className="fas fa-shield-alt"></i>
            </div>
            <div className="feature-text">
              <strong>安全可靠</strong>
              <span>端到端加密传输</span>
            </div>
          </div>
        </div>
        
        <div className="quick-tips">
          <h4>
            <i className="fas fa-lightbulb"></i>
            使用提示
          </h4>
          <ul>
            <li>确保您的浏览器支持屏幕共享功能</li>
            <li>选择合适的画质以获得最佳体验</li>
            <li>在共享过程中可以实时调整设置</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;