// Background service worker

const API_BASE_URL = 'https://sparkiai.com';

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
  
  if (request.action === 'fetchCharacters') {
    // 代理获取角色列表请求
    fetch(`${API_BASE_URL}/api/characters`, {
      headers: {
        'Authorization': `Bearer ${request.accessToken}`
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then(data => sendResponse(data))
      .catch(error => {
        console.error('[Background] Error fetching characters:', error);
        sendResponse({ error: error.message, characters: [] });
      });
    return true; // 异步响应
  }
  
  if (request.action === 'fetchImage') {
    // 代理获取图片请求
    fetch(`${API_BASE_URL}/api/download?url=${encodeURIComponent(request.url)}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.blob();
      })
      .then(blob => {
        // 将 Blob 转换为 base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result.split(',')[1]; // 移除 data:image/...;base64, 前缀
          sendResponse({ 
            blob: base64data,
            type: blob.type || 'image/jpeg'
          });
        };
        reader.onerror = () => {
          sendResponse({ error: 'Failed to read blob' });
        };
        reader.readAsDataURL(blob);
      })
      .catch(error => {
        console.error('[Background] Error fetching image:', error);
        sendResponse({ error: error.message });
      });
    return true; // 异步响应
  }
  
  if (request.action === 'generateMimic') {
    // 处理生成请求
    handleGenerateMimic(request.formData, request.accessToken)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => {
        console.error('[Background] Error generating mimic:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 异步响应
  }
  
  if (request.action === 'tokenUpdated' && request.accessToken) {
    // 缓存 token
    chrome.storage.local.set({ accessToken: request.accessToken });
    console.log('[Background] Token updated from Sparkit website');
    return false; // 不需要响应
  }
  
  return false;
});

async function handleGenerateMimic(formDataObj, accessToken) {
  // 将 formDataObj 转换回 FormData
  const formData = new FormData();
  
  for (const [key, value] of Object.entries(formDataObj)) {
    if (value && typeof value === 'object' && value.data) {
      // 这是文件数据，需要从 base64 转换回 File
      const base64Data = value.data.split(',')[1] || value.data; // 移除 data URL 前缀（如果有）
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: value.type || 'image/jpeg' });
      const file = new File([blob], value.name || 'file', { type: value.type || 'image/jpeg' });
      formData.append(key, file);
    } else {
      formData.append(key, value);
    }
  }
  
  // 调用 API
  const response = await fetch(`${API_BASE_URL}/api/generate/mimic`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: formData
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: '生成失败' }));
    throw new Error(errorData.error || '生成失败');
  }
  
  return await response.json();
}

// 定期检查登录状态（每30秒）
setInterval(async () => {
  const token = await getAuthTokenFromSparkit();
  if (token) {
    console.log('[Background] Token refreshed');
  }
}, 30000);

