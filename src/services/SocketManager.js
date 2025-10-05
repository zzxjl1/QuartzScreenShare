import { io } from 'socket.io-client';

class SocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.callbacks = {
      onConnect: null,
      onDisconnect: null,
      onRoomInfo: null,
      onUserJoined: null,
      onUserLeft: null,
      onScreenShareStarted: null,
      onScreenShareStopped: null,
      onRemoteStream: null
    };
  }

  // 连接到服务器
  connect() {
    if (this.socket && this.isConnected) {
      console.log('Socket already connected');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        this.socket = io();
        this.setupEventListeners();
        
        this.socket.on('connect', () => {
          console.log('Socket连接成功');
          this.isConnected = true;
          this.callbacks.onConnect?.();
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket连接失败:', error);
          this.isConnected = false;
          reject(error);
        });
      } catch (error) {
        console.error('Socket初始化失败:', error);
        reject(error);
      }
    });
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      console.log('主动断开Socket连接');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // 设置事件监听器
  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('disconnect', () => {
      console.log('Socket连接断开');
      this.isConnected = false;
      this.callbacks.onDisconnect?.();
    });

    // 房间事件
    this.socket.on('room-info', (data) => {
      console.log('收到房间信息:', data);
      this.callbacks.onRoomInfo?.(data);
    });

    this.socket.on('user-joined', (data) => {
      console.log('用户加入:', data);
      this.callbacks.onUserJoined?.(data);
    });

    this.socket.on('user-left', (data) => {
      console.log('用户离开:', data);
      this.callbacks.onUserLeft?.(data);
    });

    // 屏幕共享事件
    this.socket.on('screen-share-started', (data) => {
      console.log('远程屏幕共享开始:', data);
      this.callbacks.onScreenShareStarted?.(data);
    });

    this.socket.on('screen-share-stopped', (data) => {
      console.log('远程屏幕共享停止:', data);
      this.callbacks.onScreenShareStopped?.(data);
    });

    // WebRTC信令事件
    this.socket.on('offer', (data) => {
      this.callbacks.onRemoteStream?.('offer', data);
    });

    this.socket.on('answer', (data) => {
      this.callbacks.onRemoteStream?.('answer', data);
    });

    this.socket.on('ice-candidate', (data) => {
      this.callbacks.onRemoteStream?.('ice-candidate', data);
    });
  }

  // 设置回调
  setCallback(event, callback) {
    this.callbacks[event] = callback;
  }

  // 发送事件
  emit(event, data, callback) {
    if (this.socket && this.isConnected) {
      if (callback) {
        this.socket.emit(event, data, callback);
      } else {
        this.socket.emit(event, data);
      }
    } else {
      console.error('Socket未连接，无法发送事件:', event);
    }
  }

  // 检查房间是否存在
  checkRoomExists(roomId) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('Socket未连接'));
        return;
      }

      this.socket.emit('check-room', roomId, (response) => {
        resolve(response.exists);
      });
    });
  }

  // 加入房间
  joinRoom(roomId) {
    this.emit('join-room', roomId);
  }

  // 开始屏幕共享
  startScreenShare(roomId) {
    this.emit('start-screen-share', roomId);
  }

  // 停止屏幕共享
  stopScreenShare(roomId) {
    this.emit('stop-screen-share', roomId);
  }

  // 获取连接状态
  getConnectionStatus() {
    return this.isConnected ? 'connected' : 'disconnected';
  }
}

export default SocketManager;