import { getQualityConstraints } from '../utils/helpers';

class ScreenShareManager {
  constructor() {
    this.localStream = null;
    this.isSharing = false;
    this.settings = {
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
  }

  // 开始屏幕共享
  async startScreenShare() {
    try {
      if (this.isSharing) {
        console.log('已在共享屏幕');
        return this.localStream;
      }

      console.log('开始屏幕共享...');
      
      const constraints = {
        video: {
          ...getQualityConstraints(this.settings.quality),
          frameRate: { 
            ideal: this.settings.fps,
          },
          cursor: 'always'
        },
        audio: this.settings.audioEnabled ? {
          echoCancellation: this.settings.echoCancellation,
          noiseSuppression: this.settings.noiseSuppression,
          autoGainControl: true
        } : false
      };

      this.localStream = await navigator.mediaDevices.getDisplayMedia(constraints);
      this.isSharing = true;

      // 监听屏幕共享结束事件
      this.localStream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('用户停止了屏幕共享');
        this.stopScreenShare();
      });

      console.log('屏幕共享开始成功');
      return this.localStream;

    } catch (error) {
      console.error('屏幕共享失败:', error);
      throw error;
    }
  }

  // 停止屏幕共享
  stopScreenShare() {
    try {
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          track.stop();
        });
        this.localStream = null;
      }
      
      this.isSharing = false;
      console.log('屏幕共享已停止');
      
    } catch (error) {
      console.error('停止屏幕共享失败:', error);
      throw error;
    }
  }

  // 更新设置
  async updateSettings(newSettings) {
    const oldSettings = { ...this.settings };
    this.settings = { ...this.settings, ...newSettings };
    console.log('屏幕共享设置已更新:', this.settings);
    
    // 如果正在共享，立即应用新设置
    if (this.isSharing && this.localStream) {
      try {
        await this.applySettingsToStream();
        console.log('设置已应用到当前流');
      } catch (error) {
        console.error('应用设置失败:', error);
        // 如果应用失败，恢复旧设置
        this.settings = oldSettings;
        throw error;
      }
    }
  }

  // 应用设置到当前流
  async applySettingsToStream() {
    if (!this.localStream) return;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const qualityConstraints = getQualityConstraints(this.settings.quality);
      
      // 应用视频约束
      await videoTrack.applyConstraints({
        width: { ideal: qualityConstraints.width, max: qualityConstraints.width },
        height: { ideal: qualityConstraints.height, max: qualityConstraints.height },
        frameRate: { ideal: this.settings.fps, max: this.settings.fps }
      });

      console.log(`已应用设置: 质量=${this.settings.quality}, 帧率=${this.settings.fps}`);
      
    } catch (error) {
      console.error('应用流约束失败:', error);
      throw error;
    }
  }

  // 获取当前流
  getLocalStream() {
    return this.localStream;
  }

  // 获取共享状态
  getIsSharing() {
    return this.isSharing;
  }

  // 获取设置
  getSettings() {
    return { ...this.settings };
  }

  // 清理资源
  cleanup() {
    this.stopScreenShare();
  }
}

export default ScreenShareManager;