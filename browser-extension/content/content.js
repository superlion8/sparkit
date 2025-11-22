// Content script for detecting images and showing Mimic button

(function() {
  'use strict';

  const API_BASE_URL = 'https://sparkiai.com'; // 或者从配置中读取
  let accessToken = null;
  let characters = [];
  let lastSelectedCharacterId = null;
  let mimicButtons = new Map();

  // 从 Sparkit 网站读取登录状态
  // Content script 无法直接使用 chrome.tabs.query，需要通过 background script
  async function getAuthTokenFromSparkit() {
    try {
      // 方法1: 从 storage 读取缓存的 token（最快）
      let cachedToken = null;
      try {
        const result = await new Promise((resolve, reject) => {
          chrome.storage.local.get(['accessToken'], (items) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(items);
            }
          });
        });
        if (result && result.accessToken) {
          console.log('[Sparkit Mimic] ✓ Using cached token from storage');
          cachedToken = result.accessToken;
          return cachedToken;
        } else {
          console.log('[Sparkit Mimic] No cached token in storage');
        }
      } catch (storageError) {
        console.error('[Sparkit Mimic] Error reading from storage:', storageError);
        // 继续尝试其他方法
      }
      
      // 方法2: 通过 background script 获取 token
      try {
        const response = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({ action: 'getAuthToken' }, (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          });
        });
        
        if (response && response.accessToken) {
          console.log('[Sparkit Mimic] ✓ Got token from background script');
          // 缓存 token
          try {
            await new Promise((resolve, reject) => {
              chrome.storage.local.set({ accessToken: response.accessToken }, () => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                } else {
                  resolve();
                }
              });
            });
          } catch (setError) {
            console.error('[Sparkit Mimic] Error saving token to storage:', setError);
          }
          return response.accessToken;
        } else {
          console.log('[Sparkit Mimic] No token from background script:', response);
        }
      } catch (error) {
        console.log('[Sparkit Mimic] Could not get token from background script:', error.message || error);
      }
      
      // 如果都没有，返回缓存的 token（如果有）
      return cachedToken;
    } catch (error) {
      console.error('[Sparkit Mimic] Error getting auth token:', error);
      console.error('[Sparkit Mimic] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return null;
    }
  }

  // 初始化：获取 token 和角色列表
  async function init() {
    try {
      // 从 storage 获取上次选择的角色
      const result = await chrome.storage.local.get(['lastSelectedCharacterId']);
      lastSelectedCharacterId = result.lastSelectedCharacterId;

      // 尝试从 Sparkit 网站读取登录状态
      accessToken = await getAuthTokenFromSparkit();
      
      if (accessToken) {
        // 保存到 storage
        try {
          await new Promise((resolve, reject) => {
            chrome.storage.local.set({ accessToken }, () => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve();
              }
            });
          });
        } catch (error) {
          console.error('[Sparkit Mimic] Error saving token:', error);
        }
        await loadCharacters();
      } else {
        console.log('[Sparkit Mimic] No access token found. Please login to Sparkit website.');
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
        // 重新附加按钮，因为现在有角色了
        attachMimicButtons();
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
      // 如果图片还没加载，等待加载完成
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        // 图片还没加载，等待加载完成
        img.addEventListener('load', () => {
          if (img.naturalWidth >= 100 && img.naturalHeight >= 100) {
            // 重新处理这个图片
            img.dataset.sparkitProcessed = 'false';
            attachMimicButtons();
          }
        }, { once: true });
        return;
      }
      if (img.naturalWidth < 100 || img.naturalHeight < 100) return;

      // 找到图片的容器或创建包装器
      let container = img.parentElement;
      let foundWrapper = false;
      
      // 检查是否已经有包装器
      while (container && container !== document.body) {
        if (container.classList.contains('sparkit-image-wrapper')) {
          foundWrapper = true;
          break;
        }
        container = container.parentElement;
      }

      // 如果没有包装器，创建一个
      if (!foundWrapper) {
        const wrapper = document.createElement('div');
        wrapper.className = 'sparkit-image-wrapper';
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        
        // 插入包装器
        if (img.parentNode) {
          img.parentNode.insertBefore(wrapper, img);
          wrapper.appendChild(img);
        } else {
          // 如果图片没有父节点，跳过
          return;
        }
        container = wrapper;
      }

      // 检查是否已经有按钮
      let button = container.querySelector('.sparkit-mimic-button');
      if (!button) {
        // 创建 Mimic 按钮
        button = document.createElement('button');
        button.className = 'sparkit-mimic-button';
        button.textContent = 'Mimic';
        button.style.display = 'none';
        container.appendChild(button);
      }

      // 存储图片和按钮的映射
      mimicButtons.set(img, { button, container });

      // 检查是否已经绑定过事件（通过检查 data 属性）
      if (!container.dataset.sparkitEventsBound) {
        container.dataset.sparkitEventsBound = 'true';
        
        // 鼠标事件
        container.addEventListener('mouseenter', () => {
          const btn = container.querySelector('.sparkit-mimic-button');
          if (btn) {
            if (accessToken && characters.length > 0) {
              btn.style.display = 'block';
            } else {
              console.log('[Sparkit Mimic] Button not shown:', {
                hasToken: !!accessToken,
                charactersCount: characters.length,
                imgSrc: img.src?.substring(0, 50)
              });
            }
          }
        });

        container.addEventListener('mouseleave', () => {
          const btn = container.querySelector('.sparkit-mimic-button');
          if (btn) {
            btn.style.display = 'none';
          }
        });
      }

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
      try {
        await new Promise((resolve, reject) => {
          chrome.storage.local.set({ lastSelectedCharacterId: characterId }, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        });
      } catch (error) {
        console.error('[Sparkit Mimic] Error saving lastSelectedCharacterId:', error);
      }
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
    const shouldOpen = confirm('请先在 Sparkit 网站登录。\n\n点击"确定"打开 Sparkit 网站登录页面。');
    if (shouldOpen) {
      chrome.tabs.create({ url: 'https://sparkiai.com' });
    }
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

  // 监听来自 Sparkit 网站的 token 更新消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'tokenUpdated') {
      accessToken = request.accessToken;
      try {
        chrome.storage.local.set({ accessToken }, () => {
          if (chrome.runtime.lastError) {
            console.error('[Sparkit Mimic] Error saving token update:', chrome.runtime.lastError);
          }
        });
      } catch (error) {
        console.error('[Sparkit Mimic] Error saving token update:', error);
      }
      loadCharacters();
    }
    return true;
  });

  // 定期检查登录状态（每30秒）
  setInterval(async () => {
    const newToken = await getAuthTokenFromSparkit();
    if (newToken && newToken !== accessToken) {
      accessToken = newToken;
      try {
        await new Promise((resolve, reject) => {
          chrome.storage.local.set({ accessToken }, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        });
      } catch (error) {
        console.error('[Sparkit Mimic] Error saving token in interval:', error);
      }
      await loadCharacters();
    }
  }, 30000);

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

