// Content Script V2 - 将按钮直接插入图片容器，模仿 Pinterest 的实现
console.log('[Sparkit Mimic V2] Content script loaded');

// 全局状态
let currentHoveredImage = null;
let mimicModal = null;
let isModalOpen = false;
let processedImages = new WeakSet(); // 记录已处理的图片
let mimicButton = null; // 单个全局按钮
let hideButtonTimer = null;

// 初始化
function init() {
  console.log('[Sparkit Mimic V2] Initializing...');
  
  // 创建全局 Mimic 按钮
  createMimicButton();
  
  // 创建 Mimic 模态框
  createMimicModal();
  
  // 使用 Mutation Observer 监听新加载的图片
  setupImageObserver();
  
  // 处理已存在的图片
  processExistingImages();
  
  // 监听滚动，实时更新按钮位置
  setupScrollListener();
  
  console.log('[Sparkit Mimic V2] Initialized successfully');
}

// 监听滚动，更新按钮位置
function setupScrollListener() {
  let scrollTimer = null;
  
  const updateOnScroll = () => {
    if (currentHoveredImage && mimicButton.style.opacity === '1') {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        updateButtonPosition(mimicButton, currentHoveredImage);
      }, 10); // 节流
    }
  };
  
  window.addEventListener('scroll', updateOnScroll, true);
  window.addEventListener('resize', updateOnScroll);
}

// 创建全局 Mimic 按钮（只创建一次）
function createMimicButton() {
  mimicButton = document.createElement('div');
  mimicButton.className = 'sparkit-mimic-overlay';
  mimicButton.style.cssText = `
    position: fixed !important;
    z-index: 99999 !important;
    opacity: 0 !important;
    transition: opacity 0.15s ease !important;
    pointer-events: none !important;
  `;
  mimicButton.innerHTML = `
    <div class="sparkit-mimic-btn-inline">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
        <path d="M2 17l10 5 10-5"></path>
        <path d="M2 12l10 5 10-5"></path>
      </svg>
      <span>Mimic</span>
    </div>
  `;
  
  // 点击事件
  mimicButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[Sparkit Mimic V2] Button clicked, currentHoveredImage:', currentHoveredImage);
    if (currentHoveredImage) {
      console.log('[Sparkit Mimic V2] Opening modal...');
      openMimicModal();
    } else {
      console.error('[Sparkit Mimic V2] No currentHoveredImage when button clicked!');
    }
  });
  
  // 按钮自身的 hover 处理
  mimicButton.addEventListener('mouseenter', () => {
    console.log('[Sparkit Mimic V2] Button mouseenter, currentHoveredImage:', currentHoveredImage);
    if (hideButtonTimer) {
      clearTimeout(hideButtonTimer);
      hideButtonTimer = null;
    }
    // 保持按钮可见，不清空 currentHoveredImage
    mimicButton.style.opacity = '1';
    mimicButton.style.pointerEvents = 'auto';
  });
  
  mimicButton.addEventListener('mouseleave', () => {
    console.log('[Sparkit Mimic V2] Button mouseleave');
    hideMimicButton();
  });
  
  document.body.appendChild(mimicButton);
  console.log('[Sparkit Mimic V2] Global button created');
}

// 更新按钮位置（fixed 定位跟随图片右下角）
function updateButtonPosition(button, imgElement) {
  const rect = imgElement.getBoundingClientRect();
  const currentOpacity = button.style.opacity;
  const currentPointerEvents = button.style.pointerEvents;
  
  // 按钮放在图片右下角，留8px边距
  button.style.cssText = `
    position: fixed !important;
    top: ${rect.bottom - 40}px !important;
    left: ${rect.right - 85}px !important;
    z-index: 99999 !important;
    opacity: ${currentOpacity} !important;
    transition: opacity 0.15s ease !important;
    pointer-events: ${currentPointerEvents} !important;
  `;
}

