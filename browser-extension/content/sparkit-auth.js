// Content script for Sparkit website - reads auth token automatically

(function() {
  'use strict';

  // 监听来自插件的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getAuthToken') {
      // 从 Local Storage 读取 accessToken
      const accessToken = localStorage.getItem('accessToken');
      sendResponse({ accessToken });
    }
    return true; // 保持消息通道开放
  });

  // 监听 Local Storage 变化，通知插件更新
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    if (key === 'accessToken') {
      // 通知插件 token 已更新
      chrome.runtime.sendMessage({
        action: 'tokenUpdated',
        accessToken: value
      }).catch(() => {
        // 忽略错误（插件可能未安装）
      });
    }
  };
})();

