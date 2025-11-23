// Content Script V2 - 将按钮直接插入图片容器，模仿 Pinterest 的实现

// 检查是否在 Sparkit 网站上，如果是则不运行插件
if (window.location.hostname === 'sparkiai.com' || 
    window.location.hostname === 'www.sparkiai.com' ||
    (window.location.hostname === 'localhost' && window.location.port === '3000')) {
  console.log('[Sparkit Mimic V2] Running on Sparkit website, plugin disabled to avoid conflicts');
  // 直接退出，不执行任何代码
  throw new Error('Plugin disabled on Sparkit website');
}

console.log('[Sparkit Mimic V2] Content script loaded');

// 全局状态
let currentHoveredImage = null;
let buttonTargetImage = null; // 按钮当前关联的图片元素（直接引用，不通过 ID 查找）
let lastUsedImage = null; // 最后使用的图片（紧急备份，即使按钮隐藏也保留）
let selectedCharacter = null; // 当前选择的角色
let mimicModal = null;
let isModalOpen = false;
let processedImages = new WeakSet(); // 记录已处理的图片
let processedImagesCount = 0; // 计数器（用于调试）
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
    
    // 五层查找策略，确保万无一失
    let targetImage = null;
    let strategyUsed = 'none';
    
    // 🎯 策略 0: 直接使用存储的图片元素引用（最可靠！）
    if (buttonTargetImage && document.body.contains(buttonTargetImage)) {
      targetImage = buttonTargetImage;
      strategyUsed = '0-direct-reference';
      console.log('[Sparkit Mimic V2] ✅ Using direct image reference (Strategy 0)');
    }
    
    // 策略 1: 通过 data-sparkit-id 查找
    if (!targetImage) {
      const imageId = mimicButton.dataset.imageId;
      if (imageId) {
        targetImage = document.querySelector(`img[data-sparkit-id="${imageId}"]`);
        if (targetImage) {
          strategyUsed = '1-id-lookup';
          console.log('[Sparkit Mimic V2] Found image by ID (Strategy 1):', imageId);
        }
      }
    }
    
    // 策略 2: 通过 src 查找
    if (!targetImage && mimicButton.dataset.imageSrc) {
      const imageSrc = mimicButton.dataset.imageSrc;
      targetImage = document.querySelector(`img[src="${imageSrc}"]`);
      if (targetImage) {
        strategyUsed = '2-src-lookup';
        console.log('[Sparkit Mimic V2] Found image by src (Strategy 2):', imageSrc.substring(0, 50));
        // 给找到的图片分配 ID（补救措施）
        if (!targetImage.dataset.sparkitId) {
          targetImage.dataset.sparkitId = 'sparkit-img-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        }
      }
    }
    
    // 策略 3: 使用全局变量
    if (!targetImage && currentHoveredImage && document.body.contains(currentHoveredImage)) {
      targetImage = currentHoveredImage;
      strategyUsed = '3-current-hovered';
      console.log('[Sparkit Mimic V2] Using currentHoveredImage (Strategy 3)');
    }
    
    // 🆘 策略 4: 使用最后使用的图片（紧急备份！）
    if (!targetImage && lastUsedImage && document.body.contains(lastUsedImage)) {
      targetImage = lastUsedImage;
      strategyUsed = '4-last-used-emergency';
      console.log('[Sparkit Mimic V2] 🆘 Using lastUsedImage as emergency backup (Strategy 4)');
      console.warn('[Sparkit Mimic V2] ⚠️ Had to use emergency backup! This indicates a timing issue.');
    }
    
    console.log('[Sparkit Mimic V2] Final targetImage:', targetImage ? `✅ found (${strategyUsed})` : '❌ null');
    
    if (targetImage) {
      // 更新全局引用（确保后续流程使用正确的图片）
      currentHoveredImage = targetImage;
      buttonTargetImage = targetImage; // 恢复直接引用
      console.log('[Sparkit Mimic V2] Opening modal for image:', targetImage.src.substring(0, 50));
      openMimicModal();
    } else {
      console.error('[Sparkit Mimic V2] ❌ No image reference available after all strategies!');
      console.error('[Sparkit Mimic V2] Debug info:', {
        buttonTargetImage: buttonTargetImage,
        imageId: mimicButton.dataset.imageId,
        imageSrc: mimicButton.dataset.imageSrc?.substring(0, 50),
        currentHoveredImage: currentHoveredImage,
        lastUsedImage: lastUsedImage
      });
      alert('未找到图片引用，请重试');
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
  processedImagesCount++;
  
  // 给图片添加唯一 ID（用于按钮引用备份）
  if (!imgElement.dataset.sparkitId) {
    imgElement.dataset.sparkitId = 'sparkit-img-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }
  
  // 🎯 新方案：创建一个透明的 hover 层覆盖整个图片
  // 这样可以确保图片的任何位置都能触发按钮
  
  const hoverOverlay = document.createElement('div');
  hoverOverlay.className = 'sparkit-hover-overlay';
  hoverOverlay.dataset.sparkitOverlay = 'true';
  hoverOverlay.style.cssText = `
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    z-index: 9998 !important;
    pointer-events: auto !important;
    background: transparent !important;
    cursor: pointer !important;
  `;
  
  console.log('[Sparkit Mimic V2] Created hover overlay with z-index: 9998');
  
  // 点击时穿透到下面的图片
  hoverOverlay.addEventListener('click', function(e) {
    e.stopPropagation();
    // 隐藏 overlay，找到下面的元素，然后触发它的点击
    hoverOverlay.style.display = 'none';
    const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
    hoverOverlay.style.display = 'block';
    
    if (elementBelow && elementBelow !== hoverOverlay) {
      // 检查是否有 click 方法
      if (typeof elementBelow.click === 'function') {
        elementBelow.click();
      } else {
        // 如果没有 click 方法，手动触发合成点击事件
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: e.clientX,
          clientY: e.clientY
        });
        elementBelow.dispatchEvent(clickEvent);
      }
    }
  });
  
  // 找到图片的定位父元素
  let positionedParent = imgElement.parentElement;
  while (positionedParent && positionedParent !== document.body) {
    const style = getComputedStyle(positionedParent);
    if (style.position !== 'static') {
      break;
    }
    positionedParent = positionedParent.parentElement;
  }
  
  // 如果找不到定位父元素，给图片的直接父元素添加 position: relative
  if (!positionedParent || positionedParent === document.body) {
    positionedParent = imgElement.parentElement;
    if (positionedParent) {
      positionedParent.style.position = 'relative';
    }
  }
  
  // 将 hover 层插入到定位父元素中
  if (positionedParent) {
    // 确保父容器有定位
    const currentPosition = getComputedStyle(positionedParent).position;
    if (currentPosition === 'static') {
      positionedParent.style.position = 'relative';
    }
    // 确保父容器的 z-index 不会太低
    const currentZIndex = getComputedStyle(positionedParent).zIndex;
    if (currentZIndex === 'auto' || parseInt(currentZIndex) < 10) {
      positionedParent.style.zIndex = '10';
    }
    positionedParent.appendChild(hoverOverlay);
    
    console.log('[Sparkit Mimic V2] Overlay inserted into:', {
      parent: positionedParent.tagName,
      parentPosition: getComputedStyle(positionedParent).position,
      parentZIndex: getComputedStyle(positionedParent).zIndex
    });
  }
  
  // 在 hover 层上监听（启用 pointer-events）
  hoverOverlay.style.pointerEvents = 'auto';
  hoverOverlay.addEventListener('mouseenter', function handleOverlayEnter() {
    console.log('[Sparkit Mimic V2] 🎯 Hover overlay mouseenter');
    currentHoveredImage = imgElement;
    showMimicButton(imgElement);
  });
  
  hoverOverlay.addEventListener('mouseleave', function handleOverlayLeave() {
    console.log('[Sparkit Mimic V2] Hover overlay mouseleave');
    setTimeout(() => {
      const isButtonHovered = mimicButton.matches(':hover');
      if (!isButtonHovered) {
        hideMimicButton();
      }
    }, 100);
  });
  
  // 备用方案：也在图片本身监听
  imgElement.addEventListener('mouseenter', function handleImgEnter() {
    console.log('[Sparkit Mimic V2] Image mouseenter (fallback)');
    currentHoveredImage = imgElement;
    showMimicButton(imgElement);
  });
  
  console.log('[Sparkit Mimic V2] ✅ Added hover overlay to image:', {
    imgSrc: imgElement.src.substring(0, 50) + '...',
    imgSize: `${rect.width}x${rect.height}`,
    overlayParent: positionedParent?.tagName,
    overlayParentClass: positionedParent?.className
  });
}

