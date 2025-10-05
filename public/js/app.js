// 主应用类
class ScreenShareApp {
  constructor() {
    this.webrtc = null;
    this.currentRoom = null;
    this.isInRoom = false;
    this.isSharing = false;
    
    this.init();
  }
  
  init() {
    this.initializeElements();
    this.setupEventListeners();
    this.initializeWebRTC();
    this.hideLoadingOverlay();
  }
  
  initializeElements() {
    // 获取DOM元素
    this.elements = {
      roomInput: document.getElementById('roomInput'),
      joinBtn: document.getElementById('joinBtn'),
      shareBtn: document.getElementById('shareBtn'),
      stopBtn: document.getElementById('stopBtn'),
      roomInfo: document.getElementById('roomInfo'),
      shareStatus: document.getElementById('shareStatus'),
      loadingOverlay: document.getElementById('loadingOverlay'),
      emptyState: document.getElementById('emptyState')
    };
  }
  
  setupEventListeners() {
    // 房间加入
    this.elements.joinBtn.addEventListener('click', () => {
      this.handleJoinRoom();
    });
    
    // 回车键加入房间
    this.elements.roomInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleJoinRoom();
      }
    });
    
    // 开始屏幕共享
    this.elements.shareBtn.addEventListener('click', () => {
      this.handleStartScreenShare();
    });
    
    // 停止屏幕共享
    this.elements.stopBtn.addEventListener('click', () => {
      this.handleStopScreenShare();
    });
    
    // 本地视频全屏按钮
    const fullscreenLocalBtn = document.getElementById('fullscreenLocalBtn');
    if (fullscreenLocalBtn) {
      fullscreenLocalBtn.addEventListener('click', () => {
        if (this.webrtc) {
          this.webrtc.toggleFullscreen('localVideo');
        }
      });
    }
    
    // 设置控件事件监听
    this.setupSettingsListeners();
    
    // 页面关闭时清理资源
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
    
    // 页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('页面隐藏');
      } else {
        console.log('页面显示');
      }
    });
  }
  
  // 设置控件监听器
  setupSettingsListeners() {
    // 码率滑块
    const bitrateSlider = document.getElementById('bitrateSlider');
    const bitrateValue = document.getElementById('bitrateValue');
    if (bitrateSlider && bitrateValue) {
      bitrateSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        bitrateValue.textContent = `${value.toFixed(1)} Mbps`;
        if (this.webrtc && this.isSharing) {
          this.webrtc.updateBitrate(value);
        }
      });
    }
    
    // 画质选择
    const qualitySelect = document.getElementById('qualitySelect');
    if (qualitySelect) {
      qualitySelect.addEventListener('change', (e) => {
        if (this.webrtc && this.isSharing) {
          this.webrtc.updateQuality(e.target.value);
        }
      });
    }
    
    // 帧率选择
    const fpsSelect = document.getElementById('fpsSelect');
    if (fpsSelect) {
      fpsSelect.addEventListener('change', (e) => {
        if (this.webrtc && this.isSharing) {
          this.webrtc.updateFrameRate(parseInt(e.target.value));
        }
      });
    }
    
    // 编码器选择
    const codecSelect = document.getElementById('codecSelect');
    if (codecSelect) {
      codecSelect.addEventListener('change', (e) => {
        if (this.webrtc && this.isSharing) {
          this.webrtc.updateCodec(e.target.value);
        }
      });
    }
  }
  
  initializeWebRTC() {
    try {
      this.webrtc = new WebRTCManager();
      
      // 设置屏幕共享停止回调
      this.webrtc.onScreenShareStopped = () => {
        console.log('WebRTC通知: 屏幕共享已停止，更新UI状态');
        this.isSharing = false;
        this.updateUIForScreenShareStopped();
      };
      
      // 设置定期状态同步检查
      setInterval(() => {
        this.syncState();
      }, 2000); // 每2秒检查一次状态同步
      
      console.log('WebRTC 管理器初始化成功');
    } catch (error) {
      console.error('WebRTC 管理器初始化失败:', error);
      this.showError('WebRTC 初始化失败，请刷新页面重试');
    }
  }
  
  // 处理加入房间
  async handleJoinRoom() {
    const roomId = this.elements.roomInput.value.trim();
    
    if (!roomId) {
      this.showError('请输入房间号');
      return;
    }
    
    if (this.isInRoom && this.currentRoom === roomId) {
      this.showError('您已经在该房间中');
      return;
    }
    
    try {
      this.showLoading('正在加入房间...');
      
      // 如果已经在其他房间，先离开
      if (this.isInRoom) {
        await this.leaveRoom();
      }
      
      // 加入新房间
      const success = await this.webrtc.joinRoom(roomId);
      
      if (success) {
        this.currentRoom = roomId;
        this.isInRoom = true;
        this.updateUIForRoomJoined();
        this.showSuccess('成功加入房间', `房间号: ${roomId}`);
      } else {
        this.showError('加入房间失败');
      }
      
    } catch (error) {
      console.error('加入房间错误:', error);
      this.showError('加入房间时发生错误');
    } finally {
      this.hideLoadingOverlay();
    }
  }
  
  // 处理开始屏幕共享
  async handleStartScreenShare() {
    if (!this.isInRoom) {
      this.showError('请先加入房间');
      return;
    }
    
    if (this.isSharing) {
      this.showError('您已经在共享屏幕');
      return;
    }
    
    try {
      this.showLoading('正在启动屏幕共享...');
      
      const success = await this.webrtc.startScreenShare();
      
      if (success) {
        this.isSharing = true;
        this.updateUIForScreenShare();
        this.showSuccess('屏幕共享已开始', '其他用户现在可以看到您的屏幕');
      } else {
        this.showError('启动屏幕共享失败');
      }
      
    } catch (error) {
      console.error('屏幕共享错误:', error);
      this.showError('启动屏幕共享时发生错误');
    } finally {
      this.hideLoadingOverlay();
    }
  }
  
  // 处理停止屏幕共享
  handleStopScreenShare() {
    if (!this.isSharing) {
      this.showError('您没有在共享屏幕');
      return;
    }
    
    try {
      this.webrtc.stopScreenShare();
      // UI状态更新将通过回调函数处理，不需要在这里重复更新
      
    } catch (error) {
      console.error('停止屏幕共享错误:', error);
      this.showError('停止屏幕共享时发生错误');
    }
  }
  
  // 离开房间
  async leaveRoom() {
    if (this.isSharing) {
      this.webrtc.stopScreenShare();
      this.isSharing = false;
    }
    
    this.currentRoom = null;
    this.isInRoom = false;
    this.updateUIForRoomLeft();
  }
  
  // 更新UI - 加入房间后
  updateUIForRoomJoined() {
    this.elements.joinBtn.textContent = '切换房间';
    this.elements.shareBtn.disabled = false;
    
    // 生成随机房间号建议
    this.generateRoomSuggestion();
  }
  
  // 更新UI - 开始屏幕共享
  updateUIForScreenShare() {
    console.log('更新UI: 开始屏幕共享');
    this.elements.shareBtn.style.display = 'none';
    this.elements.stopBtn.style.display = 'block';
    this.elements.stopBtn.disabled = false; // 启用停止按钮
    this.elements.shareStatus.style.display = 'flex';
    
    // 禁用房间切换
    this.elements.joinBtn.disabled = true;
    this.elements.roomInput.disabled = true;
    
    console.log('停止按钮状态:', {
      display: this.elements.stopBtn.style.display,
      disabled: this.elements.stopBtn.disabled
    });
  }
  
  // 更新UI - 停止屏幕共享
  updateUIForScreenShareStopped() {
    console.log('更新UI: 停止屏幕共享');
    this.elements.shareBtn.style.display = 'block';
    this.elements.stopBtn.style.display = 'none';
    this.elements.stopBtn.disabled = true; // 禁用停止按钮
    this.elements.shareStatus.style.display = 'none';
    
    // 重新启用房间切换
    this.elements.joinBtn.disabled = false;
    this.elements.roomInput.disabled = false;
  }
  
  // 更新UI - 离开房间
  updateUIForRoomLeft() {
    this.elements.joinBtn.textContent = '加入房间';
    this.elements.shareBtn.disabled = true;
    this.elements.roomInfo.style.display = 'none';
    this.updateUIForScreenShareStopped();
  }
  
  // 生成房间号建议
  generateRoomSuggestion() {
    const suggestions = [
      '会议室-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      '演示-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      '培训-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      '讨论-' + Math.random().toString(36).substr(2, 6).toUpperCase()
    ];
    
    const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
    this.elements.roomInput.placeholder = `例如: ${randomSuggestion}`;
  }
  
  // 显示加载遮罩
  showLoading(message = '加载中...') {
    const overlay = this.elements.loadingOverlay;
    if (overlay) {
      const messageElement = overlay.querySelector('p');
      if (messageElement) {
        messageElement.textContent = message;
      }
      overlay.classList.remove('hidden');
    }
  }
  
  // 隐藏加载遮罩
  hideLoadingOverlay() {
    const overlay = this.elements.loadingOverlay;
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }
  
  // 显示成功通知
  showSuccess(title, message = '') {
    if (this.webrtc) {
      this.webrtc.showNotification('success', title, message);
    }
  }
  
  // 显示错误通知
  showError(message) {
    if (this.webrtc) {
      this.webrtc.showNotification('error', '错误', message);
    }
  }
  
  // 显示信息通知
  showInfo(title, message = '') {
    if (this.webrtc) {
      this.webrtc.showNotification('info', title, message);
    }
  }
  
  // 检查浏览器兼容性
  checkBrowserCompatibility() {
    const issues = [];
    
    // 检查 WebRTC 支持
    if (!window.RTCPeerConnection) {
      issues.push('不支持 WebRTC');
    }
    
    // 检查屏幕共享支持
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      issues.push('不支持屏幕共享');
    }
    
    // 检查 WebSocket 支持
    if (!window.WebSocket) {
      issues.push('不支持 WebSocket');
    }
    
    if (issues.length > 0) {
      this.showError('浏览器兼容性问题: ' + issues.join(', '));
      return false;
    }
    
    return true;
  }
  
  // 获取设备信息
  async getDeviceInfo() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const info = {
        cameras: devices.filter(d => d.kind === 'videoinput').length,
        microphones: devices.filter(d => d.kind === 'audioinput').length,
        speakers: devices.filter(d => d.kind === 'audiooutput').length
      };
      
      console.log('设备信息:', info);
      return info;
      
    } catch (error) {
      console.error('获取设备信息失败:', error);
      return null;
    }
  }
  
  // 清理资源
  cleanup() {
    if (this.webrtc) {
      this.webrtc.cleanup();
    }
  }
  
  // 获取应用状态
  getAppState() {
    return {
      isInRoom: this.isInRoom,
      currentRoom: this.currentRoom,
      isSharing: this.isSharing,
      webrtcConnected: this.webrtc && this.webrtc.socket && this.webrtc.socket.connected,
      webrtcSharingState: this.webrtc ? this.webrtc.isScreenSharing : false
    };
  }
  
  // 同步状态检查
  syncState() {
    if (this.webrtc) {
      // 如果WebRTC状态与应用状态不同步，进行修正
      if (this.isSharing !== this.webrtc.isScreenSharing) {
        console.log('状态不同步，进行修正:', {
          appSharing: this.isSharing,
          webrtcSharing: this.webrtc.isScreenSharing
        });
        
        this.isSharing = this.webrtc.isScreenSharing;
        
        if (this.isSharing) {
          this.updateUIForScreenShare();
        } else {
          this.updateUIForScreenShareStopped();
        }
      }
    }
  }
}

