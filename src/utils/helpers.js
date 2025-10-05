// 工具函数

/**
 * 生成随机房间ID
 */
export const generateRoomId = () => {
  const prefixes = ['ROOM', 'MEET', 'SHARE', 'DEMO'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${randomId}`;
};

/**
 * 格式化时间
 */
export const formatTime = (date = new Date()) => {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * 检测移动设备
 */
export const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * 复制到剪贴板
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('复制失败:', error);
    return false;
  }
};

/**
 * 检查浏览器兼容性
 */
export const checkBrowserCompatibility = () => {
  const issues = [];
  
  if (!window.RTCPeerConnection) {
    issues.push('不支持 WebRTC');
  }
  
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    issues.push('不支持屏幕共享');
  }
  
  if (!window.WebSocket) {
    issues.push('不支持 WebSocket');
  }
  
  return {
    isCompatible: issues.length === 0,
    issues
  };
};

/**
 * 获取设备信息
 */
export const getDeviceInfo = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      cameras: devices.filter(d => d.kind === 'videoinput').length,
      microphones: devices.filter(d => d.kind === 'audioinput').length,
      speakers: devices.filter(d => d.kind === 'audiooutput').length
    };
  } catch (error) {
    console.error('获取设备信息失败:', error);
    return null;
  }
};

/**
 * 获取画质配置
 */
export const getQualityConstraints = (quality) => {
  const qualities = {
    low: { width: 854, height: 480, label: '标清 (480p)' },
    medium: { width: 1280, height: 720, label: '高清 (720p)' },
    high: { width: 1920, height: 1080, label: '全高清 (1080p)' },
    ultra: { width: 2560, height: 1440, label: '2K (1440p)' },
    '4k': { width: 3840, height: 2160, label: '4K (2160p)' }
  };
  return qualities[quality] || qualities.high;
};

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 格式化码率
 */
export const formatBitrate = (bitsPerSecond) => {
  if (bitsPerSecond < 1000) return `${bitsPerSecond} bps`;
  if (bitsPerSecond < 1000000) return `${(bitsPerSecond / 1000).toFixed(1)} Kbps`;
  return `${(bitsPerSecond / 1000000).toFixed(2)} Mbps`;
};

/**
 * 获取连接质量
 */
export const getConnectionQuality = (stats) => {
  const { bitrate, packetLoss, rtt } = stats;
  
  let score = 100;
  
  // 根据码率扣分
  if (bitrate < 1000000) score -= 30; // 小于1Mbps
  else if (bitrate < 3000000) score -= 15; // 小于3Mbps
  
  // 根据丢包率扣分
  if (packetLoss > 5) score -= 40; // 大于5%
  else if (packetLoss > 1) score -= 20; // 大于1%
  
  // 根据延迟扣分
  if (rtt > 200) score -= 30; // 大于200ms
  else if (rtt > 100) score -= 15; // 大于100ms
  
  if (score >= 80) return { level: 'excellent', color: 'var(--leaf-500)' };
  if (score >= 60) return { level: 'good', color: 'var(--lemon-500)' };
  if (score >= 40) return { level: 'fair', color: 'var(--mango-500)' };
  return { level: 'poor', color: '#ef4444' };
};

/**
 * 防抖函数
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * 节流函数
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};