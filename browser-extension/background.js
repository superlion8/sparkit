// Background service worker
console.log("Sparkit Mimic background script running");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "FETCH_API") {
    handleApiRequest(request.url, request.options, sendResponse);
    return true; // Indicates async response
  }
});

async function handleApiRequest(url, options, sendResponse) {
  try {
    console.log(`[Background] Fetching: ${url}`);
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`[Background] Fetch Error ${response.status}:`, text);
      sendResponse({ 
        success: false, 
        error: `HTTP Error ${response.status}: ${text || response.statusText}` 
      });
      return;
    }

    const data = await response.json();
    console.log(`[Background] Fetch Success`);
    sendResponse({ success: true, data });
  } catch (error) {
    console.error("[Background] Network Error:", error);
    sendResponse({ 
      success: false, 
      error: error.message || "Network error - Check server logs" 
    });
  }
}
