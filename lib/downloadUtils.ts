/**
 * Download utility functions
 * Handles downloading files (images, videos) without opening new tabs
 */

/**
 * Download an image from URL
 * Works with both data URLs and external URLs (e.g., Aimovely)
 */
export async function downloadImage(url: string, filename: string = 'image.png'): Promise<void> {
  try {
    // For data URLs, can download directly
    if (url.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // For external URLs, use proxy to avoid CORS issues
    const proxyUrl = `/api/download?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      throw new Error('Failed to fetch image');
    }

    const blob = await response.blob();
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
    // Use proxy to avoid CORS issues
    const proxyUrl = `/api/download?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      throw new Error('Failed to fetch video');
    }

    const blob = await response.blob();
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

