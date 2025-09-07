// 设置页面脚本
class SettingsHandler {
  constructor() {
    this.currentConfig = null;
    this.init();
  }

  // 初始化
  async init() {
    await this.loadCurrentConfig();
    this.bindEvents();
    
    // 延迟初始化标签页，确保DOM完全加载
    setTimeout(() => {
      this.initTabs();
      this.loadCollection(); // 加载收藏
    }, 100);
  }

  // 绑定事件监听
  bindEvents() {
    document.getElementById('testApiBtn').addEventListener('click', () => {
      this.testApiConnection();
    });

    document.getElementById('saveApiBtn').addEventListener('click', () => {
      this.saveApiConfig();
    });

    document.getElementById('saveGenerationBtn').addEventListener('click', () => {
      this.saveGenerationSettings();
    });

    document.getElementById('saveInterfaceBtn').addEventListener('click', () => {
      this.saveInterfaceSettings();
    });

    document.getElementById('closeSettingsBtn').addEventListener('click', () => {
      window.close();
    });

    // 绑定模型选择事件
    const modelSelect = document.getElementById('model');
    if (modelSelect) {
      modelSelect.addEventListener('change', () => {
        this.onModelChange();
      });
    }

    

    // 绑定重置按钮事件
    this.bindResetButtons();

    // 收藏管理事件 - 延迟绑定，确保DOM元素存在
    setTimeout(() => {
      const exportBtn = document.getElementById('exportCollectionBtn');
      const clearBtn = document.getElementById('clearCollectionBtn');
      const refreshBtn = document.getElementById('refreshCollectionBtn');
      
      if (exportBtn) {
        exportBtn.addEventListener('click', () => {
          this.exportCollection();
        });
        console.log('✅ 导出收藏按钮事件已绑定');
      } else {
        console.warn('❌ 导出收藏按钮未找到');
      }
      
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          this.showClearCollectionConfirm();
        });
        console.log('✅ 清空收藏按钮事件已绑定');
      } else {
        console.warn('❌ 清空收藏按钮未找到');
      }

      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
          this.refreshCollection();
        });
        console.log('✅ 刷新收藏按钮事件已绑定');
      } else {
        console.warn('❌ 刷新收藏按钮未找到');
      }

      // 添加调试功能
      if (exportBtn && clearBtn && refreshBtn) {
        console.log('✅ 收藏管理功能初始化完成');
      }
    }, 100);
  }

  // 初始化标签页
  initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // 安全检查：确保所有必要的DOM元素都存在
    if (!tabBtns || tabBtns.length === 0) {
      console.warn('标签页按钮未找到，延迟初始化');
      setTimeout(() => this.initTabs(), 200);
      return;
    }

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        
        // 安全检查：确保目标标签页内容存在
        const targetTabContent = document.getElementById(`${targetTab}-tab`);
        if (!targetTabContent) {
          console.error(`目标标签页内容未找到: ${targetTab}-tab`);
          return;
        }
        
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        targetTabContent.classList.add('active');
        
        // 如果切换到收藏管理标签页，重新加载收藏
        if (targetTab === 'collection') {
          this.loadCollection();
        }
      });
    });

    // 默认激活第一个标签页
    if (tabBtns.length > 0) {
      const firstTab = tabBtns[0];
      const firstTabName = firstTab.getAttribute('data-tab');
      if (firstTabName) {
        firstTab.click();
      }
    }
  }

  // 加载当前配置
  async loadCurrentConfig() {
    try {
      // 首先检查background script是否可用
      await this.waitForBackgroundScript();
      
      const response = await chrome.runtime.sendMessage({
        action: 'getApiConfig'
      });

      if (response && response.success) {
        this.currentConfig = response.config;
        this.populateFormFields();
      } else {
        console.warn('获取配置失败:', response);
        // 使用默认配置
        this.currentConfig = {
          baseUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/generation',
          apiKey: 'your_alibaba_api_key_here',
          model: 'wan2.2-t2i-flash',
          defaultParams: {
            n: 1,
            size: '1024*1024',
            style: 'photographic',
            quality: 'standard'
          },
          interfaceSettings: {
            toolbarPosition: 'auto',
            autoHideToolbar: true,
            showNotifications: true,
            enableKeyboardShortcuts: false
          }
        };
        this.populateFormFields();
      }
    } catch (error) {
      console.error('加载配置失败:', error);
      // 使用默认配置
      this.currentConfig = {
        baseUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/generation',
        apiKey: 'your_alibaba_api_key_here',
        model: 'wan2.2-t2i-flash',
        defaultParams: {
          n: 1,
          size: '1024*1024',
          style: 'photographic',
          quality: 'standard'
        },
        interfaceSettings: {
          toolbarPosition: 'auto',
          autoHideToolbar: true,
          showNotifications: true,
          enableKeyboardShortcuts: false
        }
      };
      this.populateFormFields();
    }
  }

  // 绑定重置按钮事件
  bindResetButtons() {
    // API配置重置按钮
    const resetApiBtn = document.getElementById('resetApiBtn');
    if (resetApiBtn) {
      resetApiBtn.addEventListener('click', () => {
        this.showResetConfirm('api', 'API配置');
      });
    }

    // 生成设置重置按钮
    const resetGenerationBtn = document.getElementById('resetGenerationBtn');
    if (resetGenerationBtn) {
      resetGenerationBtn.addEventListener('click', () => {
        this.showResetConfirm('generation', '生成设置');
      });
    }

    // 界面设置重置按钮
    const resetInterfaceBtn = document.getElementById('resetInterfaceBtn');
    if (resetInterfaceBtn) {
      resetInterfaceBtn.addEventListener('click', () => {
        this.showResetConfirm('interface', '界面设置');
      });
    }
  }

  // 显示重置确认弹窗
  showResetConfirm(type, title) {
    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    modal.innerHTML = `
      <div class="confirm-modal-content">
        <div class="confirm-modal-title">⚠️ 确认重置${title}</div>
        <div class="confirm-modal-message">
          此操作将重置${title}为初始状态，无法恢复。<br>
          确定要继续吗？
        </div>
        <div class="confirm-modal-buttons">
          <button class="btn-cancel">取消</button>
          <button class="btn-confirm">确认重置</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // 绑定事件
    modal.querySelector('.btn-cancel').addEventListener('click', () => {
      modal.remove();
    });
    
    modal.querySelector('.btn-confirm').addEventListener('click', async () => {
      await this.resetSettings(type);
      modal.remove();
    });
    
    // 点击背景关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // 重置设置
  async resetSettings(type) {
    try {
      switch (type) {
        case 'api':
          await this.resetApiSettings();
          break;
        case 'generation':
          await this.resetGenerationSettings();
          break;
        case 'interface':
          await this.resetInterfaceSettings();
          break;
      }
      this.showNotification(`${type === 'api' ? 'API配置' : type === 'generation' ? '生成设置' : '界面设置'}已重置为初始状态`, 'success');
    } catch (error) {
      console.error('重置设置失败:', error);
      this.showNotification('重置失败: ' + error.message, 'error');
    }
  }

  // 重置API设置
  async resetApiSettings() {
    const defaultApiConfig = {
      baseUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/generation',
      apiKey: 'your_alibaba_api_key_here',
      model: 'wan2.2-t2i-flash'
    };

    // 更新本地配置
    this.currentConfig = { ...this.currentConfig, ...defaultApiConfig };
    
    // 填充表单字段
    this.populateFormFields();
    
    // 发送到background script
    await chrome.runtime.sendMessage({
      action: 'updateApiConfig',
      config: defaultApiConfig
    });
  }

  // 重置生成设置
  async resetGenerationSettings() {
    const defaultGenerationParams = {
      size: '1024*1024',
      style: 'photographic',
      quality: 'standard',
      n: 1
    };

    // 更新本地配置
    this.currentConfig = { 
      ...this.currentConfig, 
      defaultParams: defaultGenerationParams 
    };
    
    // 填充表单字段
    this.populateFormFields();
    
    // 发送到background script
    await chrome.runtime.sendMessage({
      action: 'updateApiConfig',
      config: { defaultParams: defaultGenerationParams }
    });
  }

  // 重置界面设置
  async resetInterfaceSettings() {
    const defaultInterfaceSettings = {
      toolbarPosition: 'auto',
      enableKeyboardShortcuts: false
    };

    // 更新本地配置
    this.currentConfig = { 
      ...this.currentConfig, 
      interfaceSettings: defaultInterfaceSettings 
    };
    
    // 填充表单字段
    this.populateFormFields();
    
    // 保存到chrome.storage.local
    await chrome.storage.local.set({ interfaceSettings: defaultInterfaceSettings });
    
    // 发送到background script
    try {
      await chrome.runtime.sendMessage({
        action: 'updateApiConfig',
        config: { interfaceSettings: defaultInterfaceSettings }
      });
    } catch (error) {
      console.log('发送界面设置到background script失败:', error);
    }
  }

  // 刷新收藏
  async refreshCollection() {
    try {
      await this.loadCollection();
      this.showNotification('收藏已刷新', 'success');
    } catch (error) {
      console.error('刷新收藏失败:', error);
      this.showNotification('刷新失败: ' + error.message, 'error');
    }
  }



  // 模型选择变化处理
  async onModelChange() {
    try {
      const modelSelect = document.getElementById('model');
      const newModel = modelSelect.value;
      
      console.log('模型选择变化:', newModel);
      
      // 更新本地配置
      this.currentConfig = { ...this.currentConfig, model: newModel };
      
      // 自动保存配置
      await this.saveApiConfig();
      
      // 确保配置已更新到 background.js
      console.log('模型切换完成，当前配置:', this.currentConfig);
      
      this.showNotification(`模型已切换到: ${newModel}`, 'success');
      
      // 强制刷新配置以确保更新生效
      setTimeout(async () => {
        try {
          const response = await chrome.runtime.sendMessage({
            action: 'getApiConfig'
          });
          if (response && response.success) {
            console.log('验证模型切换后的配置:', response.config);
            
            // 更新模型选择器的显示状态
            if (modelSelect) {
              modelSelect.style.borderColor = '#4CAF50';
              modelSelect.style.backgroundColor = '#f0f9ff';
              setTimeout(() => {
                modelSelect.style.borderColor = '';
                modelSelect.style.backgroundColor = '';
              }, 2000);
            }
          }
        } catch (error) {
          console.log('验证配置失败:', error);
        }
      }, 100);
      
    } catch (error) {
      console.error('模型切换失败:', error);
      this.showNotification('模型切换失败: ' + error.message, 'error');
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

  // 填充表单字段
  populateFormFields() {
    if (!this.currentConfig) return;

    const apiKeyInput = document.getElementById('apiKey');
    const apiUrlInput = document.getElementById('apiUrl');
    const modelSelect = document.getElementById('model');

    if (apiKeyInput) apiKeyInput.value = this.currentConfig.apiKey || '';
    if (apiUrlInput) apiUrlInput.value = this.currentConfig.baseUrl || '';
    if (modelSelect) modelSelect.value = this.currentConfig.model || 'wan2.2-t2i-flash';

    // 填充生成设置字段
    const imageSizeSelect = document.getElementById('imageSize');
    const imageStyleSelect = document.getElementById('imageStyle');
    const imageQualitySelect = document.getElementById('imageQuality');
    const imageCountInput = document.getElementById('imageCount');

    // 确保defaultParams存在
    const defaultParams = this.currentConfig.defaultParams || {
      size: '1024*1024',
      style: 'photographic',
      quality: 'standard',
      n: 1
    };

    if (imageSizeSelect) {
      imageSizeSelect.value = defaultParams.size || '1024*1024';
    }
    if (imageStyleSelect) {
      imageStyleSelect.value = defaultParams.style || 'photographic';
    }
    if (imageQualitySelect) {
      imageQualitySelect.value = defaultParams.quality || 'standard';
    }
    if (imageCountInput) {
      imageCountInput.value = defaultParams.n || 1;
    }

    // 填充界面设置字段
    const toolbarPositionSelect = document.getElementById('toolbarPosition');
    const enableKeyboardShortcutsCheckbox = document.getElementById('enableKeyboardShortcuts');

    // 确保interfaceSettings存在
    const interfaceSettings = this.currentConfig.interfaceSettings || {
      toolbarPosition: 'auto',
      enableKeyboardShortcuts: false
    };

    if (toolbarPositionSelect) {
      toolbarPositionSelect.value = interfaceSettings.toolbarPosition || 'auto';
    }
    if (enableKeyboardShortcutsCheckbox) {
      enableKeyboardShortcutsCheckbox.checked = interfaceSettings.enableKeyboardShortcuts === true;
    }

    console.log('表单字段已填充:', {
      size: defaultParams.size,
      style: defaultParams.style,
      quality: defaultParams.quality,
      n: defaultParams.n,
      interfaceSettings: interfaceSettings
    });
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

      const apiKey = document.getElementById('apiKey').value;

      if (!apiKey || apiKey === 'your_alibaba_api_key_here') {
        this.showNotification('请先输入API密钥', 'error');
        this.updateTestButton(testBtn, 'error', originalText);
        return;
      }

      // 先保存当前的API配置
      await this.saveApiConfig();

      // 发送测试请求
      const response = await chrome.runtime.sendMessage({
        action: 'testApiConnection',
        text: '一只可爱的小猫'
      });

      if (response && response.success) {
        this.showNotification('API连接测试成功！', 'success');
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

  // 保存API配置
  async saveApiConfig() {
    try {
      const apiKey = document.getElementById('apiKey').value;
      const apiUrl = document.getElementById('apiUrl').value;
      const model = document.getElementById('model').value;

      // 构建完整配置，保留现有的其他配置
      const config = {
        apiKey: apiKey,
        baseUrl: apiUrl,
        model: model,
        // 保留现有的 defaultParams 和 interfaceSettings
        defaultParams: this.currentConfig?.defaultParams || {
          n: 1,
          size: '1024*1024',
          style: 'photographic',
          quality: 'standard'
        },
        interfaceSettings: this.currentConfig?.interfaceSettings || {
          toolbarPosition: 'auto',
          enableKeyboardShortcuts: false
        }
      };

      console.log('保存API配置:', config);

      // 确保background script可用
      await this.waitForBackgroundScript();

      const response = await chrome.runtime.sendMessage({
        action: 'updateApiConfig',
        config: config
      });

      if (response && response.success) {
        this.showNotification('API配置已保存', 'success');
        this.currentConfig = { ...this.currentConfig, ...config };
        console.log('API配置保存成功，当前配置:', this.currentConfig);
        
        // 通知其他页面配置已更新
        try {
          chrome.runtime.sendMessage({
            action: 'configUpdated',
            config: this.currentConfig
          });
        } catch (error) {
          console.log('发送配置更新通知失败:', error);
        }
      } else {
        throw new Error('保存配置失败');
      }
    } catch (error) {
      console.error('保存API配置失败:', error);
      this.showNotification('保存失败: ' + error.message, 'error');
    }
  }

  // 保存生成设置
  async saveGenerationSettings() {
    try {
      const imageSize = document.getElementById('imageSize').value;
      const imageStyle = document.getElementById('imageStyle').value;
      const imageQuality = document.getElementById('imageQuality').value;
      const imageCount = parseInt(document.getElementById('imageCount').value);

      // 验证输入值
      if (!imageSize || !imageStyle || !imageQuality || isNaN(imageCount)) {
        this.showNotification('请填写所有必需的字段', 'error');
        return;
      }

      if (imageCount < 1 || imageCount > 4) {
        this.showNotification('生成数量必须在1-4之间', 'error');
        return;
      }

      const defaultParams = {
        size: imageSize,
        style: imageStyle,
        quality: imageQuality,
        n: imageCount
      };

      console.log('保存生成设置:', defaultParams);

      // 发送配置更新请求
      const response = await chrome.runtime.sendMessage({
        action: 'updateApiConfig',
        config: { defaultParams: defaultParams }
      });

      if (response && response.success) {
        // 更新本地配置
        this.currentConfig = { 
          ...this.currentConfig, 
          defaultParams: defaultParams 
        };
        
        this.showNotification('生成设置已保存并立即生效', 'success');
        
        // 可选：显示当前配置状态
        console.log('当前配置已更新:', this.currentConfig);
        
        // 通知其他页面配置已更新
        try {
          chrome.runtime.sendMessage({
            action: 'configUpdated',
            config: this.currentConfig
          });
        } catch (error) {
          console.log('发送配置更新通知失败:', error);
        }
      } else {
        throw new Error('保存配置失败');
      }
    } catch (error) {
      console.error('保存生成设置失败:', error);
      this.showNotification('保存失败: ' + error.message, 'error');
    }
  }

  // 保存界面设置
  async saveInterfaceSettings() {
    try {
      const toolbarPosition = document.getElementById('toolbarPosition').value;
      const enableKeyboardShortcuts = document.getElementById('enableKeyboardShortcuts').checked;

      const interfaceSettings = {
        toolbarPosition: toolbarPosition,
        enableKeyboardShortcuts: enableKeyboardShortcuts
      };

      // 保存到chrome.storage.local
      await chrome.storage.local.set({ interfaceSettings: interfaceSettings });

      // 更新本地配置
      this.currentConfig = { ...this.currentConfig, interfaceSettings: interfaceSettings };

      // 发送配置更新请求到background script
      try {
        await chrome.runtime.sendMessage({
          action: 'updateApiConfig',
          config: { interfaceSettings: interfaceSettings }
        });
      } catch (error) {
        console.log('发送界面设置到background script失败:', error);
      }

      this.showNotification('界面设置已保存并立即生效', 'success');
      
      // 通知其他页面配置已更新
      try {
        chrome.runtime.sendMessage({
          action: 'configUpdated',
          config: this.currentConfig
        });
      } catch (error) {
        console.log('发送配置更新通知失败:', error);
      }

      console.log('界面设置已保存:', interfaceSettings);
    } catch (error) {
      console.error('保存界面设置失败:', error);
      this.showNotification('保存失败: ' + error.message, 'error');
    }
  }

  // 显示通知
  showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `settings-notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  // 调试函数：检查收藏管理功能
  debugCollectionManagement() {
    console.log('=== 收藏管理调试信息 ===');
    
    // 检查DOM元素
    const elements = {
      exportBtn: document.getElementById('exportCollectionBtn'),
      clearBtn: document.getElementById('clearCollectionBtn'),
      collectionStatus: document.getElementById('collectionStatus'),
      collectionList: document.getElementById('collectionList'),
      collectionCount: document.getElementById('collectionCount'),
      collectionItems: document.getElementById('collectionItems')
    };
    
    console.log('DOM元素状态:', elements);
    
    // 检查收藏数据
    chrome.storage.local.get(['favorites'], (result) => {
      const favorites = result.favorites || [];
      console.log('当前收藏数量:', favorites.length);
      console.log('收藏数据:', favorites);
    });
    
    console.log('========================');
  }

  // 加载收藏
  async loadCollection() {
    try {
      const result = await chrome.storage.local.get(['favorites']);
      const favorites = result.favorites || [];
      this.updateCollectionDisplay(favorites);
    } catch (error) {
      console.error('加载收藏失败:', error);
    }
  }

  // 更新收藏显示
  updateCollectionDisplay(favorites) {
    const collectionStatus = document.getElementById('collectionStatus');
    const collectionList = document.getElementById('collectionList');
    const collectionCount = document.getElementById('collectionCount');
    const collectionItems = document.getElementById('collectionItems');

    // 安全检查：确保所有必要的DOM元素都存在
    if (!collectionStatus || !collectionList || !collectionCount || !collectionItems) {
      console.warn('收藏显示元素未找到，延迟更新');
      setTimeout(() => this.updateCollectionDisplay(favorites), 200);
      return;
    }

    if (favorites.length === 0) {
      collectionStatus.style.display = 'block';
      collectionList.style.display = 'none';
    } else {
      collectionStatus.style.display = 'none';
      collectionList.style.display = 'block';
      collectionCount.textContent = favorites.length;
      
      // 清空现有项目
      collectionItems.innerHTML = '';
      
      // 按时间倒序排列
      const sortedFavorites = favorites.sort((a, b) => b.timestamp - a.timestamp);
      
      // 生成收藏项目
      sortedFavorites.forEach(favorite => {
        const itemElement = this.createCollectionItem(favorite);
        collectionItems.appendChild(itemElement);
      });
      
      // 添加事件委托处理按钮点击
      this.bindCollectionItemEvents();
    }
  }
  
  // 绑定收藏项目的事件
  bindCollectionItemEvents() {
    const collectionItems = document.getElementById('collectionItems');
    if (!collectionItems) return;
    
    // 使用事件委托处理按钮点击
    collectionItems.addEventListener('click', (event) => {
      const target = event.target;
      
      // 处理查看原页面按钮
      if (target.closest('.view-original-btn')) {
        const button = target.closest('.view-original-btn');
        const url = button.dataset.url;
        if (url) {
          console.log('打开原页面:', url);
          window.open(url, '_blank');
        }
      }
      
      // 处理删除按钮
      if (target.closest('.delete-btn')) {
        const button = target.closest('.delete-btn');
        const id = button.dataset.id;
        if (id) {
          console.log('删除收藏项目:', id);
          this.removeCollectionItem(id);
        }
      }
      
      // 处理图片点击（在新标签页打开）
      if (target.classList.contains('clickable-image')) {
        const url = target.src;
        if (url) {
          console.log('打开图片:', url);
          window.open(url, '_blank');
        }
      }
    });
  }

  // 创建收藏项目元素
  createCollectionItem(favorite) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'collection-item';
    itemDiv.dataset.favoriteId = favorite.id; // 添加数据属性用于标识
    
    const timeStr = new Date(favorite.timestamp).toLocaleString('zh-CN');
    const isGeneratedContent = favorite.type === 'generated_content';
    
    let contentHtml = `
      <div class="collection-item-header">
        <div>
          <div class="collection-item-title">${favorite.title || '未知页面'}</div>
          <div class="collection-item-time">${timeStr}</div>
          ${isGeneratedContent ? '<div class="collection-item-type">🎨 生成内容</div>' : ''}
        </div>
      </div>
      <div class="collection-item-text">
        ${isGeneratedContent ? '<strong>生成内容提示词：</strong>' : ''}${favorite.text}
      </div>
    `;
    
    // 如果是生成的内容，显示图片预览和实际提示词
    if (isGeneratedContent && favorite.imageUrls && favorite.imageUrls.length > 0) {
      contentHtml += `
        <div class="collection-item-images">
          <div class="images-header">生成的图片 (${favorite.imageCount || favorite.imageUrls.length}张)</div>
          ${favorite.actualPrompt ? `<div class="actual-prompt-display"><strong>实际提示词：</strong>${favorite.actualPrompt}</div>` : ''}
          <div class="images-grid">
            ${favorite.imageUrls.slice(0, 3).map((url, index) => `
              <div class="image-preview">
                <img src="${url}" alt="图片${index + 1}" class="clickable-image">
                ${index === 2 && favorite.imageUrls.length > 3 ? `<div class="more-images">+${favorite.imageUrls.length - 3}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    contentHtml += `
      <div class="collection-item-actions">
        <button class="btn secondary view-original-btn" data-url="${favorite.url}">
          <span class="icon">🔗</span>
          查看原页面
        </button>
        <button class="btn danger delete-btn" data-id="${favorite.id}">
          <span class="icon">🗑️</span>
          删除
        </button>
      </div>
    `;
    
    itemDiv.innerHTML = contentHtml;
    
    return itemDiv;
  }

  // 删除单个收藏项目
  async removeCollectionItem(id) {
    try {
      const result = await chrome.storage.local.get(['favorites']);
      let favorites = result.favorites || [];
      
      favorites = favorites.filter(fav => fav.id !== id);
      
      await chrome.storage.local.set({ favorites: favorites });
      this.updateCollectionDisplay(favorites);
      this.showNotification('收藏已删除', 'success');
    } catch (error) {
      console.error('删除收藏失败:', error);
      this.showNotification('删除失败: ' + error.message, 'error');
    }
  }

  // 显示清空收藏确认弹窗
  showClearCollectionConfirm() {
    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    modal.innerHTML = `
      <div class="confirm-modal-content">
        <div class="confirm-modal-title">⚠️ 确认清空收藏</div>
        <div class="confirm-modal-message">
          此操作将永久删除所有收藏内容，无法恢复。<br>
          确定要继续吗？
        </div>
        <div class="confirm-modal-buttons">
          <button class="btn-cancel">取消</button>
          <button class="btn-confirm">确认清空</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // 绑定事件
    modal.querySelector('.btn-cancel').addEventListener('click', () => {
      modal.remove();
    });
    
    modal.querySelector('.btn-confirm').addEventListener('click', async () => {
      await this.clearCollection();
      modal.remove();
    });
    
    // 点击背景关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // 清空收藏
  async clearCollection() {
    try {
      await chrome.storage.local.set({ favorites: [] });
      this.updateCollectionDisplay([]);
      this.showNotification('所有收藏已清空', 'success');
    } catch (error) {
      console.error('清空收藏失败:', error);
      this.showNotification('清空失败: ' + error.message, 'error');
    }
  }

  // 导出收藏
  async exportCollection() {
    try {
      const result = await chrome.storage.local.get(['favorites']);
      const favorites = result.favorites || [];
      
      if (favorites.length === 0) {
        this.showNotification('暂无收藏内容可导出', 'error');
        return;
      }
      
      // 创建PDF内容
      const pdfContent = this.createPDFContent(favorites);
      
      // 生成并下载PDF
      this.downloadPDF(pdfContent, '收藏管理_' + new Date().toISOString().split('T')[0]);
      
      this.showNotification('收藏已导出为PDF', 'success');
    } catch (error) {
      console.error('导出收藏失败:', error);
      this.showNotification('导出失败: ' + error.message, 'error');
    }
  }

  // 创建PDF内容
  createPDFContent(favorites) {
    const sortedFavorites = favorites.sort((a, b) => b.timestamp - a.timestamp);
    
    let content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>收藏管理</title>
                 <style>
           body { font-family: 'Microsoft YaHei', Arial, sans-serif; margin: 40px; }
           .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
           .favorite-item { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
           .favorite-header { display: flex; justify-content: space-between; margin-bottom: 15px; }
           .favorite-title { font-weight: bold; color: #333; }
           .favorite-time { color: #666; font-size: 14px; }
           .favorite-type { color: #667eea; font-size: 12px; font-weight: 500; margin-top: 5px; }
           .favorite-text { background: #f9f9f9; padding: 15px; border-radius: 6px; border-left: 4px solid #667eea; }
           .favorite-title-link { color: #333; text-decoration: none; font-weight: bold; }
           .favorite-title-link:hover { color: #667eea; text-decoration: underline; }
           .favorite-images { margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 6px; border: 1px solid #e9ecef; }
           .images-header { font-size: 14px; font-weight: 500; color: #495057; margin-bottom: 10px; }
           .actual-prompt-display { background: #e3f2fd; padding: 10px; border-radius: 6px; border-left: 3px solid #2196f3; margin: 10px 0; font-size: 14px; }
           .image-display { margin-top: 15px; }
           .exported-image { margin: 20px 0; text-align: center; }
           .image-title { font-weight: bold; color: #333; margin-bottom: 10px; font-size: 16px; }
           .exported-image-content { max-width: 100%; max-height: 400px; border-radius: 8px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1); }
           .page-break { page-break-before: always; }
         </style>
      </head>
      <body>
        <div class="header">
          <h1>收藏管理</h1>
          <p>导出时间: ${new Date().toLocaleString('zh-CN')}</p>
          <p>总计: ${favorites.length} 条收藏</p>
        </div>
    `;
    
    sortedFavorites.forEach((favorite, index) => {
      if (index > 0) {
        content += '<div class="page-break"></div>';
      }
      
      const timeStr = new Date(favorite.timestamp).toLocaleString('zh-CN');
      const isGeneratedContent = favorite.type === 'generated_content';
      
             content += `
         <div class="favorite-item">
           <div class="favorite-header">
             <div>
               <div class="favorite-title">
                 <a href="${favorite.url}" class="favorite-title-link">${favorite.title || '未知页面'}</a>
               </div>
               <div class="favorite-time">${timeStr}</div>
               ${isGeneratedContent ? '<div class="favorite-type">🎨 生成内容</div>' : ''}
             </div>
           </div>
           <div class="favorite-text">
             ${isGeneratedContent ? '<strong>生成内容提示词：</strong>' : ''}${favorite.text}
           </div>
       `;
      
             // 如果是生成的内容，显示图片和实际提示词
       if (isGeneratedContent && favorite.imageUrls && favorite.imageUrls.length > 0) {
         content += `
           <div class="favorite-images">
             <div class="images-header">生成的图片 (${favorite.imageCount || favorite.imageUrls.length}张)</div>
             ${favorite.actualPrompt ? `<div class="actual-prompt-display"><strong>实际提示词：</strong>${favorite.actualPrompt}</div>` : ''}
             <div class="image-display">
               ${favorite.imageUrls.map((url, imgIndex) => `
                 <div class="exported-image">
                   <div class="image-title">图片${imgIndex + 1}</div>
                   <img src="${url}" alt="图片${imgIndex + 1}" class="exported-image-content">
                 </div>
               `).join('')}
             </div>
           </div>
         `;
       }
      
      content += `
        </div>
      `;
    });
    
    content += `
      </body>
      </html>
    `;
    
    return content;
  }

  // 下载PDF
  downloadPDF(content, filename) {
    // 使用html2pdf.js库生成PDF
    // 如果没有这个库，则直接下载HTML文件
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename + '.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }
}

// 初始化设置处理器
const settingsHandler = new SettingsHandler();
