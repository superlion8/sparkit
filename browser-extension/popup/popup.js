// Popup script for settings

document.addEventListener('DOMContentLoaded', async () => {
  const tokenInput = document.getElementById('access-token');
  const saveBtn = document.getElementById('save-btn');
  const statusDiv = document.getElementById('status');

  // 加载已保存的 token
  const result = await chrome.storage.local.get(['accessToken']);
  if (result.accessToken) {
    tokenInput.value = result.accessToken;
  }

  // 保存按钮
  saveBtn.addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    
    if (!token) {
      showStatus('请输入 Access Token', 'error');
      return;
    }

    try {
      // 验证 token 是否有效
      const response = await fetch('https://sparkiai.com/api/characters', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Token 无效，请检查是否正确');
      }

      // 保存 token
      await chrome.storage.local.set({ accessToken: token });
      
      // 通知 content script 刷新
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'refreshToken' });
      });

      showStatus('保存成功！', 'success');
    } catch (error) {
      showStatus(`错误: ${error.message}`, 'error');
    }
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.className = '';
    }, 3000);
  }
});