// 处理页面上已存在的图片
function processExistingImages() {
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    if (img.complete && img.naturalHeight > 0) {
      tryAddMimicButtonToImage(img);
    } else {
      img.addEventListener('load', () => tryAddMimicButtonToImage(img), { once: true });
    }
  });
}

// 为图片添加 hover 监听（移动全局按钮到图片位置）
function tryAddMimicButtonToImage(imgElement) {
  // 检查图片是否足够大
  const rect = imgElement.getBoundingClientRect();
  if (rect.width < 150 || rect.height < 150) return;
  
  // 排除 Sparkit 插件自己的元素
  if (imgElement.closest('#sparkit-mimic-modal')) return;
  
  // 避免重复处理
  if (processedImages.has(imgElement)) return;
  processedImages.add(imgElement);
  
  // 监听图片的 hover
  imgElement.addEventListener('mouseenter', () => {
    console.log('[Sparkit Mimic V2] Image mouseenter');
    currentHoveredImage = imgElement;
    showMimicButton(imgElement);
  });
  
  imgElement.addEventListener('mouseleave', (e) => {
    console.log('[Sparkit Mimic V2] Image mouseleave, relatedTarget:', e.relatedTarget);
    // 延迟隐藏，给鼠标移动到按钮的时间
    setTimeout(() => {
      // 检查按钮是否正在被 hover
      const buttonRect = mimicButton.getBoundingClientRect();
      const isButtonHovered = mimicButton.matches(':hover');
      
      console.log('[Sparkit Mimic V2] Delayed check - button hovered:', isButtonHovered);
      
      if (!isButtonHovered) {
        hideMimicButton();
      }
    }, 50); // 短暂延迟
  });
  
  console.log('[Sparkit Mimic V2] Added hover listener to image:', {
    imgSrc: imgElement.src.substring(0, 50) + '...',
    imgSize: `${rect.width}x${rect.height}`
  });
}

// 显示 Mimic 按钮（移动到图片位置）
function showMimicButton(imgElement) {
  console.log('[Sparkit Mimic V2] Showing button for image:', imgElement.src.substring(0, 50));
  if (hideButtonTimer) {
    clearTimeout(hideButtonTimer);
    hideButtonTimer = null;
  }
  
  updateButtonPosition(mimicButton, imgElement);
  mimicButton.style.opacity = '1';
  mimicButton.style.pointerEvents = 'auto';
}

// 隐藏 Mimic 按钮
function hideMimicButton() {
  if (hideButtonTimer) {
    clearTimeout(hideButtonTimer);
  }
  
  hideButtonTimer = setTimeout(() => {
    // 再次检查按钮是否被 hover（双重保险）
    const isButtonHovered = mimicButton.matches(':hover');
    console.log('[Sparkit Mimic V2] Hiding button check - isModalOpen:', isModalOpen, ', buttonHovered:', isButtonHovered);
    
    if (!isModalOpen && !isButtonHovered) {
      mimicButton.style.opacity = '0';
      mimicButton.style.pointerEvents = 'none';
      // 延迟清空 currentHoveredImage，确保点击事件有时间执行
      setTimeout(() => {
        if (mimicButton.style.opacity === '0' && !mimicButton.matches(':hover')) {
          console.log('[Sparkit Mimic V2] Clearing currentHoveredImage');
          currentHoveredImage = null;
        }
      }, 200);
    } else {
      console.log('[Sparkit Mimic V2] Button still hovered or modal open, keeping visible');
    }
  }, 150);
}

// 使用 Mutation Observer 监听新加载的图片
function setupImageObserver() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // ELEMENT_NODE
          // 检查节点本身是否是图片
          if (node.tagName === 'IMG') {
            if (node.complete && node.naturalHeight > 0) {
              tryAddMimicButtonToImage(node);
            } else {
              node.addEventListener('load', () => tryAddMimicButtonToImage(node), { once: true });
            }
          }
          // 检查节点的子元素中是否有图片
          const images = node.querySelectorAll && node.querySelectorAll('img');
          if (images && images.length > 0) {
            images.forEach(img => {
              if (img.complete && img.naturalHeight > 0) {
                tryAddMimicButtonToImage(img);
              } else {
                img.addEventListener('load', () => tryAddMimicButtonToImage(img), { once: true });
              }
            });
          }
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('[Sparkit Mimic V2] Image observer started');
}

