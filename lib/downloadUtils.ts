/**
 * Download utility functions
 * Handles downloading files (images, videos) without opening new tabs
 */

/**
 * Download an image from URL
 * Works with both data URLs and external URLs (e.g., Aimovely)
 * Ensures downloaded files are proper PNG format
 */
export async function downloadImage(url: string, filename: string = 'image.png'): Promise<void> {
  try {
    let blob: Blob;
    let isDataUrl = url.startsWith('data:');
    let isPngDataUrl = isDataUrl && url.startsWith('data:image/png');

    if (isDataUrl && isPngDataUrl) {
      // For PNG data URLs, extract base64 and create blob directly
      // This preserves the original PNG format without browser modifications
      const base64Data = url.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      // Create blob directly from PNG bytes to preserve original format
      blob = new Blob([bytes], { type: 'image/png' });
    } else if (isDataUrl) {
      // For non-PNG data URLs, convert through canvas
      const response = await fetch(url);
      blob = await response.blob();
      
      // Convert to PNG through canvas
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { 
        alpha: true,
        willReadFrequently: false,
        colorSpace: 'srgb'
      });
      
      blob = await new Promise<Blob>((resolve, reject) => {
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          ctx?.drawImage(img, 0, 0);
          canvas.toBlob((convertedBlob) => {
            if (convertedBlob) {
              resolve(convertedBlob);
            } else {
              reject(new Error('Failed to convert image to PNG'));
            }
          }, 'image/png', 1.0);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.crossOrigin = 'anonymous';
        img.src = url;
      });
    } else {
      // For external URLs, use proxy to avoid CORS issues
      const proxyUrl = `/api/download?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }

      blob = await response.blob();
      
      // If it's already PNG, use it directly; otherwise convert
      if (blob.type === 'image/png') {
        // Use PNG blob directly to preserve format
        // No conversion needed
      } else {
        // Convert to PNG through canvas
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { 
          alpha: true,
          willReadFrequently: false,
          colorSpace: 'srgb'
        });
        
        blob = await new Promise<Blob>((resolve, reject) => {
          img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
            ctx?.drawImage(img, 0, 0);
            canvas.toBlob((convertedBlob) => {
              if (convertedBlob) {
                resolve(convertedBlob);
              } else {
                reject(new Error('Failed to convert image to PNG'));
              }
            }, 'image/png', 1.0);
          };
          img.onerror = () => reject(new Error('Failed to load image'));
          img.crossOrigin = 'anonymous';
          img.src = URL.createObjectURL(blob);
        });
        
        URL.revokeObjectURL(img.src);
      }
    }

    // Create blob URL and download
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up blob URL
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
  } catch (error) {
    console.error('Download failed:', error);
    alert('下载失败，请重试');
  }
}

/**
 * Download a video from URL
 */
export async function downloadVideo(url: string, filename: string = 'video.mp4'): Promise<void> {
  try {
    console.log('Starting video download:', { url, filename });
    
    // Use proxy to avoid CORS issues
    const proxyUrl = `/api/download?url=${encodeURIComponent(url)}`;
    console.log('Proxy URL:', proxyUrl);
    
    const response = await fetch(proxyUrl);
    console.log('Proxy response:', { 
      ok: response.ok, 
      status: response.status, 
      statusText: response.statusText,
      contentType: response.headers.get('content-type')
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Proxy response error:', errorText);
      throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    console.log('Video blob created:', { size: blob.size, type: blob.type });
    
    if (blob.size === 0) {
      throw new Error('Downloaded video is empty');
    }
    
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('Video download triggered successfully');

    // Clean up blob URL
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
  } catch (error) {
    console.error('Video download failed:', error);
    alert(`视频下载失败: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