// 页面加载完成后，报告处理了多少图片
setTimeout(() => {
  console.log('[Sparkit Mimic V2] 📊 Initial scan complete. Total images processed:', processedImagesCount);
  if (processedImagesCount === 0) {
    console.warn('[Sparkit Mimic V2] ⚠️ No images processed! This may indicate a problem.');
    console.warn('[Sparkit Mimic V2] Please check if images are loaded on the page.');
  }
  
  // 调试工具：在控制台暴露一个全局函数来可视化透明层
  window.sparkitDebugShowOverlays = () => {
    const overlays = document.querySelectorAll('.sparkit-hover-overlay');
    console.log('[Sparkit Debug] Found', overlays.length, 'overlays');
    overlays.forEach((overlay, i) => {
      overlay.style.background = 'rgba(255, 0, 0, 0.2)';
      overlay.style.border = '2px solid red';
      console.log(`Overlay ${i}:`, {
        size: overlay.getBoundingClientRect(),
        zIndex: getComputedStyle(overlay).zIndex,
        pointerEvents: getComputedStyle(overlay).pointerEvents
      });
    });
    console.log('[Sparkit Debug] Overlays are now visible with red background');
  };
  
  window.sparkitDebugHideOverlays = () => {
    const overlays = document.querySelectorAll('.sparkit-hover-overlay');
    overlays.forEach(overlay => {
      overlay.style.background = 'transparent';
      overlay.style.border = 'none';
    });
    console.log('[Sparkit Debug] Overlays are now hidden');
  };
  
  console.log('[Sparkit Mimic V2] 🔧 Debug tools available: sparkitDebugShowOverlays() and sparkitDebugHideOverlays()');
}, 3000);