// 工具函数
const utils = {
  // 生成随机房间ID
  generateRoomId: () => {
    return Math.random().toString(36).substr(2, 9).toUpperCase();
  },
  
  // 格式化时间
  formatTime: (date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  },
  
  // 检测移动设备
  isMobile: () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },
  
  // 复制到剪贴板
  copyToClipboard: async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('复制失败:', error);
      return false;
    }
  }
};

// 全局变量
let app;
let webrtc;

// 当DOM加载完成时初始化应用
document.addEventListener('DOMContentLoaded', () => {
  console.log('晶莹投屏应用启动...');
  
  // 检查浏览器兼容性
  const compatibility = {
    webrtc: !!window.RTCPeerConnection,
    screenShare: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
    websocket: !!window.WebSocket
  };
  
  console.log('浏览器兼容性:', compatibility);
  
  // 初始化应用
  try {
    app = new ScreenShareApp();
    webrtc = app.webrtc; // 导出到全局供调试使用
    
    console.log('应用初始化成功');
    
    // 显示设备信息
    app.getDeviceInfo().then(info => {
      if (info) {
        console.log(`检测到设备: ${info.cameras}个摄像头, ${info.microphones}个麦克风, ${info.speakers}个扬声器`);
      }
    });
    
  } catch (error) {
    console.error('应用初始化失败:', error);
    
    // 显示错误信息
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      text-align: center;
      z-index: 10000;
    `;
    errorDiv.innerHTML = `
      <h3 style="color: #ef4444; margin-bottom: 1rem;">应用启动失败</h3>
      <p style="color: #6b7280; margin-bottom: 1rem;">请刷新页面重试</p>
      <button onclick="location.reload()" style="
        background: #3b82f6;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
      ">刷新页面</button>
    `;
    document.body.appendChild(errorDiv);
  }
});

// 导出到全局作用域
window.app = app;
window.utils = utils;