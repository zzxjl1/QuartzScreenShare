import SocketManager from './SocketManager';
import ScreenShareManager from './ScreenShareManager';
import WebRTCConnectionManager from './WebRTCConnectionManager';

class WebRTCService {
  constructor() {
    this.socketManager = null;
    this.screenShareManager = null;
    this.connectionManager = null;
    this.roomId = null;
    this.isConnected = false;
    
    // 状态
    this.roomMembers = [];
    this.userCount = 0;
    
    // 回调
    this.callbacks = {
      onConnectionStateChange: null,
      onRoomInfo: null,
      onUserJoined: null,
      onUserLeft: null,
      onScreenShareStarted: null,
      onScreenShareStopped: null,
      onRemoteStreamAdded: null,
      onRemoteStreamRemoved: null
    };
  }

  // 连接到房间
  async connectToRoom(roomId) {
    try {
      console.log('连接到房间:', roomId);
      
      // 初始化各个管理器
      this.socketManager = new SocketManager();
      this.screenShareManager = new ScreenShareManager();
      
      // 连接Socket
      await this.socketManager.connect();
      
      // 初始化WebRTC连接管理器
      this.connectionManager = new WebRTCConnectionManager(this.socketManager);
      
      // 设置本地流获取器
      this.connectionManager.setLocalStreamGetter(() => {
        return this.screenShareManager?.getLocalStream();
      });
      
      this.setupEventHandlers();
      this.roomId = roomId;
      this.isConnected = true;
      
      // 加入房间
      this.socketManager.joinRoom(roomId);
      
      this.callbacks.onConnectionStateChange?.('connected');
      
      console.log('成功连接到房间:', roomId);
      
    } catch (error) {
      console.error('连接房间失败:', error);
      this.callbacks.onConnectionStateChange?.('disconnected');
      throw error;
    }
  }

  // 设置事件处理器
  setupEventHandlers() {
    // Socket事件
    this.socketManager.setCallback('onConnect', () => {
      this.callbacks.onConnectionStateChange?.('connected');
    });

    this.socketManager.setCallback('onDisconnect', () => {
      this.callbacks.onConnectionStateChange?.('disconnected');
      this.isConnected = false;
    });

    this.socketManager.setCallback('onRoomInfo', (data) => {
      this.userCount = data.userCount;
      if (data.members) {
        this.roomMembers = data.members;
      }
      this.callbacks.onRoomInfo?.(data);
    });

    this.socketManager.setCallback('onUserJoined', (data) => {
      this.callbacks.onUserJoined?.(data);
    });

    this.socketManager.setCallback('onUserLeft', (data) => {
      this.callbacks.onUserLeft?.(data);
    });

    this.socketManager.setCallback('onScreenShareStarted', (data) => {
      console.log('远程用户开始屏幕共享:', data);
      this.callbacks.onScreenShareStarted?.(data);
      
      // 主动建立连接来接收远程流
      if (data.userId && this.connectionManager) {
        this.connectionManager.requestStreamFrom(data.userId);
      }
    });

    this.socketManager.setCallback('onScreenShareStopped', (data) => {
      this.callbacks.onScreenShareStopped?.(data);
    });

    // WebRTC连接事件
    this.connectionManager.setCallback('onRemoteStreamAdded', (userId, stream) => {
      this.callbacks.onRemoteStreamAdded?.(userId, stream);
    });

    this.connectionManager.setCallback('onRemoteStreamRemoved', (userId) => {
      this.callbacks.onRemoteStreamRemoved?.(userId);
    });
  }

  // 开始屏幕共享
  async startScreenShare() {
    try {
      if (!this.isConnected || !this.roomId) {
        throw new Error('未连接到房间');
      }

      console.log('开始屏幕共享...');
      
      const localStream = await this.screenShareManager.startScreenShare();
      
      // 通知服务器开始共享
      this.socketManager.startScreenShare(this.roomId);
      
      // 向房间内其他用户发送流
      this.roomMembers.forEach(member => {
        if (member.id !== this.socketManager.socket?.id) {
          this.connectionManager.startSharingTo(member.id, localStream);
        }
      });
      
      // 开始统计信息收集
      this.startStatsCollection();
      
      console.log('屏幕共享开始成功');
      return localStream;
      
    } catch (error) {
      console.error('开始屏幕共享失败:', error);
      throw error;
    }
  }

