// WebRTC 管理类
class WebRTCManager {
  constructor() {
    this.localStream = null;
    this.peerConnections = new Map();
    this.socket = null;
    this.roomId = null;
    this.isScreenSharing = false;
    this.onScreenShareStopped = null; // 回调函数
    this.statsInterval = null; // 统计信息定时器
    this.currentSettings = {
      quality: 'high',
      fps: 30,
      codec: 'auto',
      bitrate: 8,
      audioEnabled: true,
      echoCancellation: true,
      noiseSuppression: true,
      hardwareAccel: true,
      adaptiveBitrate: true
    };
    
    // WebRTC 配置
    this.rtcConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
    };
    
    this.init();
  }
  
  init() {
    this.socket = io();
    this.setupSocketListeners();
    this.setupFullscreenListeners();
  }
  
  setupSocketListeners() {
    // 连接状态
    this.socket.on('connect', () => {
      console.log('WebSocket 连接成功');
      this.updateConnectionStatus('connected');
    });
    
    this.socket.on('disconnect', () => {
      console.log('WebSocket 连接断开');
      this.updateConnectionStatus('disconnected');
      this.cleanup();
    });
    
    // 房间事件
    this.socket.on('room-info', (data) => {
      console.log('房间信息:', data);
      this.updateRoomInfo(data);
    });
    
    this.socket.on('user-joined', (data) => {
      console.log('用户加入:', data);
      this.showNotification('info', '新用户加入', `房间内现有 ${data.userCount} 人`);
      this.updateUserCount(data.userCount);
    });
    
    this.socket.on('user-left', (data) => {
      console.log('用户离开:', data);
      this.showNotification('info', '用户离开', `房间内现有 ${data.userCount} 人`);
      this.updateUserCount(data.userCount);
      this.removePeerConnection(data.userId);
    });
    
    // 屏幕共享事件
    this.socket.on('screen-share-started', (data) => {
      console.log('远程屏幕共享开始:', data);
      this.showNotification('success', '屏幕共享', '有用户开始共享屏幕');
      this.handleRemoteScreenShare(data.userId);
    });
    
    this.socket.on('screen-share-stopped', (data) => {
      console.log('远程屏幕共享停止:', data);
      this.showNotification('info', '屏幕共享', '用户停止了屏幕共享');
      this.removeRemoteVideo(data.userId);
      this.checkAndShowEmptyState();
    });
    
    // WebRTC 信令
    this.socket.on('offer', async (data) => {
      console.log('收到 offer:', data);
      await this.handleOffer(data);
    });
    
    this.socket.on('answer', async (data) => {
      console.log('收到 answer:', data);
      await this.handleAnswer(data);
    });
    
    this.socket.on('ice-candidate', async (data) => {
      console.log('收到 ICE candidate:', data);
      await this.handleIceCandidate(data);
    });
  }
  
  // 设置全屏监听器
  setupFullscreenListeners() {
    // 本地视频全屏按钮
    document.addEventListener('DOMContentLoaded', () => {
      const fullscreenLocalBtn = document.getElementById('fullscreenLocalBtn');
      if (fullscreenLocalBtn) {
        fullscreenLocalBtn.addEventListener('click', () => {
          this.toggleFullscreen('localVideo');
        });
      }
    });
    
    // 监听全屏变化事件
    document.addEventListener('fullscreenchange', () => {
      this.handleFullscreenChange();
    });
    
    document.addEventListener('webkitfullscreenchange', () => {
      this.handleFullscreenChange();
    });
    
    document.addEventListener('mozfullscreenchange', () => {
      this.handleFullscreenChange();
    });
    
    document.addEventListener('MSFullscreenChange', () => {
      this.handleFullscreenChange();
    });
  }
  
  // 加入房间
  async joinRoom(roomId) {
    try {
      this.roomId = roomId;
      this.socket.emit('join-room', roomId);
      console.log(`尝试加入房间: ${roomId}`);
      return true;
    } catch (error) {
      console.error('加入房间失败:', error);
      this.showNotification('error', '错误', '加入房间失败');
      return false;
    }
  }
  
  // 开始屏幕共享
  async startScreenShare() {
    try {
      // 检查浏览器支持
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('浏览器不支持屏幕共享功能');
      }
      
      console.log('请求屏幕共享权限...');
      
      // 获取当前设置
      const qualityConstraints = this.getQualityConstraints(this.currentSettings.quality);
      
      // 获取屏幕共享流
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { ideal: qualityConstraints.width, max: qualityConstraints.width },
          height: { ideal: qualityConstraints.height, max: qualityConstraints.height },
          frameRate: { ideal: this.currentSettings.fps, max: this.currentSettings.fps }
        },
        audio: this.currentSettings.audioEnabled ? {
          echoCancellation: this.currentSettings.echoCancellation,
          noiseSuppression: this.currentSettings.noiseSuppression,
          sampleRate: 44100
        } : false
      });
      
      this.localStream = stream;
      this.isScreenSharing = true;
      
      // 显示本地预览
      this.displayLocalVideo(stream);
      
      // 开始收集统计信息
      this.startStatsCollection();
      
      // 监听屏幕共享停止事件
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('用户停止了屏幕共享');
        this.stopScreenShare();
      });
      
      // 通知服务器开始屏幕共享
      this.socket.emit('start-screen-share', this.roomId);
      
      this.showNotification('success', '屏幕共享', '屏幕共享已开始');
      return true;
      
    } catch (error) {
      console.error('开始屏幕共享失败:', error);
      
      let errorMessage = '开始屏幕共享失败';
      if (error.name === 'NotAllowedError') {
        errorMessage = '用户拒绝了屏幕共享权限';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = '浏览器不支持屏幕共享功能';
      } else if (error.name === 'NotFoundError') {
        errorMessage = '未找到可共享的屏幕';
      }
      
      this.showNotification('error', '错误', errorMessage);
      return false;
    }
  }
  
  // 停止屏幕共享
  stopScreenShare() {
    try {
      // 停止统计信息收集
      this.stopStatsCollection();
      
      if (this.localStream) {
        // 停止所有轨道
        this.localStream.getTracks().forEach(track => {
          track.stop();
        });
        this.localStream = null;
      }
      
      this.isScreenSharing = false;
      
      // 隐藏本地视频
      this.hideLocalVideo();
      
      // 关闭所有对等连接
      this.peerConnections.forEach((pc, userId) => {
        pc.close();
        this.peerConnections.delete(userId);
      });
      
      // 通知服务器停止屏幕共享
      if (this.socket && this.roomId) {
        this.socket.emit('stop-screen-share', this.roomId);
      }
      
      // 检查是否显示空状态
      this.checkAndShowEmptyState();
      
      // 通知主应用更新UI状态
      if (this.onScreenShareStopped && typeof this.onScreenShareStopped === 'function') {
        this.onScreenShareStopped();
      }
      
      this.showNotification('info', '屏幕共享', '屏幕共享已停止');
      
    } catch (error) {
      console.error('停止屏幕共享失败:', error);
      this.showNotification('error', '错误', '停止屏幕共享失败');
    }
  }
  
  // 获取质量配置
  getQualityConstraints(quality) {
    const qualities = {
      low: { width: 854, height: 480 },
      medium: { width: 1280, height: 720 },
      high: { width: 1920, height: 1080 },
      ultra: { width: 2560, height: 1440 },
      '4k': { width: 3840, height: 2160 }
    };
    return qualities[quality] || qualities.high;
  }
  
  // 更新画质
  async updateQuality(quality) {
    this.currentSettings.quality = quality;
    console.log('更新画质设置:', quality);
    
    if (this.localStream && this.isScreenSharing) {
      try {
        const constraints = this.getQualityConstraints(quality);
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          await videoTrack.applyConstraints({
            width: { ideal: constraints.width },
            height: { ideal: constraints.height }
          });
          this.showNotification('success', '画质更新', `已切换到 ${quality}`);
        }
      } catch (error) {
        console.error('更新画质失败:', error);
        this.showNotification('error', '错误', '更新画质失败');
      }
    }
  }
  
  // 更新帧率
  async updateFrameRate(fps) {
    this.currentSettings.fps = fps;
    console.log('更新帧率:', fps);
    
    if (this.localStream && this.isScreenSharing) {
      try {
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          await videoTrack.applyConstraints({
            frameRate: { ideal: fps, max: fps }
          });
          this.showNotification('success', '帧率更新', `已设置为 ${fps} FPS`);
        }
      } catch (error) {
        console.error('更新帧率失败:', error);
        this.showNotification('error', '错误', '更新帧率失败');
      }
    }
  }
  
  // 更新码率
  updateBitrate(bitrate) {
    this.currentSettings.bitrate = bitrate;
    console.log('更新码率:', bitrate, 'Mbps');
    
    // 更新所有对等连接的码率
    this.peerConnections.forEach(async (pc, userId) => {
      try {
        const senders = pc.getSenders();
        const videoSender = senders.find(sender => sender.track && sender.track.kind === 'video');
        
        if (videoSender) {
          const parameters = videoSender.getParameters();
          if (!parameters.encodings) {
            parameters.encodings = [{}];
          }
          
          parameters.encodings[0].maxBitrate = bitrate * 1000 * 1000; // 转换为 bps
          
          await videoSender.setParameters(parameters);
          console.log(`已为用户 ${userId} 更新码率:`, bitrate, 'Mbps');
        }
      } catch (error) {
        console.error('更新码率失败:', error);
      }
    });
  }
  
  // 更新编码器
  async updateCodec(codec) {
    this.currentSettings.codec = codec;
    console.log('编码器设置更新:', codec);
    this.showNotification('info', '编码器更新', `已设置为 ${codec} (新连接生效)`);
  }
  
  // 开始统计信息收集
  startStatsCollection() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }
    
    this.statsInterval = setInterval(() => {
      this.collectLocalStats();
      this.collectRemoteStats();
    }, 1000); // 每秒更新一次
  }
  
  // 停止统计信息收集
  stopStatsCollection() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }
  
  // 收集本地流统计信息
  async collectLocalStats() {
    if (!this.localStream) return;
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return;
    
    const settings = videoTrack.getSettings();
    
    // 更新本地统计显示
    const resolutionEl = document.getElementById('localResolution');
    const fpsEl = document.getElementById('localFPS');
    const bitrateEl = document.getElementById('localBitrate');
    const codecEl = document.getElementById('localCodec');
    
    if (resolutionEl && settings.width && settings.height) {
      resolutionEl.textContent = `${settings.width}x${settings.height}`;
    }
    
    if (fpsEl && settings.frameRate) {
      fpsEl.textContent = `${Math.round(settings.frameRate)} fps`;
    }
    
    if (bitrateEl) {
      bitrateEl.textContent = `${this.currentSettings.bitrate} Mbps`;
    }
    
    if (codecEl) {
      codecEl.textContent = this.currentSettings.codec || 'auto';
    }
    
    // 从对等连接获取详细统计
    for (const [userId, pc] of this.peerConnections) {
      try {
        const stats = await pc.getStats();
        stats.forEach(report => {
          if (report.type === 'outbound-rtp' && report.kind === 'video') {
            // 可以在这里添加更详细的统计信息
            if (bitrateEl && report.bytesSent !== undefined) {
              // 计算实际码率
              if (this.lastBytesSent && this.lastStatsTime) {
                const timeDiff = (Date.now() - this.lastStatsTime) / 1000;
                const bytesDiff = report.bytesSent - this.lastBytesSent;
                const bitrate = (bytesDiff * 8) / timeDiff / 1000000; // Mbps
                bitrateEl.textContent = `${bitrate.toFixed(2)} Mbps`;
                
                // 根据码率设置颜色
                bitrateEl.className = 'stat-value';
                if (bitrate < this.currentSettings.bitrate * 0.5) {
                  bitrateEl.classList.add('error');
                } else if (bitrate < this.currentSettings.bitrate * 0.8) {
                  bitrateEl.classList.add('warning');
                } else {
                  bitrateEl.classList.add('good');
                }
              }
              this.lastBytesSent = report.bytesSent;
              this.lastStatsTime = Date.now();
            }
          }
        });
      } catch (error) {
        console.error('收集统计信息失败:', error);
      }
    }
  }
  
  // 收集远程流统计信息
  async collectRemoteStats() {
    for (const [userId, pc] of this.peerConnections) {
      try {
        const stats = await pc.getStats();
        let statsData = {
          resolution: '-',
          fps: '-',
          bitrate: '-',
          codec: '-',
          packetLoss: 0,
          jitter: 0,
          rtt: 0,
          connectionState: pc.connectionState,
          iceConnectionState: pc.iceConnectionState,
          iceGatheringState: pc.iceGatheringState,
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
              const key = `${userId}_lastBytesReceived`;
              const timeKey = `${userId}_lastTime`;
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
        
        // 更新远程视频统计显示
        this.updateRemoteVideoStats(userId, statsData);
        
      } catch (error) {
        console.error(`收集用户 ${userId} 统计信息失败:`, error);
      }
    }
  }
  
  // 更新远程视频统计显示
  updateRemoteVideoStats(userId, stats) {
    const videoContainer = document.getElementById(`remote-${userId}`);
    if (!videoContainer) return;
    
    // 更新统计数据的辅助函数
    const updateElement = (id, value, classNames = '') => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = value;
        if (classNames) el.className = classNames;
      }
    };
    
    // 更新基础统计
    updateElement(`remote-${userId}-resolution`, stats.resolution);
    updateElement(`remote-${userId}-fps`, stats.fps);
    updateElement(`remote-${userId}-codec`, stats.codec);
    
    // 码率带颜色
    const bitrateValue = parseFloat(stats.bitrate);
    let bitrateClass = 'stat-value';
    if (bitrateValue > 0) {
      if (bitrateValue < 1) bitrateClass += ' error';
      else if (bitrateValue < 3) bitrateClass += ' warning';
      else bitrateClass += ' good';
    }
    updateElement(`remote-${userId}-bitrate`, stats.bitrate, bitrateClass);
    
    // P2P 连接状态
    const p2pEl = document.getElementById(`remote-${userId}-p2p`);
    if (p2pEl) {
      if (stats.p2pConnected) {
        p2pEl.innerHTML = '<span class="status-indicator success"><i class="fas fa-check"></i> 已连接</span>';
      } else {
        p2pEl.innerHTML = '<span class="status-indicator warning"><i class="fas fa-times"></i> 中继模式</span>';
      }
    }
    
    // 连接状态
    const connEl = document.getElementById(`remote-${userId}-connection`);
    if (connEl) {
      let statusClass = 'warning';
      if (stats.connectionState === 'connected') statusClass = 'success';
      else if (stats.connectionState === 'failed' || stats.connectionState === 'disconnected') statusClass = 'error';
      connEl.innerHTML = `<span class="status-indicator ${statusClass}">${stats.connectionState}</span>`;
    }
    
    // RTT
    const rttValue = parseInt(stats.rtt);
    let rttText = stats.rtt !== 0 ? `${stats.rtt} ms` : '-';
    if (rttValue > 0) {
      if (rttValue < 50) rttText = `<span style="color: var(--leaf-400)">${stats.rtt} ms</span>`;
      else if (rttValue < 150) rttText = `<span style="color: var(--lemon-400)">${stats.rtt} ms</span>`;
      else rttText = `<span style="color: var(--mango-400)">${stats.rtt} ms</span>`;
    }
    const rttEl = document.getElementById(`remote-${userId}-rtt`);
    if (rttEl) rttEl.innerHTML = rttText;
    
    // 抖动
    updateElement(`remote-${userId}-jitter`, stats.jitter !== 0 ? `${stats.jitter} ms` : '-');
    
    // 丢包率
    const lossValue = parseFloat(stats.packetLoss);
    let lossText = stats.packetLoss !== 0 ? `${stats.packetLoss}%` : '-';
    if (lossValue > 0) {
      if (lossValue < 1) lossText = `<span style="color: var(--leaf-400)">${stats.packetLoss}%</span>`;
      else if (lossValue < 5) lossText = `<span style="color: var(--lemon-400)">${stats.packetLoss}%</span>`;
      else lossText = `<span style="color: var(--mango-400)">${stats.packetLoss}%</span>`;
    }
    const lossEl = document.getElementById(`remote-${userId}-packetloss`);
    if (lossEl) lossEl.innerHTML = lossText;
  }
  
  // 处理远程屏幕共享
  async handleRemoteScreenShare(userId) {
    try {
      console.log(`检测到用户 ${userId} 开始屏幕共享，建立连接...`);
      
      if (!this.peerConnections.has(userId)) {
        const pc = await this.createPeerConnection(userId);
        
        // 作为接收方，主动发送offer来请求屏幕共享
        console.log(`向 ${userId} 发送连接请求...`);
        
        // 创建并发送offer
        const offer = await pc.createOffer({
          offerToReceiveVideo: true,
          offerToReceiveAudio: true
        });
        await pc.setLocalDescription(offer);
        
        this.socket.emit('offer', {
          target: userId,
          offer: offer
        });
      }
    } catch (error) {
      console.error('处理远程屏幕共享失败:', error);
    }
  }
  
  // 创建对等连接
  async createPeerConnection(userId) {
    try {
      const pc = new RTCPeerConnection(this.rtcConfiguration);
      this.peerConnections.set(userId, pc);
      
      // 监听 ICE 候选
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('发送 ICE candidate 到:', userId);
          this.socket.emit('ice-candidate', {
            target: userId,
            candidate: event.candidate
          });
        }
      };
      
      // 监听远程流
      pc.ontrack = (event) => {
        console.log('收到远程流:', event);
        this.displayRemoteVideo(userId, event.streams[0]);
        
        // 如果还没有启动统计收集，现在启动
        if (!this.statsInterval) {
          console.log('启动统计信息收集');
          this.startStatsCollection();
        }
      };
      
      // 监听连接状态
      pc.onconnectionstatechange = () => {
        console.log(`与 ${userId} 的连接状态:`, pc.connectionState);
        
        if (pc.connectionState === 'connected') {
          console.log(`与 ${userId} 连接建立成功`);
          // 连接成功后确保统计收集正在运行
          if (!this.statsInterval) {
            this.startStatsCollection();
          }
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          console.log(`与 ${userId} 连接失败或断开`);
          this.removeRemoteVideo(userId);
          this.peerConnections.delete(userId);
          this.checkAndShowEmptyState();
          
          // 如果没有其他连接了，停止统计收集
          if (this.peerConnections.size === 0 && !this.isScreenSharing) {
            this.stopStatsCollection();
          }
        }
      };
      
      // 监听ICE连接状态
      pc.oniceconnectionstatechange = () => {
        console.log(`与 ${userId} 的ICE连接状态:`, pc.iceConnectionState);
      };
      
      return pc;
      
    } catch (error) {
      console.error('创建对等连接失败:', error);
      throw error;
    }
  }
  
  // 处理 offer
  async handleOffer(data) {
    try {
      const { offer, sender } = data;
      
      let pc = this.peerConnections.get(sender);
      if (!pc) {
        pc = await this.createPeerConnection(sender);
      }
      
      await pc.setRemoteDescription(offer);
      
      // 如果本地有屏幕共享流，添加到连接中
      if (this.localStream && this.isScreenSharing) {
        console.log('添加本地屏幕共享流到连接:', sender);
        this.localStream.getTracks().forEach(track => {
          pc.addTrack(track, this.localStream);
        });
      }
      
      // 创建并发送 answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      console.log('发送 answer 到:', sender);
      this.socket.emit('answer', {
        target: sender,
        answer: answer
      });
      
    } catch (error) {
      console.error('处理 offer 失败:', error);
    }
  }
  
  // 处理 answer
  async handleAnswer(data) {
    try {
      const { answer, sender } = data;
      const pc = this.peerConnections.get(sender);
      
      if (pc) {
        await pc.setRemoteDescription(answer);
        console.log('设置远程描述成功:', sender);
      }
      
    } catch (error) {
      console.error('处理 answer 失败:', error);
    }
  }
  
  // 处理 ICE candidate
  async handleIceCandidate(data) {
    try {
      const { candidate, sender } = data;
      const pc = this.peerConnections.get(sender);
      
      if (pc) {
        await pc.addIceCandidate(candidate);
        console.log('添加 ICE candidate 成功:', sender);
      }
      
    } catch (error) {
      console.error('处理 ICE candidate 失败:', error);
    }
  }
  
  // 移除对等连接
  removePeerConnection(userId) {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(userId);
    }
    this.removeRemoteVideo(userId);
    this.checkAndShowEmptyState();
  }
  
  // 显示本地视频
  displayLocalVideo(stream) {
    console.log('显示本地视频预览');
    const videoContainer = document.getElementById('localVideoContainer');
    const video = document.getElementById('localVideo');
    const emptyState = document.getElementById('emptyState');
    
    if (video && stream) {
      video.srcObject = stream;
      videoContainer.style.display = 'block';
      videoContainer.classList.add('fade-in');
      
      // 当本地预览出现时，隐藏欢迎界面
      if (emptyState) {
        console.log('隐藏欢迎界面（本地预览出现）');
        emptyState.style.display = 'none';
      }
    }
  }
  
  // 隐藏本地视频
  hideLocalVideo() {
    console.log('隐藏本地视频预览');
    const videoContainer = document.getElementById('localVideoContainer');
    if (videoContainer) {
      videoContainer.style.display = 'none';
    }
    
    // 检查是否需要显示欢迎界面
    this.checkAndShowEmptyState();
  }
  
  // 显示远程视频
  displayRemoteVideo(userId, stream) {
    const remoteVideos = document.getElementById('remoteVideos');
    const emptyState = document.getElementById('emptyState');
    
    // 隐藏空状态 - 只有在有远程视频时才隐藏
    if (emptyState) {
      emptyState.style.display = 'none';
    }
    
    // 检查是否已存在该用户的视频
    let videoContainer = document.getElementById(`remote-${userId}`);
    
    if (!videoContainer) {
      // 创建新的视频容器
      videoContainer = document.createElement('div');
      videoContainer.id = `remote-${userId}`;
      videoContainer.className = 'video-container glass-card fade-in';
      
      videoContainer.innerHTML = `
        <div class="video-header">
          <h3>
            <i class="fas fa-user"></i>
            用户 ${userId.substring(0, 6)}...
          </h3>
          <div class="video-controls">
            <button class="info-toggle-btn" onclick="app.webrtc.toggleConnectionDetails('${userId}')">
              <i class="fas fa-info"></i>
            </button>
            <button class="control-btn" onclick="app.webrtc.toggleRemoteAudio('${userId}')">
              <i class="fas fa-volume-up"></i>
            </button>
            <button class="control-btn" onclick="app.webrtc.toggleFullscreen('remote-${userId}-video')">
              <i class="fas fa-expand"></i>
            </button>
          </div>
        </div>
        <div class="connection-details" id="details-${userId}">
          <div class="detail-row">
            <span class="detail-label"><i class="fas fa-exchange-alt"></i> P2P 连接</span>
            <span class="detail-value" id="remote-${userId}-p2p">
              <span class="status-indicator warning"><i class="fas fa-spinner fa-spin"></i> 连接中...</span>
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label"><i class="fas fa-network-wired"></i> 连接状态</span>
            <span class="detail-value" id="remote-${userId}-connection">
              <span class="status-indicator warning">connecting</span>
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label"><i class="fas fa-clock"></i> 延迟 (RTT)</span>
            <span class="detail-value" id="remote-${userId}-rtt">-</span>
          </div>
          <div class="detail-row">
            <span class="detail-label"><i class="fas fa-chart-line"></i> 抖动</span>
            <span class="detail-value" id="remote-${userId}-jitter">-</span>
          </div>
          <div class="detail-row">
            <span class="detail-label"><i class="fas fa-exclamation-triangle"></i> 丢包率</span>
            <span class="detail-value" id="remote-${userId}-packetloss">-</span>
          </div>
        </div>
        <video id="remote-${userId}-video" autoplay playsinline></video>
        <div class="video-overlay">
          <div class="recording-indicator">
            <i class="fas fa-circle pulse"></i>
            <span>直播中</span>
          </div>
        </div>
        <div class="stream-stats" id="stats-${userId}">
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">分辨率</span>
              <span class="stat-value" id="remote-${userId}-resolution">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">帧率</span>
              <span class="stat-value" id="remote-${userId}-fps">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">码率</span>
              <span class="stat-value" id="remote-${userId}-bitrate">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">编码器</span>
              <span class="stat-value" id="remote-${userId}-codec">-</span>
            </div>
          </div>
        </div>
      `;
      
      remoteVideos.appendChild(videoContainer);
    }
    
    // 设置视频流
    const video = videoContainer.querySelector('video');
    if (video && stream) {
      video.srcObject = stream;
      console.log('远程视频流已设置:', userId);
    }
  }
  
  // 移除远程视频
  removeRemoteVideo(userId) {
    const videoContainer = document.getElementById(`remote-${userId}`);
    if (videoContainer) {
      videoContainer.remove();
    }
  }
  
  // 检查并显示空状态
  checkAndShowEmptyState() {
    const remoteVideos = document.getElementById('remoteVideos');
    const localVideoContainer = document.getElementById('localVideoContainer');
    const emptyState = document.getElementById('emptyState');
    
    // 只有在没有远程视频且没有本地视频显示时才显示空状态
    if (remoteVideos && emptyState && localVideoContainer) {
      const hasRemoteVideos = remoteVideos.children.length > 0;
      const hasLocalVideo = localVideoContainer.style.display !== 'none';
      
      console.log('检查空状态:', {
        hasRemoteVideos,
        hasLocalVideo,
        shouldShowEmpty: !hasRemoteVideos && !hasLocalVideo
      });
      
      if (!hasRemoteVideos && !hasLocalVideo) {
        console.log('显示欢迎界面');
        emptyState.style.display = 'flex';
      }
    }
  }
  
  // 全屏功能
  toggleFullscreen(videoId) {
    const video = document.getElementById(videoId);
    if (!video) return;
    
    if (!document.fullscreenElement && !document.webkitFullscreenElement && 
        !document.mozFullScreenElement && !document.msFullscreenElement) {
      // 进入全屏
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
      } else if (video.mozRequestFullScreen) {
        video.mozRequestFullScreen();
      } else if (video.msRequestFullscreen) {
        video.msRequestFullscreen();
      }
    } else {
      // 退出全屏
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }
  
  // 处理全屏变化
  handleFullscreenChange() {
    const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || 
                            document.mozFullScreenElement || document.msFullscreenElement);
    
    // 更新所有全屏按钮的图标
    const fullscreenBtns = document.querySelectorAll('.control-btn[onclick*="toggleFullscreen"]');
    fullscreenBtns.forEach(btn => {
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = isFullscreen ? 'fas fa-compress' : 'fas fa-expand';
      }
    });
    
    console.log('全屏状态变化:', isFullscreen ? '进入全屏' : '退出全屏');
  }
  
  // 切换远程音频
  toggleRemoteAudio(userId) {
    const videoContainer = document.getElementById(`remote-${userId}`);
    if (videoContainer) {
      const video = videoContainer.querySelector('video');
      const button = videoContainer.querySelector('.control-btn i');
      
      if (video) {
        video.muted = !video.muted;
        button.className = video.muted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
      }
    }
  }
  
  // 切换连接详情面板
  toggleConnectionDetails(userId) {
    const detailsPanel = document.getElementById(`details-${userId}`);
    const toggleBtn = document.querySelector(`#remote-${userId} .info-toggle-btn`);
    
    if (detailsPanel && toggleBtn) {
      detailsPanel.classList.toggle('show');
      toggleBtn.classList.toggle('active');
    }
  }
  
  // 更新连接状态
  updateConnectionStatus(status) {
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
      statusElement.className = `connection-status ${status}`;
      
      if (status === 'connected') {
        statusElement.innerHTML = '<i class="fas fa-circle"></i><span>已连接</span>';
      } else {
        statusElement.innerHTML = '<i class="fas fa-circle"></i><span>未连接</span>';
      }
    }
  }
  
  // 更新房间信息
  updateRoomInfo(data) {
    const roomInfo = document.getElementById('roomInfo');
    const currentRoom = document.getElementById('currentRoom');
    const userCount = document.getElementById('userCount');
    
    if (roomInfo && currentRoom && userCount) {
      roomInfo.style.display = 'block';
      currentRoom.textContent = data.roomId;
      userCount.textContent = data.userCount;
    }
  }
  
  // 更新用户数量
  updateUserCount(count) {
    const userCount = document.getElementById('userCount');
    if (userCount) {
      userCount.textContent = count;
    }
  }
  
  // 显示通知
  showNotification(type, title, message) {
    const notifications = document.getElementById('notifications');
    if (!notifications) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    let icon = 'fas fa-info-circle';
    if (type === 'success') icon = 'fas fa-check-circle';
    if (type === 'error') icon = 'fas fa-exclamation-circle';
    
    notification.innerHTML = `
      <i class="${icon}"></i>
      <div class="notification-content">
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
      </div>
    `;
    
    notifications.appendChild(notification);
    
    // 自动移除通知
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => {
          notification.remove();
        }, 300);
      }
    }, 5000);
  }
  
  // 清理资源
  cleanup() {
    // 停止统计信息收集
    this.stopStatsCollection();
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    this.peerConnections.forEach((pc) => {
      pc.close();
    });
    this.peerConnections.clear();
    
    this.isScreenSharing = false;
    this.hideLocalVideo();
    
    // 清除所有远程视频
    const remoteVideos = document.getElementById('remoteVideos');
    if (remoteVideos) {
      remoteVideos.innerHTML = '';
    }
    
    // 显示空状态
    this.checkAndShowEmptyState();
  }
}

// 导出到全局
window.WebRTCManager = WebRTCManager;
