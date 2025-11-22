// Background service worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('Sparkit Mimic extension installed');
});

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateMimic') {
    // 处理生成请求
    handleGenerateMimic(request.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 异步响应
  }
});

async function handleGenerateMimic(data) {
  // 这里可以添加额外的处理逻辑
  // 目前主要逻辑在 content script 中
  return data;
}

