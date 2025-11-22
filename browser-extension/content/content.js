// Content script for detecting images and showing Mimic button

(function() {
  'use strict';

  const API_BASE_URL = 'https://sparkiai.com'; // 或者从配置中读取
  let accessToken = null;
  let characters = [];
  let lastSelectedCharacterId = null;
  let mimicButtons = new Map();

  // 初始化：获取 token 和角色列表
  async function init() {
    try {
      // 从 storage 获取 token
      const result = await chrome.storage.local.get(['accessToken', 'lastSelectedCharacterId']);
      accessToken = result.accessToken;
      lastSelectedCharacterId = result.lastSelectedCharacterId;

      if (accessToken) {
        await loadCharacters();
      }
    } catch (error) {
      console.error('[Sparkit Mimic] Init error:', error);
    }
  }

  // 加载角色列表
  async function loadCharacters() {
    if (!accessToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/characters`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        characters = data.characters || [];
        console.log('[Sparkit Mimic] Loaded characters:', characters.length);
      }
    } catch (error) {
      console.error('[Sparkit Mimic] Failed to load characters:', error);
    }
  }

  // 检测图片并添加 Mimic 按钮
  function attachMimicButtons() {
    // 查找所有图片
    const images = document.querySelectorAll('img');
    
    images.forEach((img) => {
      // 跳过已经处理过的图片
      if (img.dataset.sparkitProcessed === 'true') return;
      img.dataset.sparkitProcessed = 'true';

      // 跳过太小的图片（可能是图标）
      if (img.naturalWidth < 100 || img.naturalHeight < 100) return;

      // 找到图片的容器
      let container = img.parentElement;
      while (container && !container.classList.contains('sparkit-image-wrapper')) {
        // 检查容器是否有 position: relative
        const style = window.getComputedStyle(container);
        if (style.position === 'relative' || style.position === 'absolute') {
          break;
        }
        container = container.parentElement;
      }

      // 创建包装器
      if (!container || !container.classList.contains('sparkit-image-wrapper')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'sparkit-image-wrapper';
        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);
        container = wrapper;
      }

      // 创建 Mimic 按钮
      const button = document.createElement('button');
      button.className = 'sparkit-mimic-button';
      button.textContent = 'Mimic';
      button.style.display = 'none';

      container.appendChild(button);

      // 存储图片和按钮的映射
      mimicButtons.set(img, { button, container });

      // 鼠标事件
      container.addEventListener('mouseenter', () => {
        if (accessToken && characters.length > 0) {
          button.style.display = 'block';
        }
      });

      container.addEventListener('mouseleave', () => {
        button.style.display = 'none';
      });

      // 点击事件
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        handleMimicClick(img);
      });
    });
  }

  // 处理 Mimic 点击
  async function handleMimicClick(img) {
    if (!accessToken) {
      showLoginPrompt();
      return;
    }

    if (characters.length === 0) {
      alert('请先在 Sparkit 中创建至少一个角色');
      return;
    }

    // 获取图片 URL
    const imageUrl = img.src || img.dataset.src || img.getAttribute('data-src');
    if (!imageUrl) {
      alert('无法获取图片 URL');
      return;
    }

    // 显示模态框
    showMimicModal(imageUrl);
  }

  // 显示 Mimic 模态框
  function showMimicModal(imageUrl) {
    // 移除已存在的模态框
    const existing = document.querySelector('.sparkit-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'sparkit-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'sparkit-modal';

    modal.innerHTML = `
      <div class="sparkit-modal-header">
        <h2 class="sparkit-modal-title">Mimic 生成</h2>
        <button class="sparkit-modal-close">&times;</button>
      </div>
      <div class="sparkit-modal-content">
        <div class="sparkit-form-group">
          <label class="sparkit-form-label">选择角色</label>
          <select id="sparkit-character-select" class="sparkit-character-select">
            ${characters.map(char => 
              `<option value="${char.id}" ${char.id === lastSelectedCharacterId ? 'selected' : ''}>
                ${char.char_name}
              </option>`
            ).join('')}
          </select>
        </div>
        <div class="sparkit-form-group">
          <div class="sparkit-checkbox-group">
            <input type="checkbox" id="sparkit-keep-background" class="sparkit-checkbox" checked>
            <label for="sparkit-keep-background" class="sparkit-checkbox-label">保留背景图</label>
          </div>
        </div>
        <button id="sparkit-generate-btn" class="sparkit-button">Generate</button>
        <div id="sparkit-status"></div>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // 关闭按钮
    modal.querySelector('.sparkit-modal-close').addEventListener('click', () => {
      overlay.remove();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    // Generate 按钮
    const generateBtn = modal.querySelector('#sparkit-generate-btn');
    generateBtn.addEventListener('click', async () => {
      const characterId = modal.querySelector('#sparkit-character-select').value;
      const keepBackground = modal.querySelector('#sparkit-keep-background').checked;
      
      // 保存选择的角色
      await chrome.storage.local.set({ lastSelectedCharacterId: characterId });
      lastSelectedCharacterId = characterId;

      await generateMimic(imageUrl, characterId, keepBackground, modal);
    });
  }

  // 生成 Mimic
  async function generateMimic(imageUrl, characterId, keepBackground, modal) {
    const statusDiv = modal.querySelector('#sparkit-status');
    const generateBtn = modal.querySelector('#sparkit-generate-btn');
    
    generateBtn.disabled = true;
    statusDiv.innerHTML = '<div class="sparkit-loading">正在生成，请稍候...</div>';

    try {
      // 获取选择的角色
      const character = characters.find(c => c.id === characterId);
      if (!character) {
        throw new Error('角色不存在');
      }

      // 下载参考图片
      const referenceImageBlob = await fetchImageAsBlob(imageUrl);
      const referenceImageFile = blobToFile(referenceImageBlob, 'reference.jpg');

      // 下载角色图片
      // 根据用户要求：优先使用 char_image，如果没有则使用 char_avatar
      // 如果两个都存在，同时上传两个（char_avatar 和 char_image）
      let characterImageFile;
      let charAvatarFile = null;
      
      if (character.char_image) {
        // 有 char_image，使用它作为 characterImage
        const characterImageBlob = await fetchImageAsBlob(character.char_image);
        characterImageFile = blobToFile(characterImageBlob, 'char_image.jpg');
        
        // 如果也有 char_avatar，同时上传
        if (character.char_avatar) {
          const charAvatarBlob = await fetchImageAsBlob(character.char_avatar);
          charAvatarFile = blobToFile(charAvatarBlob, 'char_avatar.jpg');
        }
      } else if (character.char_avatar) {
        // 只有 char_avatar，使用它作为 characterImage
        const characterImageBlob = await fetchImageAsBlob(character.char_avatar);
        characterImageFile = blobToFile(characterImageBlob, 'char_avatar.jpg');
      } else {
        throw new Error('角色图片不存在，请上传角色头像或全身照');
      }

      // 准备 FormData
      const formData = new FormData();
      formData.append('referenceImage', referenceImageFile);
      formData.append('characterImage', characterImageFile);
      if (charAvatarFile) {
        formData.append('charAvatar', charAvatarFile); // 如果有单独的 avatar，也上传
      }
      formData.append('keepBackground', keepBackground.toString());
      formData.append('numImages', '2'); // 默认生成 2 张
      formData.append('aspectRatio', 'default');
      formData.append('characterId', characterId); // 用于保存到角色资源

      // 调用 API
      const response = await fetch(`${API_BASE_URL}/api/generate/mimic`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '生成失败');
      }

      const data = await response.json();
      
      statusDiv.innerHTML = `
        <div class="sparkit-success">
          生成成功！已保存到角色资源中。
        </div>
      `;

      // 3 秒后关闭
      setTimeout(() => {
        document.querySelector('.sparkit-modal-overlay')?.remove();
      }, 3000);

    } catch (error) {
      console.error('[Sparkit Mimic] Generate error:', error);
      statusDiv.innerHTML = `
        <div class="sparkit-error">
          错误: ${error.message}
        </div>
      `;
      generateBtn.disabled = false;
    }
  }

  // 获取图片为 Blob
  async function fetchImageAsBlob(url) {
    // 使用代理 API 避免 CORS 问题
    const proxyUrl = `${API_BASE_URL}/api/download?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch image');
    }
    return await response.blob();
  }

  // Blob 转 File
  function blobToFile(blob, fileName) {
    return new File([blob], fileName, { type: blob.type || 'image/jpeg' });
  }

  // 显示登录提示
  function showLoginPrompt() {
    alert('请先在 Sparkit 网站登录，然后在插件中设置 Access Token');
  }

  // 监听 storage 变化
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.accessToken) {
      accessToken = changes.accessToken.newValue;
      if (accessToken) {
        loadCharacters();
      }
    }
  });

  // 初始化
  init();

  // 定期检测新图片
  setInterval(() => {
    attachMimicButtons();
  }, 2000);

  // 初始检测
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachMimicButtons);
  } else {
    attachMimicButtons();
  }

  // 监听 DOM 变化
  const observer = new MutationObserver(() => {
    attachMimicButtons();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();

