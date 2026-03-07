/**
 * 黄氏家族寻根平台 - Qwen AI 配置管理器
 * 负责管理应用配置和用户设置
 */

export class ConfigManager {
  constructor() {
    this.configKey = 'qwen-user-config';
    this.defaultConfig = {
      model: 'qwen3.5-plus',
      temperature: 0.7,
      maxTokens: 2048,
      historyLength: 10,
      autoScroll: true,
      theme: 'light', // 'light' or 'dark'
      fontSize: 'medium', // 'small', 'medium', 'large'
      enableNotifications: true,
      enableTypingIndicator: true,
      enableMessageTimestamps: true
    };
    
    this.config = { ...this.defaultConfig };
    this.loadConfig();
  }

  /**
   * 加载配置
   */
  loadConfig() {
    try {
      const savedConfig = localStorage.getItem(this.configKey);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        this.config = { ...this.defaultConfig, ...parsed };
        console.log('✓ 已加载用户配置');
      }
    } catch (error) {
      console.warn('加载配置失败，使用默认配置:', error);
      this.config = { ...this.defaultConfig };
    }
  }

  /**
   * 保存配置
   */
  saveConfig() {
    try {
      localStorage.setItem(this.configKey, JSON.stringify(this.config));
      console.log('✓ 配置已保存');
    } catch (error) {
      console.error('保存配置失败:', error);
    }
  }

  /**
   * 获取配置值
   */
  get(key) {
    return this.config[key];
  }

  /**
   * 设置配置值
   */
  set(key, value) {
    this.config[key] = value;
    this.saveConfig();
  }

  /**
   * 批量设置配置
   */
  setBatch(configUpdates) {
    this.config = { ...this.config, ...configUpdates };
    this.saveConfig();
  }

  /**
   * 重置为默认配置
   */
  resetToDefault() {
    this.config = { ...this.defaultConfig };
    this.saveConfig();
  }

  /**
   * 获取所有配置
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * 应用主题设置
   */
  applyTheme() {
    const theme = this.get('theme');
    const fontSize = this.get('fontSize');
    
    document.body.className = `theme-${theme} font-size-${fontSize}`;
    
    // 更新主题相关的CSS变量
    const root = document.documentElement;
    if (theme === 'dark') {
      root.style.setProperty('--bg-color', '#1a1a1a');
      root.style.setProperty('--text-color', '#ffffff');
      root.style.setProperty('--primary-color', '#007acc');
    } else {
      root.style.setProperty('--bg-color', '#ffffff');
      root.style.setProperty('--text-color', '#333333');
      root.style.setProperty('--primary-color', '#007acc');
    }
  }

  /**
   * 初始化配置相关的UI元素
   */
  initializeUI() {
    // 应用主题
    this.applyTheme();
    
    // 设置初始值到UI元素
    const modelSelect = document.getElementById('qwenModelSelect');
    const temperatureSlider = document.getElementById('qwenTemperature');
    const tempValue = document.getElementById('tempValue');
    
    if (modelSelect) modelSelect.value = this.get('model');
    if (temperatureSlider) {
      temperatureSlider.value = this.get('temperature');
      if (tempValue) tempValue.textContent = this.get('temperature');
    }
  }

  /**
   * 绑定配置相关的事件
   */
  bindEvents() {
    // 模型选择变化
    const modelSelect = document.getElementById('qwenModelSelect');
    if (modelSelect) {
      modelSelect.addEventListener('change', (e) => {
        this.set('model', e.target.value);
      });
    }

    // 温度变化
    const temperatureSlider = document.getElementById('qwenTemperature');
    const tempValue = document.getElementById('tempValue');
    if (temperatureSlider && tempValue) {
      temperatureSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        this.set('temperature', value);
        tempValue.textContent = value.toFixed(1);
      });
    }

    // 主题切换
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('change', (e) => {
        this.set('theme', e.target.checked ? 'dark' : 'light');
        this.applyTheme();
      });
    }

    // 字体大小切换
    const fontSizeSelect = document.getElementById('fontSizeSelect');
    if (fontSizeSelect) {
      fontSizeSelect.addEventListener('change', (e) => {
        this.set('fontSize', e.target.value);
        this.applyTheme();
      });
    }
  }
}