// 显示 Mimic 按钮（移动到图片位置）
function showMimicButton(imgElement) {
  console.log('[Sparkit Mimic V2] Showing button for image:', imgElement.src.substring(0, 50));
  if (hideButtonTimer) {
    clearTimeout(hideButtonTimer);
    hideButtonTimer = null;
  }
  
  // 🎯 最重要：直接存储图片元素引用（不经过 DOM 查找）
  buttonTargetImage = imgElement;
  lastUsedImage = imgElement; // 同时更新 lastUsedImage（永不清空，作为紧急备份）
  console.log('[Sparkit Mimic V2] Stored direct reference and backup to image element');
  
  // 确保图片有唯一 ID（如果还没有，立即分配）
  if (!imgElement.dataset.sparkitId) {
    imgElement.dataset.sparkitId = 'sparkit-img-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    console.log('[Sparkit Mimic V2] Assigned new ID to image on-the-fly:', imgElement.dataset.sparkitId);
  }
  
  // 多层备份防止引用丢失
  mimicButton.dataset.imageId = imgElement.dataset.sparkitId;  // 主引用：通过 ID
  mimicButton.dataset.imageSrc = imgElement.src;                // 备用引用：通过 src
  console.log('[Sparkit Mimic V2] Stored backup references - ID:', mimicButton.dataset.imageId, ', src:', mimicButton.dataset.imageSrc.substring(0, 50));
  
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
      // 延迟清空引用，确保点击事件有时间执行
      setTimeout(() => {
        // 三重检查：确保按钮真的不被 hover 且不可见
        if (mimicButton.style.opacity === '0' && !mimicButton.matches(':hover')) {
          console.log('[Sparkit Mimic V2] Clearing image references (keeping lastUsedImage as backup)');
          currentHoveredImage = null;
          buttonTargetImage = null;             // 清空直接引用
          delete mimicButton.dataset.imageId;   // 清空 ID 引用
          delete mimicButton.dataset.imageSrc;  // 清空 src 引用
          // ⚠️ 不清空 lastUsedImage - 保留作为紧急备份
        } else {
          console.log('[Sparkit Mimic V2] Cancelled clearing - button became hovered');
        }
      }, 300);  // 延长到 300ms，给鼠标更多时间
    } else {
      console.log('[Sparkit Mimic V2] Button still hovered or modal open, keeping visible');
    }
  }, 200);  // 从 150ms 增加到 200ms
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
      <!-- 背景参考图 -->
      <div class="sparkit-modal-bg" id="sparkit-reference-bg"></div>
      
      <!-- 顶部关闭按钮 -->
      <button class="sparkit-modal-close">&times;</button>
      
      <div class="sparkit-modal-inner">
        <!-- 标题 -->
        <h2 class="sparkit-modal-title">AI Character Mimic</h2>
        <p class="sparkit-modal-subtitle">Transform this image with your character</p>
        
        <!-- 角色选择卡片 -->
        <div class="sparkit-character-card" id="sparkit-character-card">
          <div class="sparkit-character-display" id="sparkit-character-display">
            <div class="sparkit-loading-small">Loading characters...</div>
          </div>
        </div>
        
        <!-- 保留背景开关 -->
        <div class="sparkit-option-row">
          <span class="sparkit-option-label">Keep background</span>
          <label class="sparkit-switch">
            <input type="checkbox" id="sparkit-keep-background" checked>
            <span class="sparkit-slider"></span>
          </label>
        </div>
        
        <!-- 生成进度 -->
        <div id="sparkit-progress-section" class="sparkit-progress-section" style="display: none;">
          <div class="sparkit-progress-bar">
            <div class="sparkit-progress-fill" id="sparkit-progress-fill"></div>
          </div>
          <div class="sparkit-progress-text" id="sparkit-progress-text">Generating...</div>
        </div>
        
        <!-- 错误提示 -->
        <div id="sparkit-error-section" class="sparkit-error-section" style="display: none;">
          <div class="sparkit-error-text" id="sparkit-error-text"></div>
        </div>
        
        <!-- 生成按钮 -->
        <button id="sparkit-generate-btn" class="sparkit-btn-generate">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
          </svg>
          <span>Generate 2 images</span>
        </button>
        
        <button id="sparkit-cancel-btn" class="sparkit-btn-cancel">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(mimicModal);
  
  // 绑定事件
  mimicModal.querySelector('.sparkit-modal-overlay').addEventListener('click', closeMimicModal);
  mimicModal.querySelector('.sparkit-modal-close').addEventListener('click', closeMimicModal);
  mimicModal.querySelector('#sparkit-cancel-btn').addEventListener('click', closeMimicModal);
  mimicModal.querySelector('#sparkit-generate-btn').addEventListener('click', handleGenerate);
  
  // 角色卡片点击事件（展开角色选择列表）
  mimicModal.querySelector('#sparkit-character-card').addEventListener('click', () => {
    showCharacterPicker();
  });
}

