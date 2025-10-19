import { useState, useCallback } from 'react';
import WebRTCService from '../services/WebRTCService';
import { useNotification } from './useNotification';

export const useWebRTC = () => {
  const { showNotification } = useNotification();
  const [webrtcService, setWebrtcService] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [roomMembers, setRoomMembers] = useState([]);
  const [userCount, setUserCount] = useState(0);

  // 连接到房间
  const connectToRoom = useCallback(async (roomId) => {
    try {
      console.log('useWebRTC: 连接到房间', roomId);
      
      const service = new WebRTCService();
      
      // 辅助函数：根据userId获取用户名
      const getUserName = (userId) => {
        return `用户${userId.slice(-4)}`;
      };
      
      // 设置事件回调
      service.setCallback('onConnectionStateChange', (status) => {
        console.log('连接状态变化:', status);
        setConnectionStatus(status);
      });

      service.setCallback('onRoomInfo', (data) => {
        console.log('房间信息更新:', data);
        console.log('当前成员列表:', data.members);
        setUserCount(data.userCount);
        if (data.members) {
          setRoomMembers(data.members);
        }
      });

      service.setCallback('onUserJoined', (data) => {
        console.log('用户加入:', data);
        const userName = getUserName(data.userId);
        showNotification('info', '用户加入', `${userName} 加入了房间`);
      });




      service.setCallback('onUserLeft', (data) => {
        console.log('用户离开:', data);
        const userName = getUserName(data.userId);
        showNotification('warning', '用户离开', `${userName} 离开了房间`);
        // 只处理远程流的清理，房间成员列表由 room-info 事件统一更新
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.userId);
          return newMap;
        });
      });



      service.setCallback('onScreenShareStarted', (data) => {
        console.log('远程屏幕共享开始:', data);
        const userName = getUserName(data.userId);
        showNotification('success', '屏幕共享', `${userName} 开始了屏幕共享`);
        // 这里不需要立即添加流，流会通过onRemoteStreamAdded回调添加
        // 但我们可以显示连接状态或通知
      });



      service.setCallback('onScreenShareStopped', (data) => {
        console.log('远程屏幕共享停止:', data);
        const userName = getUserName(data.userId);
        showNotification('info', '屏幕共享', `${userName} 停止了屏幕共享`);
        // 移除对应用户的远程流
        if (data.userId) {
          setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.delete(data.userId);
            return newMap;
          });
        }
      });



      service.setCallback('onRemoteStreamAdded', (userId, stream) => {
        console.log('添加远程流:', userId);
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.set(userId, stream);
          return newMap;
        });
      });

      service.setCallback('onRemoteStreamRemoved', (userId) => {
        console.log('移除远程流:', userId);
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.delete(userId);
          return newMap;
        });
      });

      service.setCallback('onStatsUpdate', (userId, statsData) => {
        // 这里可以更新VideoPlayer组件的统计信息
        // 通过DOM操作或者state管理来更新UI
        updateVideoPlayerStats(userId, statsData);
      });

      // 连接到房间
      await service.connectToRoom(roomId);
      service.startStatsCollection(); // 开始收集统计信息
      setWebrtcService(service);
      
      return service;
      
    } catch (error) {
      console.error('连接房间失败:', error);
      setConnectionStatus('disconnected');
      throw error;
    }
  }, []);

  // 开始屏幕共享
  const startScreenShare = useCallback(async () => {
    if (!webrtcService) {
      throw new Error('未连接到房间');
    }

    try {
      const stream = await webrtcService.startScreenShare();
      setLocalStream(stream);
      setIsSharing(true);
      return stream;
    } catch (error) {
      console.error('开始屏幕共享失败:', error);
      throw error;
    }
  }, [webrtcService]);

  // 停止屏幕共享
  const stopScreenShare = useCallback(() => {
    if (!webrtcService) return;

    try {
      webrtcService.stopScreenShare();
      setLocalStream(null);
      setIsSharing(false);
    } catch (error) {
      console.error('停止屏幕共享失败:', error);
      throw error;
    }
  }, [webrtcService]);

  // 离开房间
  const leaveRoom = useCallback(() => {
    if (!webrtcService) return;

    try {
      console.log('useWebRTC: 离开房间');
      webrtcService.leaveRoom();
      
      // 重置所有状态
      setWebrtcService(null);
      setIsSharing(false);
      setLocalStream(null);
      setRemoteStreams(new Map());
      setConnectionStatus('disconnected');
      setRoomMembers([]);
      setUserCount(0);
      
    } catch (error) {
      console.error('离开房间失败:', error);
    }
  }, [webrtcService]);

  // 检查房间是否存在 - 使用简单的 HTTP 请求而不是 WebSocket
  const checkRoomExists = useCallback(async (roomId) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/exists`);
      const data = await response.json();
      return data.exists;
    } catch (error) {
      console.error('检查房间失败:', error);
      return false;
    }
  }, []);

  // 更新VideoPlayer的统计信息
  const updateVideoPlayerStats = useCallback((userId, statsData) => {
    // 更新VideoPlayer组件中的统计显示
    // 这里使用DOM操作来更新对应用户的统计信息
    const updateElement = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    updateElement(`resolution-${userId}`, statsData.resolution);
    updateElement(`fps-${userId}`, statsData.fps);
    updateElement(`bitrate-${userId}`, statsData.bitrate);
    updateElement(`codec-${userId}`, statsData.codec);
    updateElement(`rtt-${userId}`, statsData.rtt !== '0' ? `${statsData.rtt} ms` : '-');
    updateElement(`jitter-${userId}`, statsData.jitter !== '0' ? `${statsData.jitter} ms` : '-');
    updateElement(`packetloss-${userId}`, statsData.packetLoss !== '0' ? `${statsData.packetLoss}%` : '-');

    // 更新连接状态
    const connEl = document.getElementById(`connection-${userId}`);
    if (connEl) {
      let statusClass = 'warning';
      if (statsData.connectionState === 'connected') statusClass = 'success';
      else if (statsData.connectionState === 'failed' || statsData.connectionState === 'disconnected') statusClass = 'error';
      connEl.innerHTML = `<span class="status-indicator ${statusClass}">${statsData.connectionState}</span>`;
    }

    // 更新P2P状态
    const p2pEl = document.getElementById(`p2p-${userId}`);
    if (p2pEl) {
      if (statsData.p2pConnected) {
        p2pEl.innerHTML = '<span class="status-indicator success"><i class="fas fa-check"></i> 已连接</span>';
      } else {
        p2pEl.innerHTML = '<span class="status-indicator warning"><i class="fas fa-times"></i> 中继模式</span>';
      }
    }
  }, []);

  // 更新设置
  const updateSettings = useCallback((settings) => {
    webrtcService?.updateSettings(settings);
  }, [webrtcService]);

  return {
    // 状态
    isSharing,
    localStream,
    remoteStreams,
    connectionStatus,
    roomMembers,
    userCount,
    
    // 方法
    connectToRoom,
    startScreenShare,
    stopScreenShare,
    leaveRoom,
    checkRoomExists,
    updateSettings,
    
    // 服务实例（用于调试）
    webrtcService
  };
};

export default useWebRTC;