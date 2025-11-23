// Config
const SPARKIT_URL = "http://localhost:3000"; // Change to production URL if deployed

let currentHoveredImage = null;
let mimicButton = null;
let activePopover = null;

// Icon SVG
const SPARKLE_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
</svg>
`;

// Initialize
function init() {
  createMimicButton();
  setupHoverListeners();
  setupGlobalClickListener();
}

// Helper: Proxy fetch through background script
async function apiFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: "FETCH_API",
        url: url,
        options: options
      },
      (response) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (response && response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || "Unknown API Error"));
        }
      }
    );
  });
}

function createMimicButton() {
  mimicButton = document.createElement("button");
  mimicButton.className = "sparkit-mimic-btn";
  mimicButton.innerHTML = `${SPARKLE_ICON} Mimic`;
  mimicButton.style.display = "none";
  mimicButton.addEventListener("click", handleMimicClick);
  document.body.appendChild(mimicButton);
}

function setupHoverListeners() {
  document.addEventListener("mouseover", (e) => {
    const target = e.target;
    // Ignore if hovering over our own UI
    if (target.closest('.sparkit-mimic-btn') || target.closest('.sparkit-popover')) return;

    if (target.tagName === "IMG" && target.width > 200 && target.height > 200) {
      currentHoveredImage = target;
      positionButton(target);
    }
  });

  let hideTimeout;
  document.addEventListener("mouseout", (e) => {
    const target = e.target;
    const related = e.relatedTarget;

    // If moving into button or popover, don't hide
    if (related && (related.closest('.sparkit-mimic-btn') || related.closest('.sparkit-popover'))) {
      return;
    }

    if (target.tagName === "IMG" || target === mimicButton) {
      hideTimeout = setTimeout(() => {
        // Check hover state again
        if (!mimicButton.matches(":hover") && 
            (!currentHoveredImage || !currentHoveredImage.matches(":hover")) &&
            !activePopover) { 
           mimicButton.style.display = "none";
        }
      }, 200);
    }
  });
}

function setupGlobalClickListener() {
  document.addEventListener("mousedown", (e) => {
    if (activePopover && 
        !activePopover.contains(e.target) && 
        !e.target.closest('.sparkit-mimic-btn')) {
      closePopover();
    }
  });
}

function positionButton(img) {
  if (activePopover) return; // Don't move button if popover is open

  const rect = img.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  mimicButton.style.display = "flex";
  // Position: Bottom-Right corner of the image
  const btnTop = rect.bottom + window.scrollY - 45; 
  const btnLeft = rect.right + window.scrollX - 90;

  mimicButton.style.top = `${btnTop}px`;
  mimicButton.style.left = `${btnLeft}px`;
}

// Helper to convert image URL to Base64
async function convertImageUrlToBase64(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Failed to convert image to base64:", error);
    return null;
  }
}

async function handleMimicClick(e) {
  e.preventDefault();
  e.stopPropagation();
  
  if (!currentHoveredImage) return;

  // Hide button when clicked to avoid obstruction
  mimicButton.style.display = "none";
  
  const imageUrl = currentHoveredImage.src;
  const imageRect = currentHoveredImage.getBoundingClientRect();
  
  // Check for Auth Token
  const { authToken } = await chrome.storage.local.get("authToken");
  
  if (!authToken) {
    alert("Please set your Sparkit API Token in the extension popup first.");
    return;
  }
  
  showPopover(imageUrl, imageRect, authToken);
}

function showPopover(imageUrl, rect, authToken) {
  closePopover(); // Close existing if any

  const popover = document.createElement("div");
  popover.className = "sparkit-popover";
  
  const padding = 10;
  const popoverWidth = 300;
  
  popover.style.top = `${rect.bottom + window.scrollY - 10}px`;
  popover.style.left = `${rect.right + window.scrollX - 310}px`; 
  popover.style.transform = "translateY(-100%)";

  popover.innerHTML = `
    <div class="sparkit-popover-header">
      <h3 class="sparkit-popover-title">Sparkit Mimic</h3>
      <button class="sparkit-close-btn">&times;</button>
    </div>
    <img src="${imageUrl}" class="sparkit-thumbnail-preview" />
    
    <div id="sparkit-content">
      <div class="sparkit-loading">Loading characters...</div>
    </div>
  `;
  
  document.body.appendChild(popover);
  activePopover = popover;
  
  // Close handler
  popover.querySelector(".sparkit-close-btn").onclick = closePopover;

  // Fetch Characters
  fetchCharacters(authToken, popover.querySelector("#sparkit-content"), imageUrl);
}

function closePopover() {
  if (activePopover) {
    activePopover.remove();
    activePopover = null;
  }
}

async function fetchCharacters(token, contentDiv, imageUrl) {
  try {
    // Use apiFetch instead of direct fetch
    const data = await apiFetch(`${SPARKIT_URL}/api/characters`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    const characters = data.characters || [];
    
    const { lastCharId } = await chrome.storage.local.get("lastCharId");
    
    renderForm(contentDiv, characters, lastCharId, imageUrl, token);
    
  } catch (error) {
    contentDiv.innerHTML = `<div class="sparkit-error">${error.message}. Please check connection and token.</div>`;
  }
}

function renderForm(container, characters, lastCharId, imageUrl, token) {
  if (characters.length === 0) {
    container.innerHTML = `<div class="sparkit-error">No characters found. Please create a character in Sparkit first.</div>`;
    return;
  }

  const options = characters.map(c => 
    `<option value="${c.id}" ${c.id === lastCharId ? "selected" : ""}>${c.char_name}</option>`
  ).join("");

  container.innerHTML = `
    <div class="sparkit-form-group">
      <label class="sparkit-label">Select Character</label>
      <select class="sparkit-select" id="sparkit-char-select">
        ${options}
      </select>
    </div>
    
    <div class="sparkit-form-group">
      <div class="sparkit-checkbox-wrapper">
        <input type="checkbox" id="sparkit-keep-bg" />
        <label for="sparkit-keep-bg" class="sparkit-label" style="margin:0">Keep Background</label>
      </div>
    </div>
    
    <button class="sparkit-primary-btn" id="sparkit-generate-btn">
      Generate (2 Images)
    </button>
    
    <div id="sparkit-status"></div>
  `;

  const generateBtn = container.querySelector("#sparkit-generate-btn");
  const charSelect = container.querySelector("#sparkit-char-select");
  const keepBgCheck = container.querySelector("#sparkit-keep-bg");
  const statusDiv = container.querySelector("#sparkit-status");

  generateBtn.onclick = async () => {
    const charId = charSelect.value;
    const keepBg = keepBgCheck.checked;
    
    chrome.storage.local.set({ lastCharId: charId });
    
    generateBtn.disabled = true;
    generateBtn.textContent = "Processing Image...";
    statusDiv.innerHTML = "";
    
    try {
      const base64Image = await convertImageUrlToBase64(imageUrl);
      if (!base64Image) throw new Error("Failed to process image. It might be protected.");
      
      generateBtn.textContent = "Generating AI Images...";

      // Use apiFetch
      const result = await apiFetch(`${SPARKIT_URL}/api/generate/mimic`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          reference_image: base64Image,
          character_id: charId,
          keep_background: keepBg
        })
      });
      
      statusDiv.innerHTML = `<div class="sparkit-success">Success! Check character gallery.</div>`;
      
      // Auto close after success
      setTimeout(() => {
        closePopover();
      }, 2500);
      
    } catch (error) {
      statusDiv.innerHTML = `<div class="sparkit-error">${error.message}</div>`;
      generateBtn.disabled = false;
      generateBtn.textContent = "Generate (2 Images)";
    }
  };
}

init();