// 打开 Mimic 模态框
async function openMimicModal() {
  // 验证图片元素仍然有效
  if (!currentHoveredImage) {
    console.error('[Sparkit Mimic] No image selected');
    alert('未选择图片，请重试');
    return;
  }
  
  if (!currentHoveredImage.src || !document.body.contains(currentHoveredImage)) {
    console.error('[Sparkit Mimic] Image is no longer valid or not in DOM');
    alert('图片已失效，请重试');
    return;
  }
  
  console.log('[Sparkit Mimic] ✅ Opening modal with valid image:', currentHoveredImage.src.substring(0, 50));
  
  isModalOpen = true;
  mimicModal.style.display = 'block';
  
  // 设置背景图
  const bgElement = mimicModal.querySelector('#sparkit-reference-bg');
  bgElement.style.backgroundImage = `url(${currentHoveredImage.src})`;
  
  // 重置状态
  hideProgress();
  hideError();
  
  // 加载角色列表（会自动选择第一个角色）
  await loadCharacters();
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

// 存储所有角色（供切换使用）
let allCharacters = [];

// 显示角色列表（在新的紧凑UI中）
function displayCharacters(characters) {
  const characterDisplay = mimicModal.querySelector('#sparkit-character-display');
  
  if (!characters || characters.length === 0) {
    characterDisplay.innerHTML = '<div class="sparkit-loading-small">No characters found</div>';
    return;
  }
  
  // 存储所有角色
  allCharacters = characters;
  
  // 默认选择第一个角色
  const firstCharacter = characters[0];
  selectedCharacter = firstCharacter;
  
  // 更新角色卡片显示
  updateCharacterCard(firstCharacter);
}

// 更新角色卡片显示
function updateCharacterCard(character) {
  const characterDisplay = mimicModal.querySelector('#sparkit-character-display');
  characterDisplay.innerHTML = `
    <img src="${character.char_avatar || character.char_image}" alt="${character.char_name}">
    <div class="sparkit-character-info">
      <div class="sparkit-character-name">${character.char_name}</div>
      <div class="sparkit-character-desc">Tap to change character</div>
    </div>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: rgba(255,255,255,0.4);">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  `;
}

// 显示角色选择器
function showCharacterPicker() {
  // 检查是否已经有选择器
  let picker = document.getElementById('sparkit-character-picker');
  
  if (picker) {
    // 如果已存在，切换显示/隐藏
    picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
    return;
  }
  
  // 创建角色选择器
  picker = document.createElement('div');
  picker.id = 'sparkit-character-picker';
  picker.className = 'sparkit-character-picker';
  
  picker.innerHTML = `
    <div class="sparkit-picker-header">
      <span>Select Character</span>
      <button class="sparkit-picker-close">×</button>
    </div>
    <div class="sparkit-picker-list">
      ${allCharacters.map(character => `
        <div class="sparkit-picker-item ${character.id === selectedCharacter?.id ? 'active' : ''}" data-character-id="${character.id}">
          <img src="${character.char_avatar || character.char_image}" alt="${character.char_name}">
          <div class="sparkit-picker-info">
            <div class="sparkit-picker-name">${character.char_name}</div>
            ${character.description ? `<div class="sparkit-picker-desc">${character.description}</div>` : ''}
          </div>
          ${character.id === selectedCharacter?.id ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
        </div>
      `).join('')}
    </div>
  `;
  
  mimicModal.querySelector('.sparkit-modal-inner').appendChild(picker);
  
  // 绑定关闭事件
  picker.querySelector('.sparkit-picker-close').addEventListener('click', (e) => {
    e.stopPropagation();
    picker.style.display = 'none';
  });
  
  // 绑定角色选择事件
  picker.querySelectorAll('.sparkit-picker-item').forEach(item => {
    item.addEventListener('click', () => {
      const characterId = item.dataset.characterId;
      const character = allCharacters.find(c => c.id === characterId);
      if (character) {
        selectCharacter(character);
        picker.style.display = 'none';
      }
    });
  });
  
  // 点击外部关闭
  picker.addEventListener('click', (e) => {
    if (e.target === picker) {
      picker.style.display = 'none';
    }
  });
}

// 选择角色
function selectCharacter(character) {
  selectedCharacter = character;
  console.log('[Sparkit Mimic] Character selected:', character.char_name);
  
  // 更新角色卡片显示
  updateCharacterCard(character);
  
  // 更新选择器中的激活状态
  const picker = document.getElementById('sparkit-character-picker');
  if (picker) {
    picker.querySelectorAll('.sparkit-picker-item').forEach(item => {
      if (item.dataset.characterId === character.id) {
        item.classList.add('active');
        item.innerHTML = item.innerHTML.replace('</div>', '</div><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>');
      } else {
        item.classList.remove('active');
        const svg = item.querySelector('svg');
        if (svg) svg.remove();
      }
    });
  }
}

// 处理生成
async function handleGenerate() {
  if (!selectedCharacter) {
    showError('请先选择角色');
    return;
  }
  
  if (!currentHoveredImage) {
    showError('未选择参考图片');
    return;
  }
  
  const characterId = selectedCharacter.id;
  
  // 获取设置
  const keepBackground = mimicModal.querySelector('#sparkit-keep-background').checked;
  
  // 显示进度
  showProgress('准备生成...');
  
  try {
    // 将图片转换为 Blob
    const referenceImageBlob = await imageToBlob(currentHoveredImage);
    
    // 调用 background script 生成
    updateProgress(10, '上传参考图...');
    
    console.log('[Sparkit Mimic] Sending generate request to background...');
    
    // 发送生成请求（不等待结果，后台继续生成）
    chrome.runtime.sendMessage({
      action: 'generateMimic',
      data: {
        referenceImageBlob: referenceImageBlob,
        characterId: characterId,
        keepBackground: keepBackground,
        numImages: 2
      }
    }).then(response => {
      console.log('[Sparkit Mimic] Background response:', response);
    }).catch(error => {
      console.error('[Sparkit Mimic] Background error:', error);
    });
    
    // 上传参考图后，短暂延迟显示提示，然后自动关闭弹窗
    updateProgress(50, '任务已提交，后台生成中...');
    
    setTimeout(() => {
      console.log('[Sparkit Mimic] Auto-closing modal after task submission');
      closeMimicModal();
      
      // 显示一个简短的通知（可选）
      console.log('[Sparkit Mimic] ✅ 生成任务已提交，请稍后在 Sparkit 查看结果');
    }, 1000); // 1秒后自动关闭
    
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

