// Content script for Sparkit website - reads auth token automatically

(function() {
  'use strict';

  // 获取 Supabase session 的 access token
  async function getAccessToken() {
    try {
      // 方法1: 尝试从 window 对象获取 Supabase client（如果已加载）
      if (window.__SUPABASE_CLIENT__) {
        const { data: { session } } = await window.__SUPABASE_CLIENT__.auth.getSession();
        if (session?.access_token) {
          return session.access_token;
        }
      }

      // 方法2: 从 Local Storage 查找 Supabase session
      // Supabase 存储格式: sb-<project-ref>-auth-token
      const supabaseUrl = 'https://' + window.location.hostname.split('.').slice(-2).join('.');
      const projectRef = supabaseUrl.match(/supabase\.co/)?.[0] ? 
        localStorage.key(0)?.match(/sb-([^-]+)-auth-token/)?.[1] : null;
      
      // 遍历所有 localStorage keys 查找 Supabase session
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('auth-token')) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              const sessionData = JSON.parse(value);
              if (sessionData?.access_token) {
                return sessionData.access_token;
              }
              // 也可能存储的是整个 session 对象
              if (sessionData?.currentSession?.access_token) {
                return sessionData.currentSession.access_token;
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }

      // 方法3: 尝试调用 Supabase API 获取 session（如果页面已加载 Supabase）
      if (window.supabase && window.supabase.auth) {
        const { data: { session } } = await window.supabase.auth.getSession();
        if (session?.access_token) {
          return session.access_token;
        }
      }

      return null;
    } catch (error) {
      console.error('[Sparkit Auth] Error getting access token:', error);
      return null;
    }
  }

  // 监听来自插件的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getAuthToken') {
      // 异步获取 token
      getAccessToken().then(accessToken => {
        sendResponse({ accessToken });
      }).catch(error => {
        console.error('[Sparkit Auth] Error:', error);
        sendResponse({ accessToken: null });
      });
      return true; // 保持消息通道开放（异步响应）
    }
    return false;
  });

  // 监听 Local Storage 变化，通知插件更新
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    // 检查是否是 Supabase auth token
    if (key && key.includes('auth-token')) {
      // 延迟一下，确保数据已写入
      setTimeout(async () => {
        const token = await getAccessToken();
        if (token) {
          chrome.runtime.sendMessage({
            action: 'tokenUpdated',
            accessToken: token
          }).catch(() => {
            // 忽略错误（插件可能未安装）
          });
        }
      }, 100);
    }
  };

  // 定期检查 session（每5秒）
  setInterval(async () => {
    const token = await getAccessToken();
    if (token) {
      chrome.runtime.sendMessage({
        action: 'tokenUpdated',
        accessToken: token
      }).catch(() => {
        // 忽略错误
      });
    }
  }, 5000);
})();

