import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import ControlPanel from '../components/ControlPanel';
import VideoSection from '../components/VideoSection';
import { useWebRTC } from '../hooks/useWebRTC';
import { useNotification } from '../hooks/useNotification';
import './RoomPage.css';

const RoomPage = () => {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  
  const [isJoined, setIsJoined] = useState(false);
  const [isCheckingRoom, setIsCheckingRoom] = useState(true);
  const [hasAttemptedJoin, setHasAttemptedJoin] = useState(false);
  
  // 获取操作类型：create(创建新房间) 或 join(加入现有房间) 或 undefined(直接访问URL)
  const action = searchParams.get('action');
  
  const {
    isSharing,
    localStream,
    remoteStreams,
    connectionStatus,
    roomMembers,
    userCount,
    connectToRoom,
    startScreenShare,
    stopScreenShare,
    leaveRoom,
    checkRoomExists,
    updateSettings
  } = useWebRTC();

  useEffect(() => {
    if (roomId && !hasAttemptedJoin) {
      setHasAttemptedJoin(true);
      handleJoinRoom();
    }
    
    return () => {
      // 组件卸载时主动离开房间
      leaveRoom();
    };
  }, [roomId, hasAttemptedJoin]); // 添加 hasAttemptedJoin 依赖

  const handleJoinRoom = useCallback(async () => {
    console.log(`开始处理房间加入: roomId=${roomId}, action=${action}`);
    setIsCheckingRoom(true);
    
    // 验证房间ID格式
    if (!roomId || roomId.length < 4) {
      console.log('房间ID格式无效:', roomId);
      navigate('/room-not-found/' + (roomId || 'invalid'));
      return;
    }

    // 如果是创建新房间，直接加入无需检查
    if (action === 'create') {
      console.log('创建新房间:', roomId);
      try {
        await connectToRoom(roomId);
        setIsJoined(true);
        showNotification('success', '成功', `已创建房间 ${roomId}`);
      } catch (error) {
        console.error('创建房间失败:', error);
        showNotification('error', '错误', '创建房间失败，请重试');
        navigate('/');
      } finally {
        setIsCheckingRoom(false);
      }
      return;
    }

    // 其他情况（直接访问URL或从欢迎页面加入），需要检查房间是否存在
    console.log('检查房间是否存在:', roomId);
    try {
      const roomExists = await checkRoomExists(roomId);
      console.log('房间存在性检查结果:', roomExists);
      
      if (!roomExists) {
        console.log('房间不存在，跳转到错误页面');
        navigate('/room-not-found/' + roomId);
        return;
      }
      
      console.log('房间存在，连接到房间');
      await connectToRoom(roomId);
      setIsJoined(true);
      showNotification('success', '成功', `已加入房间 ${roomId}`);
    } catch (error) {
      console.error('加入房间失败:', error);
      showNotification('error', '错误', '加入房间失败，请重试');
      navigate('/room-not-found/' + roomId);
    } finally {
      setIsCheckingRoom(false);
    }
  }, [roomId, action, connectToRoom, checkRoomExists, navigate, showNotification]);

  const handleStartShare = async () => {
    try {
      const success = await startScreenShare();
      if (success) {
        showNotification('success', '屏幕共享', '屏幕共享已开始');
      }
    } catch (error) {
      console.error('开始屏幕共享失败:', error);
      showNotification('error', '错误', '启动屏幕共享失败');
    }
  };

  const handleStopShare = () => {
    stopScreenShare();
    showNotification('info', '屏幕共享', '屏幕共享已停止');
  };

  const handleLeaveRoom = () => {
    if (isSharing) {
      stopScreenShare();
    }
    leaveRoom();
    navigate('/');
  };

  if (!isJoined || isCheckingRoom || connectionStatus !== 'connected') {
    const statusText = isCheckingRoom ? '验证房间...' : 
                      connectionStatus === 'connecting' ? '连接中...' : 
                      connectionStatus === 'connected' ? '准备加入房间...' : '建立连接...';
    
    return (
      <div className="room-page">
        <div className="connecting-overlay">
          <div className="connecting-content">
            <div className="loading-spinner"></div>
            <h2>{statusText}</h2>
            <p>房间号: {roomId}</p>
            <button 
              className="crystal-btn primary"
              onClick={() => navigate('/')}
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="room-page">
      <Header 
        roomId={roomId}
        userCount={userCount}
        connectionStatus={connectionStatus}
        onLeaveRoom={handleLeaveRoom}
      />
      
      <main className="room-main">
        <ControlPanel
          roomId={roomId}
          isSharing={isSharing}
          onStartShare={handleStartShare}
          onStopShare={handleStopShare}
          roomMembers={roomMembers}
          onSettingsChange={updateSettings}
        />
        
        <VideoSection
          localStream={localStream}
          remoteStreams={remoteStreams}
          isSharing={isSharing}
        />
      </main>
    </div>
  );
};

export default RoomPage;