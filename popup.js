// 弹出窗口脚本 - 处理用户交互和状态显示
class PopupHandler {
  constructor() {
    this.init();
  }

  // 初始化
  async init() {
    // 加载API配置和状态
    await this.loadApiStatus();
    
    // 绑定事件监听
    this.bindEvents();
    
    // 加载最近生成记录
    this.loadRecentGenerations();
  }

  // 绑定事件监听
  bindEvents() {
    // 测试API连接按钮
    document.getElementById('testApiBtn').addEventListener('click', () => {
      this.testApiConnection();
    });

    // 打开设置按钮
    document.getElementById('openSettingsBtn').addEventListener('click', () => {
      this.openSettings();
    });

    // 收藏管理按钮
    const collectionManageBtn = document.getElementById('collectionManageBtn');
    if (collectionManageBtn) {
      collectionManageBtn.addEventListener('click', () => {
        this.openCollectionManagement();
      });
    }
  }

  // 加载API状态
  async loadApiStatus() {
    try {
      // 等待background script准备就绪
      await this.waitForBackgroundScript();
      
      const response = await chrome.runtime.sendMessage({
        action: 'getApiConfig'
      });

      if (response && response.success) {
        this.updateApiStatus(response.config);
      } else {
        this.updateApiStatus(null);
      }
    } catch (error) {
      console.error('加载API状态失败:', error);
      this.updateApiStatus(null);
    }
  }

