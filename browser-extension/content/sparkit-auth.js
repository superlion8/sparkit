// Content script for Sparkit website - reads auth token automatically

(function() {
  'use strict';

  // 注入脚本到页面上下文，直接访问 Supabase client
  function injectScript() {
    const script = document.createElement('script');
    script.textContent = `
      (function() {
        window.__SPARKIT_GET_TOKEN__ = async function() {
          try {
            // 方法1: 从 Supabase client 获取
            if (window.__SUPABASE_CLIENT__) {
              const { data: { session } } = await window.__SUPABASE_CLIENT__.auth.getSession();
              if (session?.access_token) {
                return session.access_token;
              }
            }
            
            // 方法2: 从全局 supabase 对象获取
            if (window.supabase && window.supabase.auth) {
              const { data: { session } } = await window.supabase.auth.getSession();
              if (session?.access_token) {
                return session.access_token;
              }
            }
            
            // 方法3: 从 Sparkit 全局函数获取（最可靠）
            if (typeof window.__SPARKIT_GET_ACCESS_TOKEN__ === 'function') {
              try {
                const token = window.__SPARKIT_GET_ACCESS_TOKEN__();
                if (token) {
                  console.log('[Sparkit Auth Inject] ✓ Got token from __SPARKIT_GET_ACCESS_TOKEN__');
                  return token;
                }
              } catch (e) {
                console.log('[Sparkit Auth Inject] Error calling __SPARKIT_GET_ACCESS_TOKEN__:', e);
              }
            } else {
              console.log('[Sparkit Auth Inject] __SPARKIT_GET_ACCESS_TOKEN__ not available');
            }
            
            // 方法4: 从 React Context 获取（如果已暴露）
            if (window.__SPARKIT_AUTH_CONTEXT__?.accessToken) {
              return window.__SPARKIT_AUTH_CONTEXT__.accessToken;
            }
            
            if (window.__REACT_AUTH_CONTEXT__?.accessToken) {
              return window.__REACT_AUTH_CONTEXT__.accessToken;
            }
            
            return null;
          } catch (error) {
            console.error('[Sparkit Auth Inject] Error:', error);
            return null;
          }
        };
      })();
    `;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  // 页面加载后注入脚本
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectScript);
  } else {
    injectScript();
  }

  // 获取 Supabase session 的 access token
  async function getAccessToken() {
    try {
      // 方法0: 直接调用 Sparkit 全局函数（最可靠，已确认可用）
      if (typeof window.__SPARKIT_GET_ACCESS_TOKEN__ === 'function') {
        try {
          const token = window.__SPARKIT_GET_ACCESS_TOKEN__();
          if (token) {
            console.log('[Sparkit Auth] ✓ Got token from __SPARKIT_GET_ACCESS_TOKEN__');
            return token;
          }
        } catch (e) {
          console.log('[Sparkit Auth] Error calling __SPARKIT_GET_ACCESS_TOKEN__:', e);
        }
      } else {
        console.log('[Sparkit Auth] __SPARKIT_GET_ACCESS_TOKEN__ not available, type:', typeof window.__SPARKIT_GET_ACCESS_TOKEN__);
      }
      
      // 方法0.5: 使用注入的脚本函数（备用）
      if (typeof window.__SPARKIT_GET_TOKEN__ === 'function') {
        try {
          const token = await window.__SPARKIT_GET_TOKEN__();
          if (token) {
            console.log('[Sparkit Auth] ✓ Got token from injected script');
            return token;
          }
        } catch (e) {
          console.log('[Sparkit Auth] Injected script error:', e);
        }
      }

      // 方法1: 尝试从 window 对象获取 Supabase client（如果已加载）
      if (window.__SUPABASE_CLIENT__) {
        try {
          const { data: { session } } = await window.__SUPABASE_CLIENT__.auth.getSession();
          if (session?.access_token) {
            console.log('[Sparkit Auth] Got token from __SUPABASE_CLIENT__');
            return session.access_token;
          }
        } catch (e) {
          console.log('[Sparkit Auth] __SUPABASE_CLIENT__ error:', e);
        }
      }

      // 方法2: 从 Local Storage 查找 Supabase session
      // 先输出所有 localStorage keys 用于调试
      const allKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        allKeys.push(localStorage.key(i));
      }
      console.log('[Sparkit Auth] All localStorage keys:', allKeys);
      
      // Supabase 存储格式: sb-<project-ref>-auth-token
      // 遍历所有 localStorage keys 查找 Supabase session
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('auth-token') || key.includes('auth') || key.startsWith('sb-'))) {
          try {
            const value = localStorage.getItem(key);
            console.log('[Sparkit Auth] Checking key:', key, 'value length:', value?.length);
            if (value) {
              const sessionData = JSON.parse(value);
              console.log('[Sparkit Auth] Parsed data structure:', Object.keys(sessionData));
              
              // 检查不同的数据结构
              if (sessionData?.access_token) {
                console.log('[Sparkit Auth] ✓ Got token from localStorage key:', key);
                return sessionData.access_token;
              }
              if (sessionData?.currentSession?.access_token) {
                console.log('[Sparkit Auth] ✓ Got token from currentSession:', key);
                return sessionData.currentSession.access_token;
              }
              // Supabase 可能存储为 { access_token: ..., expires_at: ... }
              if (sessionData?.expires_at && sessionData?.access_token) {
                console.log('[Sparkit Auth] ✓ Got token from session data:', key);
                return sessionData.access_token;
              }
              // 检查是否有嵌套的 session 对象
              if (sessionData?.session?.access_token) {
                console.log('[Sparkit Auth] ✓ Got token from nested session:', key);
                return sessionData.session.access_token;
              }
            }
          } catch (e) {
            console.log('[Sparkit Auth] Parse error for key', key, ':', e.message);
            // 忽略解析错误，继续查找
          }
        }
      }

      // 方法3: 尝试调用 Supabase API 获取 session（如果页面已加载 Supabase）
      if (window.supabase && window.supabase.auth) {
        try {
          const { data: { session } } = await window.supabase.auth.getSession();
          if (session?.access_token) {
            console.log('[Sparkit Auth] Got token from window.supabase');
            return session.access_token;
          }
        } catch (e) {
          console.log('[Sparkit Auth] window.supabase error:', e);
        }
      }

      // 方法4: 尝试从 React Context 或全局变量获取（如果页面已加载）
      // 检查是否有全局的 auth context
      if (window.__REACT_AUTH_CONTEXT__) {
        const authContext = window.__REACT_AUTH_CONTEXT__;
        if (authContext.accessToken) {
          console.log('[Sparkit Auth] Got token from React context');
          return authContext.accessToken;
        }
      }

      console.log('[Sparkit Auth] No token found');
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
        console.log('[Sparkit Auth] Sending token to extension:', accessToken ? 'Found' : 'Not found');
        sendResponse({ accessToken });
      }).catch(error => {
        console.error('[Sparkit Auth] Error:', error);
        sendResponse({ accessToken: null });
      });
      return true; // 保持消息通道开放（异步响应）
    }
    return false;
  });

  // 页面加载完成后，尝试立即获取一次 token 并通知插件
  if (document.readyState === 'complete') {
    getAccessToken().then(token => {
      if (token) {
        chrome.runtime.sendMessage({
          action: 'tokenUpdated',
          accessToken: token
        }).catch(() => {
          // 忽略错误（插件可能未安装）
        });
      }
    });
  } else {
    window.addEventListener('load', () => {
      setTimeout(async () => {
        const token = await getAccessToken();
        if (token) {
          chrome.runtime.sendMessage({
            action: 'tokenUpdated',
            accessToken: token
          }).catch(() => {
            // 忽略错误
          });
        }
      }, 2000); // 等待页面完全加载
    });
  }

  // 监听 Local Storage 变化，通知插件更新
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    // 检查是否是 Supabase auth token 或任何包含 'auth' 的 key
    if (key && (key.includes('auth-token') || key.includes('auth') || key.startsWith('sb-'))) {
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
      }, 200);
    }
  };

  // 监听 storage 事件（跨标签页同步）
  window.addEventListener('storage', async (e) => {
    if (e.key && (e.key.includes('auth-token') || e.key.includes('auth') || e.key.startsWith('sb-'))) {
      const token = await getAccessToken();
      if (token) {
        chrome.runtime.sendMessage({
          action: 'tokenUpdated',
          accessToken: token
        }).catch(() => {
          // 忽略错误
        });
      }
    }
  });

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

