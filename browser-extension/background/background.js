// Background Service Worker - 处理 API 调用和数据管理

console.log('[Sparkit Mimic] Background service worker loaded');

// Sparkit API 配置
const SPARKIT_API_URL = 'https://sparkiai.com'; // 生产环境
// const SPARKIT_API_URL = 'http://localhost:3000'; // 本地开发（如需本地调试，注释上一行，取消注释这一行）

// 已处理的请求 ID 集合（防止服务工作线程重启后重复处理）
// 使用内存缓存 + 持久化存储双重保护
let processedRequestIds = new Set();
// 最多保留 100 个请求 ID，超过后清理旧的
const MAX_PROCESSED_IDS = 100;

// 从存储中恢复已处理的请求 ID
chrome.storage.local.get(['processedRequestIds'], (result) => {
  if (result.processedRequestIds && Array.isArray(result.processedRequestIds)) {
    processedRequestIds = new Set(result.processedRequestIds);
    console.log('[Sparkit Mimic] Restored', processedRequestIds.size, 'processed request IDs from storage');
  }
});

// 保存已处理的请求 ID 到存储
function saveProcessedRequestIds() {
  const idsArray = Array.from(processedRequestIds);
  chrome.storage.local.set({ processedRequestIds: idsArray });
}

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Sparkit Mimic] Received message:', request.action);
  
  switch (request.action) {
    case 'getCharacters':
      handleGetCharacters(sendResponse);
      return true; // 保持消息通道开启
      
    case 'getCharacter':
      handleGetCharacter(request.characterId, sendResponse);
      return true;
      
    case 'generateMimic':
      // 检查是否已处理过该请求（防止服务工作线程重启后重复处理）
      if (request.requestId && processedRequestIds.has(request.requestId)) {
        console.log('[Sparkit Mimic] Duplicate request detected, skipping:', request.requestId);
        sendResponse({ success: false, error: 'Duplicate request', duplicate: true });
        return true;
      }
      // 记录请求 ID
      if (request.requestId) {
        processedRequestIds.add(request.requestId);
        console.log('[Sparkit Mimic] Registered request ID:', request.requestId);
        // 清理旧的请求 ID
        if (processedRequestIds.size > MAX_PROCESSED_IDS) {
          const idsArray = Array.from(processedRequestIds);
          for (let i = 0; i < idsArray.length - MAX_PROCESSED_IDS; i++) {
            processedRequestIds.delete(idsArray[i]);
          }
        }
        // 保存到持久化存储
        saveProcessedRequestIds();
      }
      handleGenerateMimic(request.data, request.requestId, sendResponse);
      return true;
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// 获取所有角色
async function handleGetCharacters(sendResponse) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('未登录，请先在 Sparkit 网站登录');
    }
    
    const response = await fetch(`${SPARKIT_API_URL}/api/characters`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`获取角色列表失败: ${response.status}`);
    }
    
    const data = await response.json();
    sendResponse({ success: true, characters: data.characters || [] });
  } catch (error) {
    console.error('[Sparkit Mimic] Failed to get characters:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 获取单个角色详情
async function handleGetCharacter(characterId, sendResponse) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('未登录，请先在 Sparkit 网站登录');
    }
    
    const response = await fetch(`${SPARKIT_API_URL}/api/characters/${characterId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`获取角色详情失败: ${response.status}`);
    }
    
    const data = await response.json();
    sendResponse({ success: true, character: data.character });
  } catch (error) {
    console.error('[Sparkit Mimic] Failed to get character:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 生成 Mimic
async function handleGenerateMimic(data, requestId, sendResponse) {
  console.log('[Sparkit Mimic BG] ========== GENERATE START ==========');

  try {
    console.log('[Sparkit Mimic BG] Starting Mimic generation...');
    console.log('[Sparkit Mimic BG] Request ID:', requestId);
    console.log('[Sparkit Mimic BG] Data:', {
      characterId: data.characterId,
      keepBackground: data.keepBackground,
      numImages: data.numImages,
      blobSize: data.referenceImageBlob?.length || 0
    });
    
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('未登录，请先在 Sparkit 网站登录');
    }
    console.log('[Sparkit Mimic BG] Access token found');
    
    // 获取角色信息
    console.log('[Sparkit Mimic BG] Fetching character info...');
    const characterResponse = await fetch(`${SPARKIT_API_URL}/api/characters/${data.characterId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!characterResponse.ok) {
      const errorText = await characterResponse.text();
      console.error('[Sparkit Mimic BG] Character fetch failed:', characterResponse.status, errorText);
      throw new Error(`获取角色信息失败: ${characterResponse.status}`);
    }
    
    const characterData = await characterResponse.json();
    const character = characterData.character;
    console.log('[Sparkit Mimic BG] Character loaded:', {
      id: character.id,
      name: character.char_name,
      hasImage: !!character.char_image,
      hasAvatar: !!character.char_avatar
    });
    
    // 准备表单数据
    console.log('[Sparkit Mimic BG] Preparing form data...');
    const formData = new FormData();
    
    // 将 base64 转换为 File
    const referenceImageFile = await base64ToFile(
      data.referenceImageBlob,
      'reference-image.jpg'
    );
    formData.append('referenceImage', referenceImageFile);
    console.log('[Sparkit Mimic BG] Reference image file created:', referenceImageFile.size);
    
    // 获取角色图片（优先使用 char_image，如果没有则使用 char_avatar）
    const characterImageUrl = character.char_image || character.char_avatar;
    if (!characterImageUrl) {
      throw new Error('角色没有图片，请在 Sparkit 上传角色图片');
    }
    
    console.log('[Sparkit Mimic BG] Downloading character image from:', characterImageUrl);
    const charImageBlob = await fetch(characterImageUrl).then(r => r.blob());
    const charImageFile = new File([charImageBlob], 'character-image.jpg', {
      type: 'image/jpeg'
    });
    formData.append('characterImage', charImageFile);
    console.log('[Sparkit Mimic BG] Character image file created:', charImageFile.size);
    
    // 如果同时有 char_avatar 和 char_image，也添加 avatar
    if (character.char_avatar && character.char_image) {
      console.log('[Sparkit Mimic BG] Downloading character avatar from:', character.char_avatar);
      const charAvatarBlob = await fetch(character.char_avatar).then(r => r.blob());
      const charAvatarFile = new File([charAvatarBlob], 'character-avatar.jpg', {
        type: 'image/jpeg'
      });
      formData.append('charAvatar', charAvatarFile);
      console.log('[Sparkit Mimic BG] Character avatar file created:', charAvatarFile.size);
    }
    
    // 添加其他参数
    formData.append('keepBackground', data.keepBackground.toString());
    formData.append('numImages', data.numImages.toString());
    formData.append('aspectRatio', 'default');
    formData.append('characterId', data.characterId);
    // 添加请求ID用于去重
    if (requestId) {
      formData.append('requestId', requestId);
    }
    
    console.log('[Sparkit Mimic BG] Calling Mimic API:', `${SPARKIT_API_URL}/api/generate/mimic`);
    
    // 调用 Mimic API
    const response = await fetch(`${SPARKIT_API_URL}/api/generate/mimic`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: formData
    });
    
    console.log('[Sparkit Mimic BG] Mimic API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Sparkit Mimic BG] Mimic API error:', response.status, errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText };
      }
      throw new Error(errorData.error || `生成失败: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('[Sparkit Mimic BG] Generation completed, result keys:', Object.keys(result));
    
    // 处理结果
    const results = [];
    
    // 合并 URL 和 base64 结果
    const finalImageUrls = result.finalImageUrls || [];
    const finalImagesBase64 = result.finalImagesBase64 || [];
    let base64Index = 0;
    
    for (let i = 0; i < finalImageUrls.length; i++) {
      let imageUrl;
      if (finalImageUrls[i]) {
        imageUrl = finalImageUrls[i];
      } else if (base64Index < finalImagesBase64.length) {
        imageUrl = finalImagesBase64[base64Index];
        base64Index++;
      } else {
        continue;
      }
      
      results.push({
        imageUrl: imageUrl,
        characterId: data.characterId,
        keepBackground: data.keepBackground
      });
    }
    
    console.log('[Sparkit Mimic BG] Processed results:', results.length, 'images');
    sendResponse({ success: true, results: results });
  } catch (error) {
    console.error('[Sparkit Mimic BG] Generation failed:', error);
    console.error('[Sparkit Mimic BG] Error stack:', error.stack);
    sendResponse({ success: false, error: error.message });
  }
}

// 获取访问令牌
async function getAccessToken() {
  try {
    // 从 Chrome Storage 获取
    const result = await chrome.storage.local.get(['sparkitAccessToken']);
    if (result.sparkitAccessToken) {
      return result.sparkitAccessToken;
    }
    
    // 尝试从 Sparkit 网站的 Cookie 或 LocalStorage 获取
    // 注意：需要在 manifest.json 中添加对应的权限
    const tabs = await chrome.tabs.query({ url: `${SPARKIT_API_URL}/*` });
    if (tabs.length > 0) {
      const tabId = tabs[0].id;
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          // 尝试从 localStorage 获取 Supabase token
          const supabaseAuthStorage = localStorage.getItem('sb-dev-auth-token');
          if (supabaseAuthStorage) {
            try {
              const authData = JSON.parse(supabaseAuthStorage);
              return authData.access_token;
            } catch (e) {
              return null;
            }
          }
          return null;
        }
      });
      
      if (results && results[0] && results[0].result) {
        const token = results[0].result;
        // 保存到 storage
        await chrome.storage.local.set({ sparkitAccessToken: token });
        return token;
      }
    }
    
    return null;
  } catch (error) {
    console.error('[Sparkit Mimic] Failed to get access token:', error);
    return null;
  }
}

// Base64 转 File
async function base64ToFile(base64Data, filename) {
  const base64String = base64Data.split(',')[1] || base64Data;
  const mimeMatch = base64Data.match(/data:(.*?);base64/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  
  const byteString = atob(base64String);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  
  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }
  
  const blob = new Blob([arrayBuffer], { type: mimeType });
  return new File([blob], filename, { type: mimeType });
}

// 监听来自 Sparkit 网站的认证状态变化
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setAccessToken') {
    chrome.storage.local.set({ sparkitAccessToken: request.token });
    sendResponse({ success: true });
  }
});

