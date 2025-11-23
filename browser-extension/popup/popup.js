// Popup 脚本 - 插件弹窗逻辑

const SPARKIT_API_URL = 'https://sparkiai.com'; // 生产环境
// const SPARKIT_API_URL = 'http://localhost:3000'; // 本地开发（如需本地调试，注释上一行，取消注释这一行）

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Sparkit Mimic] Popup loaded');
  
  // 检查连接状态
  await checkConnectionStatus();
  
  // 检查登录状态
  await checkAuthStatus();
  
  // 绑定按钮事件
  document.getElementById('open-sparkit').addEventListener('click', () => {
    chrome.tabs.create({ url: SPARKIT_API_URL });
  });
  
  document.getElementById('open-settings').addEventListener('click', () => {
    // 打开设置页面（可以是新标签页或 options page）
    chrome.runtime.openOptionsPage();
  });
});

// 检查连接状态
async function checkConnectionStatus() {
  const statusElement = document.getElementById('connection-status');
  
  try {
    const response = await fetch(`${SPARKIT_API_URL}/api/health`, {
      method: 'GET',
      mode: 'cors'
    });
    
    if (response.ok) {
      statusElement.innerHTML = `
        <span class="status-indicator"></span>
        <span>已连接</span>
      `;
    } else {
      throw new Error('Connection failed');
    }
  } catch (error) {
    console.error('[Sparkit Mimic] Connection check failed:', error);
    statusElement.innerHTML = `
      <span class="status-indicator offline"></span>
      <span>未连接</span>
    `;
  }
}

// 检查登录状态
async function checkAuthStatus() {
  const statusElement = document.getElementById('auth-status');
  
  try {
    // 先尝试请求同步最新的 token
    try {
      const [tab] = await chrome.tabs.query({ url: `${SPARKIT_API_URL}/*` });
      if (tab) {
        await chrome.tabs.sendMessage(tab.id, { type: 'REQUEST_TOKEN_SYNC' });
        console.log('[Sparkit Mimic] Requested token sync from Sparkit page');
        // 等待一下让 token 同步
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (syncError) {
      console.log('[Sparkit Mimic] Could not sync token (Sparkit page not open)');
    }
    
    // 尝试获取访问令牌
    const result = await chrome.storage.local.get(['sparkitAccessToken']);
    
    if (result.sparkitAccessToken) {
      // 验证 token 是否有效
      const response = await fetch(`${SPARKIT_API_URL}/api/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${result.sparkitAccessToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        statusElement.innerHTML = `<span>已登录 (${data.email || '用户'})</span>`;
      } else {
        throw new Error('Token invalid');
      }
    } else {
      throw new Error('No token');
    }
  } catch (error) {
    console.error('[Sparkit Mimic] Auth check failed:', error);
    statusElement.innerHTML = `<span>未登录</span>`;
  }
}

// 定期刷新状态
setInterval(() => {
  checkConnectionStatus();
  checkAuthStatus();
}, 30000); // 每 30 秒刷新一次

