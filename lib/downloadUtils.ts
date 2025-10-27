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

