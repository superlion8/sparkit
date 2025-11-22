// Popup script for settings

document.addEventListener('DOMContentLoaded', async () => {
  const tokenInput = document.getElementById('access-token');
  const refreshBtn = document.getElementById('refresh-btn');
  const statusDiv = document.getElementById('status');

  // 从 Sparkit 网站读取登录状态
  async function refreshAuthToken() {
    try {
      statusDiv.textContent = '正在读取登录状态...';
      statusDiv.className = 'status';

      // 尝试从 Sparkit 网站的标签页读取 token
      const tabs = await chrome.tabs.query({ url: 'https://sparkiai.com/*' });
      
      let token = null;
      
      if (tabs.length > 0) {
        try {
          const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'getAuthToken' });
          if (response && response.accessToken) {
            token = response.accessToken;
            console.log('Got token from Sparkit tab');
          }
        } catch (error) {
          console.log('Could not get token from Sparkit tab:', error.message);
          // 如果 content script 未加载，等待后重试
          if (error.message.includes('Could not establish connection')) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            try {
              const retryResponse = await chrome.tabs.sendMessage(tabs[0].id, { action: 'getAuthToken' });
              if (retryResponse && retryResponse.accessToken) {
                token = retryResponse.accessToken;
              }
            } catch (retryError) {
              console.log('Retry failed:', retryError.message);
            }
          }
        }
      } else {
        console.log('No Sparkit tabs found');
      }

      // 如果无法从标签页获取，尝试从 storage 读取
      if (!token) {
        const result = await chrome.storage.local.get(['accessToken']);
        token = result.accessToken || null;
      }

      if (token) {
        // 验证 token 是否有效
        try {
          const response = await fetch('https://sparkiai.com/api/characters', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            tokenInput.value = token.substring(0, 20) + '...'; // 只显示前20个字符
            await chrome.storage.local.set({ accessToken: token });
            showStatus('登录状态已读取！', 'success');
            
            // 通知 content script 刷新
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'refreshToken' }).catch(() => {
                  // 忽略错误（可能不在支持的网站）
                });
              }
            });
          } else {
            throw new Error('Token 已过期，请重新登录');
          }
        } catch (error) {
          showStatus(`Token 验证失败: ${error.message}`, 'error');
          tokenInput.value = '';
        }
      } else {
        tokenInput.value = '';
        showStatus('未检测到登录状态。请在 Sparkit 网站登录后重试。', 'error');
      }
    } catch (error) {
      console.error('Error refreshing auth token:', error);
      showStatus(`错误: ${error.message}`, 'error');
    }
  }

  // 刷新按钮
  refreshBtn.addEventListener('click', refreshAuthToken);

  // 初始加载
  await refreshAuthToken();

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    if (type === 'success') {
      setTimeout(() => {
        statusDiv.textContent = '';
        statusDiv.className = '';
      }, 3000);
    }
  }
});

