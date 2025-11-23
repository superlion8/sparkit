document.addEventListener('DOMContentLoaded', async () => {
  const tokenInput = document.getElementById('token');
  const saveBtn = document.getElementById('save');
  const msg = document.getElementById('msg');

  // Load existing
  const { authToken } = await chrome.storage.local.get("authToken");
  if (authToken) {
    tokenInput.value = authToken;
  }

  saveBtn.addEventListener('click', () => {
    const token = tokenInput.value.trim();
    if (token) {
      chrome.storage.local.set({ authToken: token }, () => {
        msg.style.display = 'block';
        setTimeout(() => msg.style.display = 'none', 2000);
      });
    }
  });
});

