import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './RoomNotFoundPage.css';

const RoomNotFoundPage = () => {
  const [countdown, setCountdown] = useState(3);
  const navigate = useNavigate();
  const { roomId } = useParams();

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="room-not-found-page">
      <div className="not-found-container glass-card">
        <div className="error-icon">
          <i className="fas fa-exclamation-triangle"></i>
        </div>
        
        <h1 className="error-title">房间不存在</h1>
        
        <div className="error-message">
          <p>抱歉，房间 <span className="room-id-highlight">"{roomId}"</span> 不存在或已被删除。</p>
          <p>请检查房间号是否正确，或创建一个新的房间。</p>
        </div>

        <div className="countdown-section">
          <div className="countdown-circle">
            <span className="countdown-number">{countdown}</span>
          </div>
          <p>将在 {countdown} 秒后自动返回主页</p>
        </div>

        <div className="action-buttons">
          <button 
            className="crystal-btn primary large"
            onClick={handleGoHome}
          >
            <i className="fas fa-home"></i>
            立即返回主页
          </button>
        </div>

        <div className="suggestions">
          <h3>您可以：</h3>
          <ul>
            <li><i className="fas fa-plus-circle"></i> 创建一个新的房间</li>
            <li><i className="fas fa-search"></i> 检查房间号是否正确</li>
            <li><i className="fas fa-refresh"></i> 刷新页面重试</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RoomNotFoundPage;