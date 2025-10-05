class WebRTCConnectionManager {
  constructor(socketManager) {
    this.socketManager = socketManager;
    this.peerConnections = new Map();
    this.remoteStreams = new Map();
    this.getLocalStream = null; // 本地流获取函数
    
    this.rtcConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
    };

    this.callbacks = {
      onRemoteStreamAdded: null,
      onRemoteStreamRemoved: null
    };

    this.setupSignalingHandlers();
  }

  // 设置获取本地流的方法
  setLocalStreamGetter(getter) {
    this.getLocalStream = getter;
  }

  // 设置信令处理
  setupSignalingHandlers() {
    this.socketManager.setCallback('onRemoteStream', (type, data) => {
      switch (type) {
        case 'offer':
          this.handleOffer(data);
          break;
        case 'answer':
          this.handleAnswer(data);
          break;
        case 'ice-candidate':
          this.handleIceCandidate(data);
          break;
      }
    });
  }

  // 创建对等连接
  createPeerConnection(userId) {
    const peerConnection = new RTCPeerConnection(this.rtcConfiguration);

    // 处理ICE候选
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socketManager.emit('ice-candidate', {
          candidate: event.candidate,
          target: userId
        });
      }
    };

    // 处理远程流
    peerConnection.ontrack = (event) => {
      console.log('收到远程流:', userId);
      const [remoteStream] = event.streams;
      this.remoteStreams.set(userId, remoteStream);
      this.callbacks.onRemoteStreamAdded?.(userId, remoteStream);
    };

    // 处理连接状态变化
    peerConnection.onconnectionstatechange = () => {
      console.log(`与${userId}的连接状态:`, peerConnection.connectionState);
      if (peerConnection.connectionState === 'disconnected' || 
          peerConnection.connectionState === 'failed' ||
          peerConnection.connectionState === 'closed') {
        this.removePeerConnection(userId);
      }
    };

    this.peerConnections.set(userId, peerConnection);
    return peerConnection;
  }

  // 开始向指定用户共享
  async startSharingTo(userId, localStream) {
    try {
      const peerConnection = this.createPeerConnection(userId);

      // 添加本地流
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });

      // 创建并发送offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      this.socketManager.emit('offer', {
        offer: offer,
        target: userId
      });

    } catch (error) {
      console.error('开始共享失败:', error);
      throw error;
    }
  }

  // 请求从指定用户接收流
  async requestStreamFrom(userId) {
    try {
      console.log(`请求从用户 ${userId} 接收流`);
      const peerConnection = this.createPeerConnection(userId);

      // 创建offer来请求接收远程流
      const offer = await peerConnection.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: true
      });
      await peerConnection.setLocalDescription(offer);

      this.socketManager.emit('offer', {
        offer: offer,
        target: userId
      });

    } catch (error) {
      console.error('请求远程流失败:', error);
      throw error;
    }
  }

  // 处理接收到的offer
  async handleOffer(data) {
    try {
      const { offer, sender } = data;
      const peerConnection = this.createPeerConnection(sender);

      await peerConnection.setRemoteDescription(offer);
      
      // 如果有本地流正在共享，添加到连接中
      const localStream = this.getLocalStream?.();
      if (localStream) {
        console.log('添加本地流到连接:', sender);
        localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStream);
        });
      }
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      this.socketManager.emit('answer', {
        answer: answer,
        target: sender
      });

    } catch (error) {
      console.error('处理offer失败:', error);
    }
  }

  // 处理接收到的answer
  async handleAnswer(data) {
    try {
      const { answer, sender } = data;
      const peerConnection = this.peerConnections.get(sender);
      
      if (peerConnection) {
        await peerConnection.setRemoteDescription(answer);
      }

    } catch (error) {
      console.error('处理answer失败:', error);
    }
  }

  // 处理ICE候选
  async handleIceCandidate(data) {
    try {
      const { candidate, sender } = data;
      const peerConnection = this.peerConnections.get(sender);
      
      if (peerConnection) {
        await peerConnection.addIceCandidate(candidate);
      }

    } catch (error) {
      console.error('处理ICE候选失败:', error);
    }
  }

  // 移除对等连接
  removePeerConnection(userId) {
    const peerConnection = this.peerConnections.get(userId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(userId);
    }

    if (this.remoteStreams.has(userId)) {
      this.remoteStreams.delete(userId);
      this.callbacks.onRemoteStreamRemoved?.(userId);
    }
  }

  // 设置回调
  setCallback(event, callback) {
    this.callbacks[event] = callback;
  }

  // 获取远程流
  getRemoteStreams() {
    return this.remoteStreams;
  }

  // 获取对等连接
  getPeerConnections() {
    return this.peerConnections;
  }

  // 清理所有连接
  cleanup() {
    this.peerConnections.forEach((pc, userId) => {
      pc.close();
    });
    this.peerConnections.clear();
    this.remoteStreams.clear();
  }
}

export default WebRTCConnectionManager;