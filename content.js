// 内容脚本 - 处理页面文本选择和浮动工具栏
class TextSelectionHandler {
  constructor() {
    this.toolbar = null;
    this.selectedText = '';
    this.isToolbarVisible = false;
    this.lastSelectionTime = 0;
    this.interfaceSettings = {
      toolbarPosition: 'auto',
      enableKeyboardShortcuts: false
    };
    this.init();
  }

  // 初始化事件监听
  init() {
    // 监听文本选择事件 - 使用多种事件确保捕获
    document.addEventListener('mouseup', this.handleTextSelection.bind(this));
    document.addEventListener('keyup', this.handleTextSelection.bind(this));
    document.addEventListener('selectionchange', this.handleTextSelection.bind(this));
    
    // 添加更多事件监听器以确保捕获所有选择情况
    document.addEventListener('touchend', this.handleTextSelection.bind(this));
    document.addEventListener('input', this.handleTextSelection.bind(this));
    
    // Edge 兼容性：添加更多事件监听器
    document.addEventListener('mouseup', this.handleTextSelection.bind(this), true);
    document.addEventListener('mousedown', this.handleTextSelection.bind(this), true);
    document.addEventListener('click', this.handleTextSelection.bind(this), true);
    
    // 监听点击事件，隐藏工具栏
    document.addEventListener('click', this.handleDocumentClick.bind(this));
    
    // 监听滚动事件，隐藏工具栏
    document.addEventListener('scroll', this.hideToolbar.bind(this));
    
    // 监听键盘事件，ESC键隐藏工具栏
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    // 监听窗口大小变化，重新定位工具栏
    window.addEventListener('resize', () => {
      if (this.isToolbarVisible && this.toolbar) {
        this.updateToolbarPosition();
      }
    });

    // 添加MutationObserver来监听DOM变化
    this.observeDOMChanges();
    
    // 添加定期检查选择状态的定时器
    this.startSelectionChecker();
    
    // 添加双击事件监听器
    document.addEventListener('dblclick', this.handleTextSelection.bind(this));
    
    // 添加右键菜单事件监听器
    document.addEventListener('contextmenu', this.handleTextSelection.bind(this));

    // 加载界面设置
    this.loadInterfaceSettings();

    // 处理双击G键快捷键
    this.handleDoubleGKey();
    
    // Edge 兼容性：添加更多选择检测
    this.addEdgeCompatibility();
  }

  // 加载界面设置
  async loadInterfaceSettings() {
    try {
      // 从background script获取配置
      const response = await chrome.runtime.sendMessage({
        action: 'getApiConfig'
      });
      
      if (response && response.success && response.config.interfaceSettings) {
        this.interfaceSettings = response.config.interfaceSettings;
        console.log('界面设置已加载:', this.interfaceSettings);
      } else {
        // 从本地存储获取
        const result = await chrome.storage.local.get(['interfaceSettings']);
        if (result.interfaceSettings) {
          this.interfaceSettings = result.interfaceSettings;
          console.log('从本地存储加载界面设置:', this.interfaceSettings);
        }
      }
    } catch (error) {
      console.log('加载界面设置失败，使用默认设置:', error);
    }
  }