  // 停止屏幕共享
  stopScreenShare() {
    try {
      console.log('停止屏幕共享...');
      
      this.screenShareManager.stopScreenShare();
      
      if (this.roomId) {
        this.socketManager.stopScreenShare(this.roomId);
      }
      
      // 清理WebRTC连接
      this.connectionManager.cleanup();
      
      // 停止统计信息收集
      this.stopStatsCollection();
      
      console.log('屏幕共享已停止');
      
    } catch (error) {
      console.error('停止屏幕共享失败:', error);
      throw error;
    }
  }

  // 离开房间并断开连接
  leaveRoom() {
    console.log('离开房间...');
    
    try {
      // 停止屏幕共享
      if (this.screenShareManager?.getIsSharing()) {
        this.stopScreenShare();
      }
      
      // 清理WebRTC连接
      this.connectionManager?.cleanup();
      
      // 断开Socket连接
      this.socketManager?.disconnect();
      
      // 重置状态
      this.roomId = null;
      this.isConnected = false;
      this.roomMembers = [];
      this.userCount = 0;
      
      this.callbacks.onConnectionStateChange?.('disconnected');
      
      console.log('已离开房间');
      
    } catch (error) {
      console.error('离开房间失败:', error);
    }
  }

  // 检查房间是否存在
  async checkRoomExists(roomId) {
    try {
      // 创建临时连接来检查房间
      const tempSocket = new SocketManager();
      await tempSocket.connect();
      
      const exists = await tempSocket.checkRoomExists(roomId);
      
      // 立即断开临时连接
      tempSocket.disconnect();
      
      return exists;
      
    } catch (error) {
      console.error('检查房间失败:', error);
      return false;
    }
  }

  // 更新设置
  async updateSettings(settings) {
    try {
      // 更新屏幕共享设置
      if (this.screenShareManager) {
        await this.screenShareManager.updateSettings(settings);
      }
      
      // 如果包含码率设置，更新所有对等连接的码率
      if (settings.bitrate && this.connectionManager) {
        await this.updateBitrateForAllConnections(settings.bitrate);
      }
      
      console.log('所有设置已更新:', settings);
      
    } catch (error) {
      console.error('更新设置失败:', error);
      throw error;
    }
  }

  // 更新所有连接的码率
  async updateBitrateForAllConnections(bitrate) {
    if (!this.connectionManager) return;
    
    const connections = this.connectionManager.getPeerConnections();
    
    for (const [userId, pc] of connections) {
      try {
        const senders = pc.getSenders();
        const videoSender = senders.find(sender => 
          sender.track && sender.track.kind === 'video'
        );
        
        if (videoSender) {
          const parameters = videoSender.getParameters();
          if (!parameters.encodings) {
            parameters.encodings = [{}];
          }
          
          parameters.encodings[0].maxBitrate = bitrate * 1000 * 1000; // 转换为 bps
          
          await videoSender.setParameters(parameters);
          console.log(`已为用户 ${userId} 更新码率: ${bitrate} Mbps`);
        }
      } catch (error) {
        console.error(`更新用户 ${userId} 码率失败:`, error);
      }
    }
  }

