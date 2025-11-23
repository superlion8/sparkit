/**
 * Sparkit Mimic 浏览器插件 - 配置文件
 * 
 * 修改这个文件中的配置，然后在浏览器扩展页面重新加载插件即可生效
 */

// ================================
// API 配置
// ================================

// Sparkit API 地址
// 本地开发: 'http://localhost:3000'
// Vercel 部署: 'https://your-project.vercel.app'
// 生产环境: 'https://sparkiai.com'
export const SPARKIT_API_URL = 'https://sparkiai.com';

// ================================
// 功能配置
// ================================

// 默认生成图片数量
export const DEFAULT_NUM_IMAGES = 2;

// 图片最小尺寸（小于此尺寸的图片不显示 Mimic 按钮）
export const MIN_IMAGE_SIZE = 100;

// Mimic 按钮显示延迟（毫秒）
export const BUTTON_SHOW_DELAY = 100;

// 角色列表缓存时间（毫秒）
export const CHARACTER_CACHE_DURATION = 5 * 60 * 1000; // 5分钟

// ================================
// 支持的网站
// ================================

// 在这些网站上启用 Mimic 功能
export const SUPPORTED_SITES = [
  'pinterest.com',
  'instagram.com',
  'xiaohongshu.com',
  'twitter.com',
  'x.com'
];

// ================================
// UI 配置
// ================================

// 主题颜色
export const THEME_COLORS = {
  primary: '#667eea',
  primaryDark: '#764ba2',
  success: '#10b981',
  error: '#ef4444'
};

// 按钮位置偏移
export const BUTTON_OFFSET = {
  right: 90,  // 距离右边的像素
  bottom: 40  // 距离底部的像素
};

