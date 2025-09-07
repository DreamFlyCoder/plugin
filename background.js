// 后台脚本 - 处理API调用和消息传递
class BackgroundHandler {
  constructor() {
    this.apiConfig = null;
    this.isInitialized = false;
    this.init();
  }

  // 初始化
  async init() {
    try {
      // 加载API配置
      await this.loadApiConfig();
      
      // 监听来自content script的消息
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        this.handleMessage(request, sender, sendResponse);
        return true; // 保持消息通道开放
      });
      
      this.isInitialized = true;
      console.log('Background script 初始化完成');
    } catch (error) {
      console.error('Background script 初始化失败:', error);
    }
  }

  // 加载API配置
  async loadApiConfig() {
    try {
      // 从存储中获取配置
      const result = await chrome.storage.local.get(['apiConfig', 'interfaceSettings']);
      this.apiConfig = result.apiConfig || {
        baseUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis',
        apiKey: 'your_alibaba_api_key_here',
        model: 'wan2.2-t2i-flash',
        defaultParams: {
          n: 1,
          size: '1024*1024',
          style: 'photographic',
          quality: 'standard'
        }
      };
      
      // 加载界面设置
      if (result.interfaceSettings) {
        this.apiConfig.interfaceSettings = result.interfaceSettings;
      } else {
        this.apiConfig.interfaceSettings = {
          toolbarPosition: 'auto',
          enableKeyboardShortcuts: false
        };
      }
      
      // 确保配置结构完整
      if (!this.apiConfig.defaultParams) {
        this.apiConfig.defaultParams = {
          n: 1,
          size: '1024*1024',
          style: 'photographic',
          quality: 'standard'
        };
      }
      
      console.log('加载的API配置:', this.apiConfig);
    } catch (error) {
      console.error('加载API配置失败:', error);
      // 使用默认配置
      this.apiConfig = {
        baseUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis',
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
          enableKeyboardShortcuts: false
        }
      };
    }
  }

  // 处理消息
  async handleMessage(request, sender, sendResponse) {
    try {
      // 确保background script已初始化
      if (!this.isInitialized) {
        await this.init();
      }
      
      switch (request.action) {
        case 'generateImage':
          // 如果传递了配置，临时使用传递的配置
          let tempConfig = null;
          if (request.config) {
            tempConfig = this.apiConfig;
            this.apiConfig = { ...this.apiConfig, ...request.config };
            console.log('使用传递的配置生成图片:', this.apiConfig);
          }
          
          const result = await this.generateImage(request.text);
          
          // 恢复原始配置
          if (tempConfig) {
            this.apiConfig = tempConfig;
          }
          
          sendResponse(result);
          break;
          
        case 'testApiConnection':
          const testResult = await this.generateImage(request.text);
          sendResponse(testResult);
          break;
          
        case 'createImageTask':
          const taskResult = await this.createImageTask(request.text);
          sendResponse(taskResult);
          break;
          
        case 'pollTaskResult':
          const pollResult = await this.pollTaskResult(request.taskId);
          sendResponse(pollResult);
          break;
          
        case 'updateApiConfig':
          await this.updateApiConfig(request.config);
          sendResponse({ success: true });
          break;
          
        case 'getApiConfig':
          sendResponse({ success: true, config: this.apiConfig });
          break;
          
        case 'configUpdated':
          // 转发配置更新消息到所有标签页
          this.forwardMessageToAllTabs(request);
          sendResponse({ success: true });
          break;
          
        case 'ping':
          sendResponse({ success: true, message: 'Background script is running' });
          break;
        
        case 'favoritesUpdated':
          // 收藏更新通知，转发给其他页面
          this.forwardMessageToAllTabs(request);
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('处理消息时出错:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 生成图片 - 使用异步调用机制
  async generateImage(text) {
    try {
      // 检查API密钥是否已配置
      if (!this.apiConfig.apiKey || this.apiConfig.apiKey === 'your_alibaba_api_key_here') {
        return {
          success: false,
          error: '请先在设置中配置阿里云API密钥'
        };
      }

      // 第一步：创建异步任务
      const taskResult = await this.createImageTask(text);
      if (!taskResult.success) {
        return taskResult;
      }

      const taskId = taskResult.taskId;
      console.log('任务创建成功，任务ID:', taskId);

      // 第二步：轮询查询任务结果
      const maxAttempts = 60; // 最多轮询60次
      const pollInterval = 2000; // 每2秒轮询一次

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`轮询尝试 ${attempt}/${maxAttempts}`);
        
        const pollResult = await this.pollTaskResult(taskId);
        
        if (pollResult.success) {
          // 任务成功完成
          return {
            success: true,
            imageUrls: pollResult.imageUrls,
            count: pollResult.count,
            taskId: pollResult.taskId,
            prompt: text
          };
        } else if (pollResult.status === 'PENDING' || pollResult.status === 'RUNNING') {
          // 任务仍在进行中，继续等待
          console.log(`任务状态: ${pollResult.status}，等待 ${pollInterval/1000} 秒后重试...`);
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          continue;
        } else {
          // 任务失败
          return pollResult;
        }
      }

      // 超过最大尝试次数
      return {
        success: false,
        error: '任务执行超时，请稍后重试'
      };

    } catch (error) {
      console.error('生成图片时出错:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 创建图片生成任务
  async createImageTask(text) {
    try {
      const apiUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis';
      
      // 验证并处理尺寸参数
      let size = this.apiConfig.defaultParams.size || '1024*1024';
      const [width, height] = size.split('*').map(Number);
      
      // 确保尺寸在512~1440范围内
      const clampedWidth = Math.max(512, Math.min(1440, width));
      const clampedHeight = Math.max(512, Math.min(1440, height));
      
      // 如果尺寸被调整，记录日志
      if (clampedWidth !== width || clampedHeight !== height) {
        console.log(`尺寸已调整: ${width}*${height} -> ${clampedWidth}*${clampedHeight}`);
        size = `${clampedWidth}*${clampedHeight}`;
      }
      
      // 构建请求参数，使用配置中的所有参数
      const requestBody = {
        model: this.apiConfig.model,
        input: {
          prompt: text
        },
        parameters: {
          n: this.apiConfig.defaultParams.n || 1,
          size: size,
          style: this.apiConfig.defaultParams.style || 'photographic',
          quality: this.apiConfig.defaultParams.quality || 'standard'
        }
      };

      console.log('创建任务请求:', {
        url: apiUrl,
        model: this.apiConfig.model,
        prompt: text,
        parameters: requestBody.parameters
      });

      // 发送异步任务创建请求
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiConfig.apiKey}`,
          'X-DashScope-Async': 'enable' // 异步请求
        },
        body: JSON.stringify(requestBody)
      });

      console.log('任务创建响应状态:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('任务创建失败:', errorText);
        throw new Error(`任务创建失败: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('任务创建成功响应:', data);
      
      // 检查响应中是否包含task_id
      if (data.output && data.output.task_id) {
        return {
          success: true,
          taskId: data.output.task_id
        };
      } else {
        console.error('响应中未找到task_id:', data);
        throw new Error('API响应中未找到任务ID');
      }

    } catch (error) {
      console.error('创建任务时出错:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 轮询查询任务结果
  async pollTaskResult(taskId) {
    try {
      const apiUrl = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`;
      
      console.log('查询任务状态，任务ID:', taskId);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiConfig.apiKey}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('查询任务状态失败:', errorText);
        return {
          success: false,
          error: `查询任务状态失败: ${response.status} ${response.statusText} - ${errorText}`
        };
      }

      const data = await response.json();
      console.log('任务状态响应:', data);

      // 检查任务状态
      if (data.output && data.output.task_status) {
        const status = data.output.task_status;
        
        if (status === 'SUCCEEDED') {
          // 任务成功完成
          if (data.output.results && data.output.results.length > 0) {
            // 处理多张图片结果
            const imageUrls = data.output.results.map(result => ({
              url: result.url,
              origPrompt: result.orig_prompt,
              actualPrompt: result.actual_prompt
            }));
            
            console.log(`图片生成成功，共${imageUrls.length}张图片:`, imageUrls);
            
            return {
              success: true,
              imageUrls: imageUrls,
              count: imageUrls.length,
              taskId: taskId
            };
          } else {
            return {
              success: false,
              error: '任务成功但未返回图片结果'
            };
          }
        } else if (status === 'FAILED') {
          // 任务失败
          const errorMsg = data.output.message || '任务执行失败';
          return {
            success: false,
            error: `任务执行失败: ${errorMsg}`
          };
        } else if (status === 'PENDING' || status === 'RUNNING') {
          // 任务仍在进行中
          return {
            success: false,
            status: status
          };
        } else {
          // 未知状态
          return {
            success: false,
            error: `未知的任务状态: ${status}`
          };
        }
      } else {
        return {
          success: false,
          error: '响应中未找到任务状态信息'
        };
      }

    } catch (error) {
      console.error('轮询任务结果时出错:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 更新API配置
  async updateApiConfig(newConfig) {
    try {
      console.log('收到配置更新请求:', newConfig);
      console.log('更新前的配置:', this.apiConfig);
      
      // 深度合并配置
      if (newConfig.defaultParams) {
        this.apiConfig.defaultParams = { 
          ...this.apiConfig.defaultParams, 
          ...newConfig.defaultParams 
        };
      }
      
      // 更新其他配置
      this.apiConfig = { ...this.apiConfig, ...newConfig };
      
      // 确保配置结构完整
      if (!this.apiConfig.defaultParams) {
        this.apiConfig.defaultParams = {
          n: 1,
          size: '1024*1024',
          style: 'photographic',
          quality: 'standard'
        };
      }
      
      // 保存到存储
      await chrome.storage.local.set({ apiConfig: this.apiConfig });
      
      console.log('API配置已更新:', this.apiConfig);
      console.log('当前使用的模型:', this.apiConfig.model);
      
      // 验证配置完整性
      this.validateConfig();
      
    } catch (error) {
      console.error('更新API配置失败:', error);
      throw error;
    }
  }

  // 验证配置完整性
  validateConfig() {
    const requiredFields = ['apiKey', 'model', 'defaultParams'];
    const requiredParams = ['n', 'size', 'style', 'quality'];
    
    for (const field of requiredFields) {
      if (!this.apiConfig[field]) {
        console.warn(`配置缺少必需字段: ${field}`);
      }
    }
    
    if (this.apiConfig.defaultParams) {
      for (const param of requiredParams) {
        if (this.apiConfig.defaultParams[param] === undefined) {
          console.warn(`生成参数缺少必需字段: ${param}`);
        }
      }
    }
  }

  // 获取API配置
  getApiConfig() {
    return this.apiConfig;
  }

  // 转发消息到所有标签页
  forwardMessageToAllTabs(message) {
    try {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          try {
            chrome.tabs.sendMessage(tab.id, message).catch(() => {
              // 忽略无法发送消息的标签页（如扩展页面）
            });
          } catch (error) {
            // 忽略错误
          }
        });
      });
    } catch (error) {
      console.log('转发消息失败:', error);
    }
  }
}

// 初始化后台处理器
const backgroundHandler = new BackgroundHandler();

// 监听Service Worker激活事件
chrome.runtime.onStartup.addListener(() => {
  console.log('Chrome启动，重新初始化background script');
  backgroundHandler.init();
});

// 监听扩展安装/更新事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('扩展已安装/更新，初始化background script');
  backgroundHandler.init();
});