  // 开始统计信息收集
  startStatsCollection() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }
    
    this.statsInterval = setInterval(() => {
      this.collectStats();
    }, 1000);
  }

  // 停止统计信息收集
  stopStatsCollection() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  // 收集统计信息
  async collectStats() {
    if (!this.connectionManager) return;
    
    // 收集本地流统计信息
    await this.collectLocalStats();
    
    // 收集远程流统计信息
    const connections = this.connectionManager.getPeerConnections();
    
    for (const [userId, pc] of connections) {
      try {
        const stats = await pc.getStats();
        const statsData = this.processStats(stats, pc.connectionState);
        
        // 调用回调更新UI
        if (this.callbacks.onStatsUpdate) {
          this.callbacks.onStatsUpdate(userId, statsData);
        }
        
      } catch (error) {
        console.error(`收集用户 ${userId} 统计信息失败:`, error);
      }
    }
  }

  // 收集本地流统计信息
  async collectLocalStats() {
    const localStream = this.screenShareManager?.getLocalStream();
    if (!localStream) return;

    const videoTrack = localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    const settings = videoTrack.getSettings();
    const currentSettings = this.screenShareManager?.getSettings();
    
    // 更新本地统计显示
    const localStats = {
      resolution: settings.width && settings.height ? `${settings.width}x${settings.height}` : '-',
      fps: settings.frameRate ? `${Math.round(settings.frameRate)} fps (目标: ${currentSettings?.fps || 'N/A'})` : '-',
      bitrate: currentSettings?.bitrate ? `${currentSettings.bitrate} Mbps` : '-',
      codec: currentSettings?.codec || 'auto'
    };

    // 调用回调更新本地UI
    if (this.callbacks.onStatsUpdate) {
      this.callbacks.onStatsUpdate('local', localStats);
    }
  }

  // 处理统计数据
  processStats(stats, connectionState) {
    let statsData = {
      resolution: '-',
      fps: '-',
      bitrate: '-',
      codec: '-',
      packetLoss: 0,
      jitter: 0,
      rtt: 0,
      connectionState: connectionState,
      p2pConnected: false
    };

    stats.forEach(report => {
      // 视频接收统计
      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        if (report.frameWidth && report.frameHeight) {
          statsData.resolution = `${report.frameWidth}x${report.frameHeight}`;
        }
        if (report.framesPerSecond) {
          statsData.fps = `${Math.round(report.framesPerSecond)} fps`;
        }
        if (report.bytesReceived !== undefined) {
          // 计算码率需要前一次的数据
          const key = `${report.ssrc}_lastBytesReceived`;
          const timeKey = `${report.ssrc}_lastTime`;
          if (this[key] && this[timeKey]) {
            const timeDiff = (Date.now() - this[timeKey]) / 1000;
            const bytesDiff = report.bytesReceived - this[key];
            const bitrate = (bytesDiff * 8) / timeDiff / 1000000;
            statsData.bitrate = `${bitrate.toFixed(2)} Mbps`;
          }
          this[key] = report.bytesReceived;
          this[timeKey] = Date.now();
        }
        if (report.packetsLost && report.packetsReceived) {
          statsData.packetLoss = ((report.packetsLost / (report.packetsLost + report.packetsReceived)) * 100).toFixed(2);
        }
        if (report.jitter) {
          statsData.jitter = (report.jitter * 1000).toFixed(2);
        }
      }

      // 编码器信息
      if (report.type === 'codec' && report.mimeType && report.mimeType.includes('video')) {
        statsData.codec = report.mimeType.split('/')[1];
      }

      // RTT (往返时间)
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        if (report.currentRoundTripTime) {
          statsData.rtt = (report.currentRoundTripTime * 1000).toFixed(0);
        }
        // 检查是否为 P2P 连接
        if (report.localCandidateId && report.remoteCandidateId) {
          stats.forEach(candidate => {
            if (candidate.id === report.localCandidateId && candidate.candidateType !== 'relay') {
              statsData.p2pConnected = true;
            }
          });
        }
      }
    });

    return statsData;
  }

  // 设置回调
  setCallback(event, callback) {
    this.callbacks[event] = callback;
  }

  // 获取状态
  getConnectionStatus() {
    return this.isConnected ? 'connected' : 'disconnected';
  }

  getLocalStream() {
    return this.screenShareManager?.getLocalStream();
  }

  getIsSharing() {
    return this.screenShareManager?.getIsSharing() || false;
  }

  getRemoteStreams() {
    return this.connectionManager?.getRemoteStreams() || new Map();
  }

  getRoomMembers() {
    return this.roomMembers;
  }

  getUserCount() {
    return this.userCount;
  }

  getRoomId() {
    return this.roomId;
  }
}

export default WebRTCService;