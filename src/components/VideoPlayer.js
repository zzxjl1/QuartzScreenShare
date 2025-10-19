import React, { useRef, useEffect, useState } from 'react';
import './VideoPlayer.css';

const VideoPlayer = ({ stream, isLocal = false, isSharing = false, userId, title }) => {
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(isLocal);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [stats, setStats] = useState({
    resolution: '-',
    fps: '-',
    bitrate: '-',
    codec: '-',
    rtt: '-',
    jitter: '-',
    packetLoss: '-',
    connectionState: '-',
    p2pConnected: false
  });

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      
      // 手动调用play确保视频开始播放
      const playPromise = videoRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('视频自动播放成功');
          })
          .catch(error => {
            console.log('视频自动播放失败:', error);
            // 如果是远程视频且自动播放失败，尝试取消静音后播放
            if (!isLocal && videoRef.current) {
              videoRef.current.muted = true;
              videoRef.current.play().then(() => {
                console.log('静音播放成功，用户可以手动取消静音');
              }).catch(e => {
                console.error('静音播放也失败:', e);
              });
            }
          });
      }
    }
  }, [stream, isLocal]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;

    if (!isFullscreen) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if (videoRef.current.webkitRequestFullscreen) {
        videoRef.current.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  const handleMouseEnter = () => setShowControls(true);
  const handleMouseLeave = () => setShowControls(false);

  return (
    <div 
      className={`video-player glass-card ${isLocal ? 'local-player' : 'remote-player'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`video-header ${showControls ? 'visible' : ''}`}>
        <div className="video-title">
          <i className={`fas ${isLocal ? 'fa-user' : 'fa-desktop'}`}></i>
          <span>{title}</span>
        </div>
        
        <div className="video-controls">
          {!isLocal && (
            <>
              <button
                className={`control-btn ${showDetails ? 'active' : ''}`}
                onClick={toggleDetails}
                title="连接详情"
              >
                <i className="fas fa-info"></i>
              </button>
              
              <button
                className="control-btn"
                onClick={toggleMute}
                title={isMuted ? '取消静音' : '静音'}
              >
                <i className={`fas ${isMuted ? 'fa-volume-mute' : 'fa-volume-up'}`}></i>
              </button>
            </>
          )}
          
          <button
            className="control-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? '退出全屏' : '全屏'}
          >
            <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
          </button>
        </div>
      </div>

      {!isLocal && showDetails && (
        <div className="connection-details">
          <div className="detail-row">
            <span className="detail-label">
              <i className="fas fa-exchange-alt"></i> P2P 连接
            </span>
            <span className="detail-value" id={`p2p-${userId}`}>
              {stats.p2pConnected ? (
                <span className="status-indicator success">
                  <i className="fas fa-check"></i> 已连接
                </span>
              ) : (
                <span className="status-indicator warning">
                  <i className="fas fa-times"></i> 中继模式
                </span>
              )}
            </span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">
              <i className="fas fa-network-wired"></i> 连接状态
            </span>
            <span className="detail-value" id={`connection-${userId}`}>
              <span className={`status-indicator ${
                stats.connectionState === 'connected' ? 'success' : 
                stats.connectionState === 'failed' ? 'error' : 'warning'
              }`}>
                {stats.connectionState}
              </span>
            </span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">
              <i className="fas fa-clock"></i> 延迟 (RTT)
            </span>
            <span className="detail-value" id={`rtt-${userId}`}>{stats.rtt}</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">
              <i className="fas fa-chart-line"></i> 抖动
            </span>
            <span className="detail-value" id={`jitter-${userId}`}>{stats.jitter}</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">
              <i className="fas fa-exclamation-triangle"></i> 丢包率
            </span>
            <span className="detail-value" id={`packetloss-${userId}`}>{stats.packetLoss}</span>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMuted}
        controls={false}
        className="video-element"
      />

      {isLocal && isSharing && (
        <div className="video-overlay">
          <div className="streaming-indicator">
            <i className="fas fa-circle pulse"></i>
            <span>正在共享</span>
          </div>
        </div>
      )}

      <div className="video-stats">
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">分辨率</span>
            <span className="stat-value" id={`resolution-${userId || 'local'}`}>{stats.resolution}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">帧率</span>
            <span className="stat-value" id={`fps-${userId || 'local'}`}>{stats.fps}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">码率</span>
            <span className="stat-value" id={`bitrate-${userId || 'local'}`}>{stats.bitrate}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">编码器</span>
            <span className="stat-value" id={`codec-${userId || 'local'}`}>{stats.codec}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;