// 创建 Mimic 模态框
function createMimicModal() {
  mimicModal = document.createElement('div');
  mimicModal.id = 'sparkit-mimic-modal';
  mimicModal.className = 'sparkit-modal';
  mimicModal.style.display = 'none';
  mimicModal.innerHTML = `
    <div class="sparkit-modal-overlay"></div>
    <div class="sparkit-modal-content">
      <div class="sparkit-modal-header">
        <h2>Mimic 角色替换</h2>
        <button class="sparkit-modal-close">&times;</button>
      </div>
      <div class="sparkit-modal-body">
        <!-- 预览区域 -->
        <div class="sparkit-preview-section">
          <div class="sparkit-preview-item">
            <div class="sparkit-preview-label">参考图片</div>
            <div class="sparkit-preview-image" id="sparkit-reference-preview">
              <img src="" alt="Reference Image">
            </div>
          </div>
          <div class="sparkit-preview-arrow">→</div>
          <div class="sparkit-preview-item">
            <div class="sparkit-preview-label">生成结果</div>
            <div class="sparkit-preview-image" id="sparkit-result-preview">
              <div class="sparkit-placeholder">等待生成...</div>
            </div>
          </div>
        </div>
        
        <!-- 设置区域 -->
        <div class="sparkit-settings-section">
          <!-- 角色选择 -->
          <div class="sparkit-form-group">
            <label>选择角色</label>
            <div class="sparkit-character-selector">
              <div id="sparkit-character-list" class="sparkit-character-list">
                <div class="sparkit-loading">加载角色中...</div>
              </div>
              <button id="sparkit-change-character" class="sparkit-btn-secondary">
                切换角色
              </button>
            </div>
            <div id="sparkit-selected-character" class="sparkit-selected-character">
              <span>请选择角色</span>
            </div>
          </div>
          
          <!-- 保留背景选项 -->
          <div class="sparkit-form-group">
            <label class="sparkit-checkbox-label">
              <input type="checkbox" id="sparkit-keep-background" checked>
              <span>保留背景</span>
            </label>
            <p class="sparkit-help-text">勾选后将使用参考图的背景，取消勾选则只使用场景描述生成背景</p>
          </div>
        </div>
        
        <!-- 生成进度 -->
        <div id="sparkit-progress-section" class="sparkit-progress-section" style="display: none;">
          <div class="sparkit-progress-bar">
            <div class="sparkit-progress-fill" id="sparkit-progress-fill"></div>
          </div>
          <div class="sparkit-progress-text" id="sparkit-progress-text">准备中...</div>
        </div>
        
        <!-- 错误提示 -->
        <div id="sparkit-error-section" class="sparkit-error-section" style="display: none;">
          <div class="sparkit-error-icon">⚠️</div>
          <div class="sparkit-error-text" id="sparkit-error-text"></div>
        </div>
      </div>
      <div class="sparkit-modal-footer">
        <button id="sparkit-cancel-btn" class="sparkit-btn-secondary">取消</button>
        <button id="sparkit-generate-btn" class="sparkit-btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
          </svg>
          <span>生成 (2张)</span>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(mimicModal);
  
  // 绑定事件
  mimicModal.querySelector('.sparkit-modal-overlay').addEventListener('click', closeMimicModal);
  mimicModal.querySelector('.sparkit-modal-close').addEventListener('click', closeMimicModal);
  mimicModal.querySelector('#sparkit-cancel-btn').addEventListener('click', closeMimicModal);
  mimicModal.querySelector('#sparkit-generate-btn').addEventListener('click', handleGenerate);
  mimicModal.querySelector('#sparkit-change-character').addEventListener('click', showCharacterList);
}

// 打开 Mimic 模态框
async function openMimicModal() {
  if (!currentHoveredImage) {
    console.error('[Sparkit Mimic] No image selected');
    return;
  }
  
  isModalOpen = true;
  mimicModal.style.display = 'block';
  
  // 设置预览图
  const previewImg = mimicModal.querySelector('#sparkit-reference-preview img');
  previewImg.src = currentHoveredImage.src;
  
  // 重置状态
  hideProgress();
  hideError();
  mimicModal.querySelector('#sparkit-result-preview').innerHTML = '<div class="sparkit-placeholder">等待生成...</div>';
  
  // 加载角色列表
  await loadCharacters();
  
  // 尝试加载上次选择的角色
  await loadLastSelectedCharacter();
}

// 关闭 Mimic 模态框
function closeMimicModal() {
  isModalOpen = false;
  mimicModal.style.display = 'none';
  currentHoveredImage = null;
}

// 加载角色列表
async function loadCharacters() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getCharacters' });
    
    if (response.success) {
      displayCharacters(response.characters);
    } else {
      showError('获取角色列表失败：' + (response.error || '未知错误'));
    }
  } catch (error) {
    console.error('[Sparkit Mimic] Failed to load characters:', error);
    showError('获取角色列表失败');
  }
}

// 显示角色列表
function displayCharacters(characters) {
  const characterList = mimicModal.querySelector('#sparkit-character-list');
  
  if (!characters || characters.length === 0) {
    characterList.innerHTML = '<div class="sparkit-empty">暂无角色，请先在 Sparkit 创建角色</div>';
    return;
  }
  
  characterList.innerHTML = characters.map(character => `
    <div class="sparkit-character-item" data-character-id="${character.id}">
      <img src="${character.char_avatar || character.char_image}" alt="${character.char_name}">
      <div class="sparkit-character-info">
        <div class="sparkit-character-name">${character.char_name}</div>
        ${character.description ? `<div class="sparkit-character-desc">${character.description}</div>` : ''}
      </div>
    </div>
  `).join('');
  
  // 绑定点击事件
  characterList.querySelectorAll('.sparkit-character-item').forEach(item => {
    item.addEventListener('click', () => {
      const characterId = item.dataset.characterId;
      selectCharacter(characterId);
    });
  });
}

// 选择角色
async function selectCharacter(characterId) {
  try {
    // 获取角色详情
    const response = await chrome.runtime.sendMessage({
      action: 'getCharacter',
      characterId: characterId
    });
    
    if (response.success) {
      const character = response.character;
      
      // 显示选中的角色
      const selectedCharacter = mimicModal.querySelector('#sparkit-selected-character');
      selectedCharacter.innerHTML = `
        <img src="${character.char_avatar || character.char_image}" alt="${character.char_name}">
        <div class="sparkit-character-info">
          <div class="sparkit-character-name">${character.char_name}</div>
          ${character.description ? `<div class="sparkit-character-desc">${character.description}</div>` : ''}
        </div>
      `;
      selectedCharacter.dataset.characterId = characterId;
      
      // 隐藏角色列表
      hideCharacterList();
      
      // 保存选择
      await chrome.storage.local.set({ lastSelectedCharacterId: characterId });
    }
  } catch (error) {
    console.error('[Sparkit Mimic] Failed to select character:', error);
    showError('选择角色失败');
  }
}

// 显示角色列表
function showCharacterList() {
  const characterList = mimicModal.querySelector('#sparkit-character-list');
  characterList.style.display = 'grid';
  mimicModal.querySelector('#sparkit-change-character').style.display = 'none';
}

// 隐藏角色列表
function hideCharacterList() {
  const characterList = mimicModal.querySelector('#sparkit-character-list');
  characterList.style.display = 'none';
  mimicModal.querySelector('#sparkit-change-character').style.display = 'block';
}

// 加载上次选择的角色
async function loadLastSelectedCharacter() {
  try {
    const result = await chrome.storage.local.get(['lastSelectedCharacterId']);
    if (result.lastSelectedCharacterId) {
      await selectCharacter(result.lastSelectedCharacterId);
    }
  } catch (error) {
    console.error('[Sparkit Mimic] Failed to load last selected character:', error);
  }
}

// 处理生成
async function handleGenerate() {
  const selectedCharacter = mimicModal.querySelector('#sparkit-selected-character');
  const characterId = selectedCharacter.dataset.characterId;
  
  if (!characterId) {
    showError('请先选择角色');
    return;
  }
  
  if (!currentHoveredImage) {
    showError('未选择参考图片');
    return;
  }
  
  // 获取设置
  const keepBackground = mimicModal.querySelector('#sparkit-keep-background').checked;
  
  // 显示进度
  showProgress('准备生成...');
  
  try {
    // 将图片转换为 Blob
    const referenceImageBlob = await imageToBlob(currentHoveredImage);
    
    // 调用 background script 生成
    updateProgress(10, '上传参考图...');
    
    const response = await chrome.runtime.sendMessage({
      action: 'generateMimic',
      data: {
        referenceImageBlob: referenceImageBlob,
        characterId: characterId,
        keepBackground: keepBackground,
        numImages: 2
      }
    });
    
    if (response.success) {
      updateProgress(100, '生成完成！');
      displayResults(response.results);
    } else {
      throw new Error(response.error || '生成失败');
    }
  } catch (error) {
    console.error('[Sparkit Mimic] Generation failed:', error);
    showError(error.message || '生成失败，请重试');
  }
}

// 将图片转换为 Blob（处理跨域图片）
async function imageToBlob(img) {
  try {
    console.log('[Sparkit Mimic V2] Converting image to blob, src:', img.src.substring(0, 100));
    
    // 使用 fetch 下载图片（避免 CORS 污染 canvas）
    const response = await fetch(img.src);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    
    const blob = await response.blob();
    console.log('[Sparkit Mimic V2] Fetched blob, size:', blob.size, 'type:', blob.type);
    
    // 转换为 base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log('[Sparkit Mimic V2] Converted to base64, length:', reader.result.length);
        resolve(reader.result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('[Sparkit Mimic V2] Failed to convert image to blob:', error);
    throw new Error(`图片下载失败: ${error.message}`);
  }
}

// 显示生成结果
function displayResults(results) {
  const resultPreview = mimicModal.querySelector('#sparkit-result-preview');
  
  if (results && results.length > 0) {
    resultPreview.innerHTML = results.map((url, index) => `
      <img src="${url}" alt="Generated ${index + 1}" class="sparkit-result-image">
    `).join('');
  } else {
    resultPreview.innerHTML = '<div class="sparkit-placeholder">生成失败</div>';
  }
}

// 显示进度
function showProgress(text) {
  hideError();
  const progressSection = mimicModal.querySelector('#sparkit-progress-section');
  const progressText = mimicModal.querySelector('#sparkit-progress-text');
  const progressFill = mimicModal.querySelector('#sparkit-progress-fill');
  
  progressSection.style.display = 'block';
  progressText.textContent = text;
  progressFill.style.width = '0%';
}

// 更新进度
function updateProgress(percent, text) {
  const progressText = mimicModal.querySelector('#sparkit-progress-text');
  const progressFill = mimicModal.querySelector('#sparkit-progress-fill');
  
  progressText.textContent = text;
  progressFill.style.width = `${percent}%`;
}

// 隐藏进度
function hideProgress() {
  const progressSection = mimicModal.querySelector('#sparkit-progress-section');
  progressSection.style.display = 'none';
}

// 显示错误
function showError(message) {
  hideProgress();
  const errorSection = mimicModal.querySelector('#sparkit-error-section');
  const errorText = mimicModal.querySelector('#sparkit-error-text');
  
  errorSection.style.display = 'block';
  errorText.textContent = message;
}

// 隐藏错误
function hideError() {
  const errorSection = mimicModal.querySelector('#sparkit-error-section');
  errorSection.style.display = 'none';
}

// 初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

