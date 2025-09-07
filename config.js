// 阿里云文生图API配置
const API_CONFIG = {
  // 阿里云文生图API端点
  BASE_URL: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis',
  
  // API密钥 - 请在此处填入您的阿里云API密钥
  API_KEY: 'your_alibaba_api_key_here',
  
  // 模型名称
  MODEL: 'wan2.2-t2i-flash',
  
  // 默认图片生成参数
  DEFAULT_PARAMS: {
    n: 1, // 生成图片数量
    size: '1024*1024', // 图片尺寸
  },
  
  // 请求头配置
  HEADERS: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + 'your_alibaba_api_key_here' // 将在运行时动态设置
  }
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API_CONFIG;
} else {
  window.API_CONFIG = API_CONFIG;
}