  // 监听DOM变化
  observeDOMChanges() {
    const observer = new MutationObserver((mutations) => {
      // 如果DOM发生变化，检查当前选择状态
      setTimeout(() => {
        this.checkCurrentSelection();
      }, 100);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  // 检查当前选择状态
  checkCurrentSelection() {
    const selection = window.getSelection();
    const selectedText = this.getSelectedText(selection);
    
    if (selectedText && selectedText.length > 0) {
      this.selectedText = selectedText;
      this.showToolbar();
    }
  }

  // 获取选中的文本，改进版本
  getSelectedText(selection) {
    if (!selection || selection.rangeCount === 0) {
      return '';
    }

    let selectedText = '';
    
    // 遍历所有选择范围
    for (let i = 0; i < selection.rangeCount; i++) {
      const range = selection.getRangeAt(i);
      
      // 检查范围是否有效
      if (range && !range.collapsed) {
        // 获取文本内容
        const textContent = range.toString().trim();
        if (textContent) {
          selectedText += textContent + ' ';
        }
        
        // 如果范围包含HTML元素，也尝试获取文本
        if (range.commonAncestorContainer && range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE) {
          const tempDiv = document.createElement('div');
          tempDiv.appendChild(range.cloneContents());
          const htmlText = tempDiv.textContent || tempDiv.innerText || '';
          if (htmlText.trim()) {
            selectedText += htmlText.trim() + ' ';
          }
        }
      }
    }

    return selectedText.trim();
  }

  // 处理文本选择
  handleTextSelection(event) {
    // 防抖处理，避免频繁触发
    const now = Date.now();
    if (now - this.lastSelectionTime < 50) {
      return;
    }
    this.lastSelectionTime = now;

    const selection = window.getSelection();
    const selectedText = this.getSelectedText(selection);
    
    // 如果选择了文本且长度大于0
    if (selectedText && selectedText.length > 0) {
      this.selectedText = selectedText;
      this.showToolbar(event);
    } else {
      // 延迟隐藏工具栏，避免快速选择时闪烁
      setTimeout(() => {
        const currentSelection = window.getSelection();
        const currentText = this.getSelectedText(currentSelection);
        if (!currentText || currentText.length === 0) {
          this.hideToolbar();
        }
      }, 150);
    }
  }

  // 处理文档点击事件
  handleDocumentClick(event) {
    // 如果点击的不是工具栏，则隐藏工具栏
    if (this.toolbar && !this.toolbar.contains(event.target)) {
      // 立即隐藏
      this.hideToolbar();
    }
  }

  // 处理键盘事件
  handleKeyDown(event) {
    // 监听Ctrl+A等全选操作
    if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
      setTimeout(() => {
        this.handleTextSelection(event);
      }, 100);
    }
  }

  // 处理双击事件
  handleDoubleClick(event) {
    // 双击后延迟检查选择状态
    setTimeout(() => {
      this.handleTextSelection(event);
    }, 100);
  }

  // 处理双击G键快捷键
  handleDoubleGKey() {
    let lastGKeyTime = 0;
    const doubleGThreshold = 300; // 300ms内的两次G键视为双击
    let keyPressCount = 0;
    let keyPressTimer = null;
    
    // Edge兼容性：使用多种事件监听方式
    const handleKeyEvent = (event) => {
      // 只处理G键，忽略修饰键
      if (event.key.toLowerCase() === 'g' && 
          !event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
        
        // 防止事件重复触发
        event.preventDefault();
        event.stopPropagation();
        
        const currentTime = Date.now();
        
        // 方法1：基于时间间隔的双击检测
        if (currentTime - lastGKeyTime < doubleGThreshold) {
          console.log('双击G键检测到（时间间隔方法）');
          this.triggerImageGeneration();
          lastGKeyTime = 0;
          keyPressCount = 0;
          return;
        }
        
        // 方法2：基于按键次数的双击检测
        keyPressCount++;
        if (keyPressCount >= 2) {
          console.log('双击G键检测到（按键次数方法）');
          this.triggerImageGeneration();
          keyPressCount = 0;
          lastGKeyTime = 0;
          return;
        }
        
        // 重置计时器
        if (keyPressTimer) {
          clearTimeout(keyPressTimer);
        }
        
        keyPressTimer = setTimeout(() => {
          keyPressCount = 0;
        }, doubleGThreshold);
        
        lastGKeyTime = currentTime;
      }
    };
    
    // 添加多种事件监听器以确保Edge兼容性
    document.addEventListener('keydown', handleKeyEvent, true);
    document.addEventListener('keypress', handleKeyEvent, true);
    
    // Edge兼容性：添加window级别的事件监听
    window.addEventListener('keydown', handleKeyEvent, true);
    window.addEventListener('keypress', handleKeyEvent, true);
    
    // Edge兼容性：添加body级别的事件监听
    if (document.body) {
      document.body.addEventListener('keydown', handleKeyEvent, true);
      document.body.addEventListener('keypress', handleKeyEvent, true);
    }
    
    console.log('双击G键快捷键已启用，支持Edge浏览器');
  }
  
  // 触发图片生成的统一方法
  triggerImageGeneration() {
    if (this.selectedText) {
      console.log('双击G键触发图片生成，选中文本:', this.selectedText);
      this.generateImage();
    } else {
      // 如果没有选中文本，尝试获取当前选择
      const selection = window.getSelection();
      const selectedText = this.getSelectedText(selection);
      if (selectedText && selectedText.length > 0) {
        this.selectedText = selectedText;
        console.log('双击G键获取选中文本并生成图片:', selectedText);
        this.generateImage();
      } else {
        this.showError('请先选择要生成图片的文本');
      }
    }
  }

  // 强制检查文本选择（用于调试和特殊情况）
  forceCheckSelection() {
    const selection = window.getSelection();
    const selectedText = this.getSelectedText(selection);
    
    if (selectedText && selectedText.length > 0) {
      this.selectedText = selectedText;
      this.showToolbar();
      return true;
    }
    return false;
  }

  // 处理特殊元素的文本选择
  handleSpecialElementSelection(element) {
    if (!element) return;
    
    // 对于标题等特殊元素，尝试获取其文本内容
    const textContent = element.textContent || element.innerText || '';
    if (textContent.trim()) {
      this.selectedText = textContent.trim();
      this.showToolbar();
    }
  }

  // 显示浮动工具栏
  showToolbar(event) {
    if (this.isToolbarVisible) {
      this.updateToolbarPosition(event);
      return;
    }

    this.createToolbar();
    this.updateToolbarPosition(event);
    this.isToolbarVisible = true;
    
    // 添加调试信息
    console.log('工具栏已显示，选中文本:', this.selectedText);
  }

  // 创建工具栏
  createToolbar() {
    // 移除已存在的工具栏
    if (this.toolbar) {
      document.body.removeChild(this.toolbar);
    }

    // 创建工具栏元素
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'ai-image-toolbar';
    this.toolbar.innerHTML = `
      <button class="toolbar-button primary" id="generateImageBtn">
        <span class="icon">🎨</span>
        <span class="text">生成图片</span>
      </button>
    `;

    // 添加事件监听
    this.toolbar.querySelector('#generateImageBtn').addEventListener('click', () => {
      this.generateImage();
    });

    // 添加到页面
    document.body.appendChild(this.toolbar);
  }

  // 更新工具栏位置
  updateToolbarPosition(event) {
    if (!this.toolbar) return;

    // 获取当前选中的文本范围
    const selection = window.getSelection();
    let left, top;
    let rect = null;

    if (selection.rangeCount > 0) {
      // 使用选中文本的位置
      const range = selection.getRangeAt(0);
      
      // 尝试获取选中文本的边界矩形
      try {
        rect = range.getBoundingClientRect();
      } catch (e) {
        console.log('无法获取选择范围边界:', e);
      }
      
      // 如果无法获取边界矩形，尝试其他方法
      if (!rect || rect.width === 0 || rect.height === 0) {
        // 尝试从选中的节点获取位置
        const startNode = range.startContainer;
        const endNode = range.endContainer;
        
        if (startNode && startNode.nodeType === Node.TEXT_NODE && startNode.parentElement) {
          rect = startNode.parentElement.getBoundingClientRect();
        } else if (startNode && startNode.nodeType === Node.ELEMENT_NODE) {
          rect = startNode.getBoundingClientRect();
        }
      }
      
      if (rect && rect.width > 0 && rect.height > 0) {
        // 根据界面设置确定工具栏位置
        const position = this.interfaceSettings.toolbarPosition || 'auto';
        
        switch (position) {
          case 'above':
            left = rect.left + (rect.width / 2);
            top = rect.top - 60;
            break;
          case 'below':
            left = rect.left + (rect.width / 2);
            top = rect.bottom + 20;
            break;
          case 'right':
            left = rect.right + 20;
            top = rect.top + (rect.height / 2) - 30;
            break;
          case 'left':
            left = rect.left - 200; // 工具栏宽度约200px
            top = rect.top + (rect.height / 2) - 30;
            break;
          case 'auto':
          default:
            // 自动选择：优先上方，空间不足时选择下方
            if (rect.top > 80) {
              left = rect.left + (rect.width / 2);
              top = rect.top - 60;
            } else {
              left = rect.left + (rect.width / 2);
              top = rect.bottom + 20;
            }
            break;
        }
      } else {
        // 如果仍然无法获取位置，使用鼠标位置
        left = event ? event.clientX : window.innerWidth / 2;
        top = event ? event.clientY - 60 : 100;
      }
    } else if (event) {
      // 如果没有选中范围，使用鼠标位置
      left = event.clientX;
      top = event.clientY - 60;
    } else {
      // 默认位置
      left = window.innerWidth / 2;
      top = 100;
    }

    // 添加滚动偏移
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    left += scrollLeft;
    top += scrollTop;

    // 确保工具栏不超出视窗边界
    const toolbarRect = this.toolbar.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 水平边界检查
    if (left + toolbarRect.width > viewportWidth + scrollLeft) {
      left = viewportWidth + scrollLeft - toolbarRect.width - 10;
    }
    if (left < scrollLeft) {
      left = scrollLeft + 10;
    }

    // 垂直边界检查
    if (top < scrollTop) {
      // 如果上方空间不足，尝试在下方显示
      if (rect) {
        top = rect.bottom + scrollTop + 20;
      } else {
        top = (event ? event.clientY : 100) + scrollTop + 20;
      }
    }
    if (top + toolbarRect.height > viewportHeight + scrollTop) {
      top = viewportHeight + scrollTop - toolbarRect.height - 10;
    }

    // 设置工具栏位置
    this.toolbar.style.left = left + 'px';
    this.toolbar.style.top = top + 'px';
    
    // 添加调试信息
    console.log('工具栏位置已更新:', { left, top, selectedText: this.selectedText, position: this.interfaceSettings.toolbarPosition });
  }

  // 隐藏工具栏
  hideToolbar() {
    if (this.toolbar && this.isToolbarVisible) {
      this.toolbar.remove();
      this.toolbar = null;
      this.isToolbarVisible = false;
    }
  }

  // 生成图片
  async generateImage() {
    if (!this.selectedText) return;

    try {
      // 显示加载状态
      this.showLoadingState();
      
      // 获取当前配置
      let currentConfig = null;
      try {
        const configResponse = await chrome.runtime.sendMessage({
          action: 'getApiConfig'
        });
        if (configResponse && configResponse.success) {
          currentConfig = configResponse.config;
          console.log('当前使用的配置:', currentConfig);
        }
      } catch (error) {
        console.warn('获取配置失败，使用默认配置:', error);
      }
      
      // 发送消息给background script处理API调用
      const response = await chrome.runtime.sendMessage({
        action: 'generateImage',
        text: this.selectedText,
        config: currentConfig // 传递当前配置
      });

      // 隐藏加载状态
      this.hideLoadingState();

      if (response.success) {
        this.showImageModal(response.imageUrls, this.selectedText, response.count);
      } else {
        this.showError('图片生成失败: ' + response.error);
      }
    } catch (error) {
      console.error('生成图片时出错:', error);
      this.hideLoadingState();
      this.showError('生成图片时出错: ' + error.message);
    }
  }

  // 显示加载状态
  showLoadingState() {
    // 创建加载提示
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'image-generation-loading';
    loadingDiv.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <div class="loading-text">正在生成图片，请稍候...</div>
        <div class="loading-progress">任务已创建，正在等待结果...</div>
      </div>
    `;
    loadingDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;
    
    document.body.appendChild(loadingDiv);
  }

  // 隐藏加载状态
  hideLoadingState() {
    const loadingDiv = document.getElementById('image-generation-loading');
    if (loadingDiv) {
      loadingDiv.remove();
    }
  }

  // 收藏生成的图片内容
  collectGeneratedContent(imageUrls, prompt) {
    if (!imageUrls || imageUrls.length === 0) return;

    // 保存到本地存储
    chrome.storage.local.get(['favorites'], (result) => {
      const favorites = result.favorites || [];
      
      // 创建新的收藏项目
      const newFavorite = {
        id: Date.now().toString(),
        text: prompt,
        timestamp: Date.now(),
        url: window.location.href,
        title: document.title || '未知页面',
        type: 'generated_content',
        imageUrls: imageUrls.map(imgData => {
          return typeof imgData === 'string' ? imgData : imgData.url;
        }),
        imageCount: imageUrls.length,
        // 保存实际提示词（如果存在）
        actualPrompt: imageUrls.length > 0 && imageUrls[0].actualPrompt ? imageUrls[0].actualPrompt : null
      };
      
      favorites.push(newFavorite);
      
      // 保存到存储
      chrome.storage.local.set({ favorites: favorites }, () => {
        console.log('生成内容已收藏:', newFavorite);
        
        // 通知设置页面更新收藏列表
        try {
          chrome.runtime.sendMessage({
            action: 'favoritesUpdated',
            favorites: favorites
          });
        } catch (error) {
          console.log('发送收藏更新通知失败:', error);
        }
        
        this.showSuccess('生成内容已收藏');
      });
    });
  }

  // 收藏文本
  favoriteText() {
    if (!this.selectedText) return;

    // 保存到本地存储
    chrome.storage.local.get(['favorites'], (result) => {
      const favorites = result.favorites || [];
      
      // 检查是否已经收藏过相同内容
      const existingIndex = favorites.findIndex(fav => fav.text === this.selectedText);
      
      if (existingIndex !== -1) {
        // 如果已存在，更新收藏
        favorites[existingIndex] = {
          text: this.selectedText,
          timestamp: Date.now(),
          url: window.location.href,
          title: document.title || '未知页面'
        };
        this.showSuccess('收藏已更新');
      } else {
        // 添加新收藏
        const newFavorite = {
          id: Date.now().toString(), // 添加唯一ID
          text: this.selectedText,
          timestamp: Date.now(),
          url: window.location.href,
          title: document.title || '未知页面'
        };
        
        favorites.push(newFavorite);
        this.showSuccess('已添加到收藏');
      }
      
      // 保存到存储
      chrome.storage.local.set({ favorites: favorites }, () => {
        console.log('收藏已保存:', favorites);
        
        // 通知设置页面更新收藏列表
        try {
          chrome.runtime.sendMessage({
            action: 'favoritesUpdated',
            favorites: favorites
          });
        } catch (error) {
          console.log('发送收藏更新通知失败:', error);
        }
      });
    });
  }

  // 显示图片模态框
  showImageModal(imageUrls, prompt, count) {
    // 确保imageUrls是数组
    if (!Array.isArray(imageUrls)) {
      imageUrls = [imageUrls];
    }
    
    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'ai-image-modal-overlay';
    modal.innerHTML = `
      <div class="ai-image-modal">
        <div class="modal-header">
          <h3>生成的图片 (${count || imageUrls.length}张)</h3>
          <button class="close-btn" id="closeModal">×</button>
        </div>
        <div class="modal-content">
          <div class="prompt-info">
            <strong>提示词:</strong> ${prompt}
          </div>
          <div class="image-container">
            ${imageUrls.map((imageData, index) => {
              const url = typeof imageData === 'string' ? imageData : imageData.url;
              const actualPrompt = imageData.actualPrompt || '';
              return `
                <div class="image-item">
                  <div class="image-number">图片 ${index + 1}</div>
                  <img src="${url}" alt="生成的图片 ${index + 1}" class="generated-image">
                  ${actualPrompt ? `<div class="actual-prompt">实际提示词: ${actualPrompt}</div>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn secondary" id="collectBtn">
            <span class="icon">⭐</span>
            收藏内容
          </button>
          <button class="btn secondary" id="downloadAllBtn">下载所有图片</button>
          <button class="btn primary" id="regenerateBtn">重新生成</button>
        </div>
      </div>
    `;

    // 添加事件监听
    modal.querySelector('#closeModal').addEventListener('click', () => {
      modal.remove();
      });
    
    modal.querySelector('#collectBtn').addEventListener('click', () => {
      this.collectGeneratedContent(imageUrls, prompt);
    });

    modal.querySelector('#downloadAllBtn').addEventListener('click', () => {
      this.downloadAllImages(imageUrls, prompt);
    });

    modal.querySelector('#regenerateBtn').addEventListener('click', () => {
      modal.remove();
      this.generateImage();
    });

    // 点击背景关闭模态框
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    document.body.appendChild(modal);
  }

  // 显示生成记录模态框
  showGenerationModal(generation) {
    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'ai-image-modal-overlay';
    modal.innerHTML = `
      <div class="ai-image-modal">
        <div class="modal-header">
          <h3>生成记录详情</h3>
          <button class="close-btn" id="closeModal">×</button>
        </div>
        <div class="modal-content">
          <div class="prompt-info">
            <strong>提示词:</strong> ${generation.text || generation.prompt || '无提示词'}
          </div>
          ${generation.actualPrompt ? `
            <div class="actual-prompt-info">
              <strong>实际提示词:</strong> ${generation.actualPrompt}
            </div>
          ` : ''}
          <div class="image-container">
            ${generation.imageUrls.map((imageData, index) => {
              const url = typeof imageData === 'string' ? imageData : imageData.url;
              return `
                <div class="image-item">
                  <div class="image-number">图片 ${index + 1}</div>
                  <img src="${url}" alt="生成的图片 ${index + 1}" class="generated-image">
                </div>
              `;
            }).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn secondary" id="downloadAllBtn">下载所有图片</button>
          <button class="btn primary" id="closeBtn">关闭</button>
        </div>
      </div>
    `;

    // 添加事件监听
    modal.querySelector('#closeModal').addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelector('#closeBtn').addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelector('#downloadAllBtn').addEventListener('click', () => {
      this.downloadAllImages(generation.imageUrls, generation.text || generation.prompt);
    });

    // 点击背景关闭模态框
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    document.body.appendChild(modal);
  }



  // 下载所有图片
  downloadAllImages(imageUrls, prompt) {
    // 为每张图片创建唯一的文件名
    const downloadPromises = imageUrls.map((imageData, index) => {
      const url = typeof imageData === 'string' ? imageData : imageData.url;
      return new Promise(resolve => {
        // 为每张图片使用不同的时间戳和索引
        const timestamp = Date.now() + index;
        const fileName = `ai-generated-${timestamp}-${index + 1}.png`;
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.target = '_blank'; // 在新标签页打开，避免某些浏览器的限制
        
        // 添加到DOM
        document.body.appendChild(link);
        
        // 延迟点击，避免浏览器阻止多个下载
        setTimeout(() => {
          link.click();
          // 延迟移除，确保下载开始
          setTimeout(() => {
            if (link.parentNode) {
              link.parentNode.removeChild(link);
            }
            resolve();
          }, 100);
        }, index * 200); // 每张图片间隔200ms
      });
    });

    Promise.all(downloadPromises).then(() => {
      this.showSuccess(`已开始下载 ${imageUrls.length} 张图片`);
    }).catch(error => {
      console.error('下载图片时出错:', error);
      this.showError('下载图片失败: ' + error.message);
    });
  }

  // 显示成功消息
  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  // 显示错误消息
  showError(message) {
    this.showNotification(message, 'error');
  }

  // 显示通知
  showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `ai-notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // 3秒后自动移除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  // 定期检查选择状态
  startSelectionChecker() {
    setInterval(() => {
      if (!this.isToolbarVisible) {
        this.forceCheckSelection();
      }
    }, 2000); // 每2秒检查一次
  }

  // 处理右键菜单事件
  handleContextMenu(event) {
    // 右键菜单后检查选择状态
    setTimeout(() => {
      this.handleTextSelection(event);
    }, 100);
  }

  // Edge 兼容性：添加更多选择检测
  addEdgeCompatibility() {
    // Edge 兼容性：添加更多事件监听器
    document.addEventListener('mouseup', this.handleTextSelection.bind(this), true);
    document.addEventListener('mousedown', this.handleTextSelection.bind(this), true);
    document.addEventListener('click', this.handleTextSelection.bind(this), true);
    
    // Edge 兼容性：添加更多选择检测方法
    document.addEventListener('selectstart', this.handleTextSelection.bind(this));
    document.addEventListener('select', this.handleTextSelection.bind(this));
    
    // Edge 兼容性：使用事件委托监听所有可能的文本选择
    document.addEventListener('mouseup', (e) => {
      // 检查是否在文本元素上
      if (e.target.nodeType === Node.TEXT_NODE || 
          e.target.tagName === 'P' || 
          e.target.tagName === 'DIV' || 
          e.target.tagName === 'SPAN' ||
          e.target.tagName === 'H1' || 
          e.target.tagName === 'H2' || 
          e.target.tagName === 'H3' ||
          e.target.tagName === 'H4' || 
          e.target.tagName === 'H5' || 
          e.target.tagName === 'H6') {
        setTimeout(() => this.handleTextSelection(e), 50);
      }
    }, true);
    
    // Edge 兼容性：定期检查选择状态
    setInterval(() => {
      this.checkCurrentSelection();
    }, 500);
    
    // Edge 兼容性：添加额外的快捷键支持
    this.addEdgeKeyboardSupport();
    
    console.log('Edge兼容性增强已启用');
  }
  
  // Edge兼容性：添加额外的键盘支持
  addEdgeKeyboardSupport() {
    // 备用快捷键：Ctrl+Shift+G
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'g') {
        event.preventDefault();
        event.stopPropagation();
        console.log('备用快捷键 Ctrl+Shift+G 触发');
        this.triggerImageGeneration();
      }
    }, true);
    
    // 备用快捷键：Alt+G
    document.addEventListener('keydown', (event) => {
      if (event.altKey && event.key.toLowerCase() === 'g') {
        event.preventDefault();
        event.stopPropagation();
        console.log('备用快捷键 Alt+G 触发');
        this.triggerImageGeneration();
      }
    }, true);
    
    // 全局快捷键监听（确保在Edge中工作）
    window.addEventListener('keydown', (event) => {
      if (event.key.toLowerCase() === 'g' && 
          !event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
        // 记录G键按下，用于调试
        console.log('G键按下检测到，时间:', Date.now());
      }
    }, true);
  }
}

// 初始化文本选择处理器
const textSelectionHandler = new TextSelectionHandler();

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'regenerateImage') {
    textSelectionHandler.selectedText = request.prompt;
    textSelectionHandler.generateImage();
  }
  
  // 显示生成记录模态框
  if (request.action === 'showGenerationModal') {
    textSelectionHandler.showGenerationModal(request.generation);
  }
  
  // 监听配置更新
  if (request.action === 'configUpdated' && request.config.interfaceSettings) {
    textSelectionHandler.interfaceSettings = request.config.interfaceSettings;
    console.log('界面设置已更新:', textSelectionHandler.interfaceSettings);
  }
  
  // 监听收藏更新
  if (request.action === 'favoritesUpdated') {
    console.log('收藏已更新:', request.favorites);
  }
  
  return true;
});

// 监听存储变化
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.interfaceSettings) {
    textSelectionHandler.interfaceSettings = changes.interfaceSettings.newValue;
    console.log('界面设置已从存储更新:', textSelectionHandler.interfaceSettings);
  }
});

// 添加全局调试函数
window.debugTextSelection = () => {
  console.log('=== 文本选择调试信息 ===');
  const selection = window.getSelection();
  console.log('选择对象:', selection);
  console.log('选择范围数量:', selection.rangeCount);
  
  if (selection.rangeCount > 0) {
    for (let i = 0; i < selection.rangeCount; i++) {
      const range = selection.getRangeAt(i);
      console.log(`范围 ${i}:`, range);
      console.log(`范围文本: "${range.toString()}"`);
      console.log(`范围边界:`, range.getBoundingClientRect());
    }
  }
  
  console.log('当前选中文本:', textSelectionHandler.selectedText);
  console.log('工具栏状态:', textSelectionHandler.isToolbarVisible);
  console.log('========================');
};

// 添加手动触发插件的函数
window.triggerPlugin = (text) => {
  if (text) {
    textSelectionHandler.selectedText = text;
    textSelectionHandler.showToolbar();
    console.log('手动触发插件，文本:', text);
  } else {
    console.log('请提供要触发的文本');
  }
};
