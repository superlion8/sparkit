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
        // 尝试多次，因为 content script 可能需要时间加载
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            if (attempt > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'getAuthToken' });
            if (response && response.accessToken) {
              token = response.accessToken;
              console.log(`Got token from Sparkit tab (attempt ${attempt + 1})`);
              break;
            }
          } catch (error) {
            console.log(`Attempt ${attempt + 1} failed:`, error.message);
            if (attempt === 2) {
              // 最后一次尝试失败，显示详细错误
              statusDiv.textContent = `无法连接到 Sparkit 网站。请确保 Sparkit 网站已打开并刷新页面。`;
              statusDiv.className = 'status error';
            }
          }
        }
      } else {
        console.log('No Sparkit tabs found');
        statusDiv.textContent = '未找到 Sparkit 网站标签页。请先打开 https://sparkiai.com 并登录。';
        statusDiv.className = 'status error';
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

