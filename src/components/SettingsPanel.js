import React from 'react';
import './SettingsPanel.css';

const SettingsPanel = ({ settings, onChange, disabled = false }) => {
  const handleChange = (key, value) => {
    onChange({ [key]: value });
  };

  return (
    <div className="settings-panel">
      <h3>
        <i className="fas fa-sliders-h"></i>
        推流设置
      </h3>

      <div className="settings-content">
        <div className="setting-group">
          <label className="setting-label">
            <i className="fas fa-tv"></i>
            视频质量
          </label>
          <select
            value={settings.quality}
            onChange={(e) => handleChange('quality', e.target.value)}
            disabled={disabled}
            className="crystal-select"
          >
            <option value="low">标清 (480p)</option>
            <option value="medium">高清 (720p)</option>
            <option value="high">全高清 (1080p)</option>
            <option value="ultra">2K (1440p)</option>
            <option value="4k">4K (2160p)</option>
          </select>
        </div>

        <div className="setting-group">
          <label className="setting-label">
            <i className="fas fa-film"></i>
            帧率
          </label>
          <select
            value={settings.fps}
            onChange={(e) => handleChange('fps', parseInt(e.target.value))}
            disabled={disabled}
            className="crystal-select"
          >
            <option value={15}>15 fps (省电)</option>
            <option value={24}>24 fps (电影)</option>
            <option value={30}>30 fps (标准)</option>
            <option value={60}>60 fps (流畅)</option>
            <option value={90}>90 fps (高刷)</option>
            <option value={120}>120 fps (电竞)</option>
            <option value={144}>144 fps (竞技)</option>
          </select>
        </div>

        <div className="setting-group">
          <label className="setting-label">
            <i className="fas fa-compress"></i>
            编码器
          </label>
          <select
            value={settings.codec}
            onChange={(e) => handleChange('codec', e.target.value)}
            disabled={disabled}
            className="crystal-select"
          >
            <option value="auto">自动选择</option>
            <option value="h264">H.264</option>
            <option value="vp8">VP8</option>
            <option value="vp9">VP9</option>
            <option value="av1">AV1</option>
          </select>
        </div>

        <div className="setting-group">
          <label className="setting-label">
            <i className="fas fa-tachometer-alt"></i>
            码率: {settings.bitrate} Mbps
          </label>
          <div className="slider-container">
            <input
              type="range"
              min="1"
              max="20"
              step="0.5"
              value={settings.bitrate}
              onChange={(e) => handleChange('bitrate', parseFloat(e.target.value))}
              disabled={disabled}
              className="crystal-slider"
            />
            <div className="slider-marks">
              <span>1M</span>
              <span>10M</span>
              <span>20M</span>
            </div>
          </div>
        </div>

        <div className="setting-group">
          <label className="setting-label">
            <i className="fas fa-microphone"></i>
            音频设置
          </label>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.audioEnabled}
                onChange={(e) => handleChange('audioEnabled', e.target.checked)}
                disabled={disabled}
              />
              <span>启用音频</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.echoCancellation}
                onChange={(e) => handleChange('echoCancellation', e.target.checked)}
                disabled={disabled || !settings.audioEnabled}
              />
              <span>回声消除</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.noiseSuppression}
                onChange={(e) => handleChange('noiseSuppression', e.target.checked)}
                disabled={disabled || !settings.audioEnabled}
              />
              <span>噪音抑制</span>
            </label>
          </div>
        </div>

        <div className="setting-group">
          <label className="setting-label">
            <i className="fas fa-network-wired"></i>
            WebRTC 配置
          </label>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.hardwareAccel}
                onChange={(e) => handleChange('hardwareAccel', e.target.checked)}
                disabled={disabled}
              />
              <span>硬件加速</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.adaptiveBitrate}
                onChange={(e) => handleChange('adaptiveBitrate', e.target.checked)}
                disabled={disabled}
              />
              <span>自适应码率</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;