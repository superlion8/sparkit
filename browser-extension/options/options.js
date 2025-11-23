// Options page script

document.getElementById('clear-cache').addEventListener('click', async () => {
  await chrome.storage.local.clear();
  const successEl = document.getElementById('clear-success');
  successEl.style.display = 'block';
  setTimeout(() => {
    successEl.style.display = 'none';
  }, 3000);
});

document.getElementById('sync-token').addEventListener('click', async () => {
  try {
    const SPARKIT_API_URL = 'https://sparkiai.com';
    const [tab] = await chrome.tabs.query({ url: `${SPARKIT_API_URL}/*` });
    
    if (tab) {
      await chrome.tabs.sendMessage(tab.id, { type: 'REQUEST_TOKEN_SYNC' });
      const successEl = document.getElementById('sync-success');
      successEl.textContent = '✅ 同步成功！';
      successEl.style.display = 'block';
      setTimeout(() => {
        successEl.style.display = 'none';
      }, 3000);
    } else {
      alert('请先打开 Sparkit 网站并登录');
    }
  } catch (error) {
    alert('同步失败，请确保已打开 Sparkit 网站');
  }
});

