import React from 'react';
import VideoPlayer from './VideoPlayer';
import EmptyState from './EmptyState';
import './VideoSection.css';

const VideoSection = ({ localStream, remoteStreams, isSharing }) => {
  const hasAnyStream = localStream || remoteStreams.size > 0;

  return (
    <div className="video-section">
      {!hasAnyStream && <EmptyState />}
      
      {localStream && (
        <div className="local-video-area">
          <VideoPlayer
            stream={localStream}
            isLocal={true}
            isSharing={isSharing}
            title="我的屏幕共享"
          />
        </div>
      )}
      
      {remoteStreams.size > 0 && (
        <div className="remote-video-area">
          <h3 className="section-title">
            <i className="fas fa-users"></i>
            远程屏幕 ({remoteStreams.size})
          </h3>
          <div className="remote-videos-grid">
            {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
              <VideoPlayer
                key={userId}
                stream={stream}
                isLocal={false}
                userId={userId}
                title={`用户 ${userId.substring(0, 8)}...`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoSection;