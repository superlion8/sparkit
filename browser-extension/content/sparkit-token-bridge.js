/**
 * Sparkit Token Bridge
 * 这个 content script 只在 Sparkit 网站上运行
 * 用于从页面的 localStorage 获取 Supabase token 并同步到插件
 */

console.log('[Sparkit Token Bridge] Loaded on sparkiai.com');

// 从页面获取 Supabase access token
function getSupabaseToken() {
  try {
    // Supabase 将 session 存储在 localStorage 中
    // 键名格式: sb-<project-ref>-auth-token
    const keys = Object.keys(localStorage);
    const supabaseKey = keys.find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
    
    if (supabaseKey) {
      const sessionData = localStorage.getItem(supabaseKey);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        return session.access_token || null;
      }
    }
    
    // 也检查旧格式
    const authKey = keys.find(key => key.includes('supabase.auth.token'));
    if (authKey) {
      const tokenData = localStorage.getItem(authKey);
      if (tokenData) {
        const parsed = JSON.parse(tokenData);
        return parsed.currentSession?.access_token || parsed.access_token || null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('[Sparkit Token Bridge] Error getting token:', error);
    return null;
  }
}

// 同步 token 到插件存储
async function syncTokenToExtension() {
  const token = getSupabaseToken();
  
  if (token) {
    // 存储到插件的 storage
    chrome.storage.local.set({ 
      sparkitAccessToken: token,
      tokenUpdatedAt: Date.now()
    }, () => {
      console.log('[Sparkit Token Bridge] Token synced to extension');
    });
    
    // 通知 background script
    chrome.runtime.sendMessage({
      type: 'TOKEN_UPDATED',
      token: token
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('[Sparkit Token Bridge] Message send failed (expected if background not listening)');
      }
    });
  } else {
    console.log('[Sparkit Token Bridge] No token found in localStorage');
    // 清除可能存在的旧 token
    chrome.storage.local.remove(['sparkitAccessToken'], () => {
      console.log('[Sparkit Token Bridge] Cleared old token');
    });
  }
}

// 页面加载时立即同步一次
syncTokenToExtension();

// 监听 localStorage 变化（当用户登录/登出时）
window.addEventListener('storage', (event) => {
  if (event.key && (event.key.includes('supabase') || event.key.startsWith('sb-'))) {
    console.log('[Sparkit Token Bridge] Auth state changed, syncing...');
    setTimeout(syncTokenToExtension, 500);
  }
});

// 定期同步（防止 token 刷新）
setInterval(syncTokenToExtension, 60000); // 每分钟检查一次

// 监听来自 popup 的同步请求
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'REQUEST_TOKEN_SYNC') {
    console.log('[Sparkit Token Bridge] Received sync request');
    syncTokenToExtension();
    sendResponse({ success: true });
  }
  return true;
});

console.log('[Sparkit Token Bridge] Initialized, token sync scheduled');