  // 等待background script准备就绪
  async waitForBackgroundScript() {
    const maxAttempts = 10;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const response = await chrome.runtime.sendMessage({ action: 'ping' });
        if (response && response.success) {
          console.log('Background script 已就绪');
          return;
        }
      } catch (error) {
        console.log(`等待background script... 尝试 ${attempts + 1}/${maxAttempts}`);
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 100)); // 等待100ms
    }
    
    throw new Error('Background script 初始化超时');
  }

  // 更新API状态显示
  updateApiStatus(config) {
    const apiKeyStatus = document.getElementById('apiKeyStatus');
    const modelStatus = document.getElementById('modelStatus');
    const sizeStatus = document.getElementById('sizeStatus');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusDot = statusIndicator.querySelector('.status-dot');
    const statusText = statusIndicator.querySelector('.status-text');

    if (config && config.apiKey && config.apiKey !== 'your_alibaba_api_key_here') {
      // API已配置
      apiKeyStatus.textContent = '已配置';
      apiKeyStatus.style.color = '#4caf50';
      modelStatus.textContent = config.model || 'wan2.2-t2i-flash';
      sizeStatus.textContent = config.defaultParams?.size || '1024*1024';
      
      statusDot.style.background = '#4caf50';
      statusText.textContent = '已就绪';
    } else {
      // API未配置
      apiKeyStatus.textContent = '未配置';
      apiKeyStatus.style.color = '#f44336';
      modelStatus.textContent = 'wan2.2-t2i-flash';
      sizeStatus.textContent = '1024*1024';
      
      statusDot.style.background = '#f44336';
      statusText.textContent = '需要配置';
    }
  }

  // 测试API连接
  async testApiConnection() {
    const testBtn = document.getElementById('testApiBtn');
    const originalText = testBtn.innerHTML;
    
    try {
      // 更新按钮状态为测试中
      testBtn.innerHTML = '<span class="icon">⏳</span>测试中...';
      testBtn.disabled = true;
      testBtn.style.background = '#ff9800';

      // 等待background script准备就绪
      await this.waitForBackgroundScript();

      // 发送测试请求
      const response = await chrome.runtime.sendMessage({
        action: 'testApiConnection',
        text: '一只可爱的小猫'
      });

      if (response && response.success) {
        this.showNotification('API连接测试成功！', 'success');
        this.updateApiStatus({ apiKey: 'configured' }); // 更新状态
        this.updateTestButton(testBtn, 'success', originalText);
      } else {
        const errorMsg = response?.error || '未知错误';
        this.showNotification('API连接测试失败: ' + errorMsg, 'error');
        this.updateTestButton(testBtn, 'error', originalText);
      }
    } catch (error) {
      console.error('API测试失败:', error);
      this.showNotification('API连接测试失败: ' + error.message, 'error');
      this.updateTestButton(testBtn, 'error', originalText);
    }
  }

  // 更新测试按钮状态
  updateTestButton(button, status, originalText) {
    if (status === 'success') {
      button.innerHTML = '<span class="icon">✅</span>测试成功';
      button.style.background = '#4caf50';
      // 3秒后恢复原始状态
      setTimeout(() => {
        button.innerHTML = originalText;
        button.style.background = '';
        button.disabled = false;
      }, 3000);
    } else if (status === 'error') {
      button.innerHTML = '<span class="icon">❌</span>测试失败';
      button.style.background = '#f44336';
      // 3秒后恢复原始状态
      setTimeout(() => {
        button.innerHTML = originalText;
        button.style.background = '';
        button.disabled = false;
      }, 3000);
    }
  }

  // 打开设置页面
  openSettings() {
    // 创建新标签页打开设置
    chrome.tabs.create({
      url: chrome.runtime.getURL('settings.html')
    });
  }

  // 打开收藏管理页面
  openCollectionManagement() {
    // 创建新标签页打开设置页面的收藏管理标签
    chrome.tabs.create({
      url: chrome.runtime.getURL('settings.html#collection')
    });
  }

  // 查看生成记录详情
  async viewGeneration(id) {
    try {
      // 获取生成记录详情
      const result = await chrome.storage.local.get(['favorites']);
      const favorites = result.favorites || [];
      const generation = favorites.find(item => item.id === id);
      
      if (generation) {
        // 关闭弹出窗口
        window.close();
        
        // 发送消息给当前标签页，显示图片模态框
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (tab) {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'showGenerationModal',
            generation: generation
          });
        }
      }
    } catch (error) {
      console.error('查看生成记录失败:', error);
    }
  }

  // 加载最近生成记录
  async loadRecentGenerations() {
    try {
      // 从收藏数据中获取生成内容类型的记录
      const result = await chrome.storage.local.get(['favorites']);
      const favorites = result.favorites || [];
      
      // 筛选出生成内容类型的收藏
      const generatedContent = favorites.filter(item => item.type === 'generated_content');
      
      // 按时间排序，取最近5条
      const recentGenerations = generatedContent
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5);
      
      this.displayRecentGenerations(recentGenerations);
    } catch (error) {
      console.error('加载最近生成记录失败:', error);
    }
  }

  // 显示最近生成记录
  displayRecentGenerations(generations) {
    const emptyState = document.getElementById('emptyState');
    const generationsList = document.getElementById('generationsList');
    
    if (generations.length === 0) {
      emptyState.style.display = 'flex';
      generationsList.style.display = 'none';
      return;
    }

    // 隐藏空状态，显示生成记录列表
    emptyState.style.display = 'none';
    generationsList.style.display = 'block';

    // 只显示最近5条记录
    const recentItems = generations.slice(-5).reverse();
    
    generationsList.innerHTML = recentItems.map(item => `
      <div class="generation-item" onclick="popupHandler.viewGeneration('${item.id}')">
        <div class="generation-item-header">
          <div class="generation-title">${this.truncateText(item.title || '生成内容', 25)}</div>
          <div class="generation-time">${this.formatTime(item.timestamp)}</div>
        </div>
        <div class="generation-prompt">${this.truncateText(item.text || item.prompt || '无提示词', 40)}</div>
        ${item.imageUrls && item.imageUrls.length > 0 ? `
          <div class="generation-images">
            ${item.imageUrls.slice(0, 3).map(url => `
              <img src="${url}" alt="预览" class="generation-image-preview">
            `).join('')}
            ${item.imageUrls.length > 3 ? `<div class="more-images">+${item.imageUrls.length - 3}</div>` : ''}
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  // 截断文本
  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  // 格式化时间
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // 1分钟内
      return '刚刚';
    } else if (diff < 3600000) { // 1小时内
      return Math.floor(diff / 60000) + '分钟前';
    } else if (diff < 86400000) { // 1天内
      return Math.floor(diff / 3600000) + '小时前';
    } else {
      return date.toLocaleDateString();
    }
  }



  // 显示通知
  showNotification(message, type) {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `popup-notification ${type}`;
    notification.textContent = message;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 3秒后自动移除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
}

// 初始化弹出窗口处理器
const popupHandler = new PopupHandler();
