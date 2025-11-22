// Background service worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('Sparkit Mimic extension installed');
});

// 从 Sparkit 网站获取 auth token
async function getAuthTokenFromSparkit() {
  try {
    // 查询 Sparkit 网站的标签页
    const tabs = await chrome.tabs.query({ url: 'https://sparkiai.com/*' });
    
    if (tabs.length > 0) {
      // 向 Sparkit 网站的 content script 发送消息获取 token
      try {
        const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'getAuthToken' });
        if (response && response.accessToken) {
          console.log('[Background] Got token from Sparkit tab');
          // 缓存 token
          await chrome.storage.local.set({ accessToken: response.accessToken });
          return response.accessToken;
        }
      } catch (error) {
        console.log('[Background] Could not get token from Sparkit tab:', error.message);
        // 如果 content script 未加载，等待后重试
        if (error.message && error.message.includes('Could not establish connection')) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          try {
            const retryResponse = await chrome.tabs.sendMessage(tabs[0].id, { action: 'getAuthToken' });
            if (retryResponse && retryResponse.accessToken) {
              await chrome.storage.local.set({ accessToken: retryResponse.accessToken });
              return retryResponse.accessToken;
            }
          } catch (retryError) {
            console.log('[Background] Retry failed:', retryError.message);
          }
        }
      }
    }
    
    // 如果无法从标签页获取，尝试从 storage 读取缓存的 token
    const result = await chrome.storage.local.get(['accessToken']);
    if (result.accessToken) {
      console.log('[Background] Using cached token from storage');
      return result.accessToken;
    }
    
    return null;
  } catch (error) {
    console.error('[Background] Error getting auth token:', error);
    return null;
  }
}

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateMimic') {
    // 处理生成请求
    handleGenerateMimic(request.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 异步响应
  }
  
  if (request.action === 'getAuthToken') {
    // 处理获取 token 请求
    getAuthTokenFromSparkit()
      .then(token => sendResponse({ accessToken: token }))
      .catch(error => {
        console.error('[Background] Error in getAuthToken:', error);
        sendResponse({ accessToken: null });
      });
    return true; // 异步响应
  }
});

async function handleGenerateMimic(data) {
  // 这里可以添加额外的处理逻辑
  // 目前主要逻辑在 content script 中
  return data;
}

// 监听来自 Sparkit 网站的 token 更新消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'tokenUpdated' && request.accessToken) {
    // 缓存 token
    chrome.storage.local.set({ accessToken: request.accessToken });
    console.log('[Background] Token updated from Sparkit website');
  }
});

// 定期检查登录状态（每30秒）
setInterval(async () => {
  const token = await getAuthTokenFromSparkit();
  if (token) {
    console.log('[Background] Token refreshed');
  }
}, 30000);

