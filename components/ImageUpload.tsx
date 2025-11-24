"use client";

import { Upload, X, History, Image as ImageIcon, User } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

interface ImageUploadProps {
  maxImages?: number;
  onImagesChange: (images: File[]) => void;
  label?: string;
  previewAspect?: string;
}

interface HistoryRecord {
  id: string;
  output_image_url: string | null;
  task_type: string;
  task_time: string;
}

interface Character {
  id: string;
  char_name: string;
  char_description: string | null;
  char_avatar: string | null;
  char_image: string | null;
  created_at: string;
}

interface CharacterAsset {
  id: string;
  task_id: string;
  output_image_url: string;
  prompt: string | null;
  task_type: string;
  created_at: string;
}

export default function ImageUpload({ 
  maxImages = 1, 
  onImagesChange,
  label = "上传图片",
  previewAspect = "aspect-square"
}: ImageUploadProps) {
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Ref to track the current batch being processed to avoid race conditions
  const processingBatchRef = useRef<number>(0);
  
  // Upload method selection modal
  const [showUploadMethodModal, setShowUploadMethodModal] = useState(false);
  
  // History selection modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyHasMore, setHistoryHasMore] = useState(true);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  
  // Character selection modal
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [characterAssets, setCharacterAssets] = useState<CharacterAsset[]>([]);
  const [loadingCharacters, setLoadingCharacters] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(false);
  
  const { accessToken, isAuthenticated } = useAuth();

  // Cache for history records and image blobs
  const [historyCache, setHistoryCache] = useState<{
    records: HistoryRecord[];
    timestamp: number;
  } | null>(null);
  const [imageBlobCache, setImageBlobCache] = useState<Map<string, Blob>>(new Map());
  
  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000;

  // Fetch history when modal opens
  const fetchHistory = async (page: number = 1, append: boolean = false) => {
    if (!isAuthenticated || !accessToken) {
      console.log("Not authenticated, cannot fetch history");
      return;
    }

    // Check cache first (only for first page)
    if (page === 1 && !append && historyCache && (Date.now() - historyCache.timestamp < CACHE_DURATION)) {
      console.log("Using cached history records:", historyCache.records.length);
      setHistoryRecords(historyCache.records);
      return;
    }

    if (append) {
      setLoadingMoreHistory(true);
    } else {
      setLoadingHistory(true);
    }
    
    try {
      console.log(`Fetching history page ${page}...`);
      const response = await fetch(`/api/history?page=${page}&pageSize=50`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log("History API response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("History data:", data);
        
        // API returns data.history OR data.data depending on endpoint
        const historyData = data.history || data.data || [];
        console.log("History array:", historyData);
        
        // Filter records that have output images
        const recordsWithImages = historyData.filter(
          (record: HistoryRecord) => record.output_image_url
        );
        console.log("Records with images:", recordsWithImages.length);
        
        // Check if there are more pages
        const pagination = data.pagination;
        if (pagination) {
          setHistoryHasMore(pagination.page < pagination.totalPages);
        } else {
          // If no pagination data, check if we got full page
          setHistoryHasMore(recordsWithImages.length === 50);
        }
        
        if (append) {
          // Append to existing records
          setHistoryRecords(prev => [...prev, ...recordsWithImages]);
        } else {
          // Replace records
          setHistoryRecords(recordsWithImages);
          // Update cache (only for first page)
          if (page === 1) {
            setHistoryCache({
              records: recordsWithImages,
              timestamp: Date.now(),
            });
          }
        }
        
        setHistoryPage(page);
      } else {
        console.error("Failed to fetch history:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      if (append) {
        setLoadingMoreHistory(false);
      } else {
        setLoadingHistory(false);
      }
    }
  };

  // Fetch history when modal opens
  useEffect(() => {
    if (showHistoryModal) {
      // Reset pagination when opening modal
      setHistoryPage(1);
      setHistoryHasMore(true);
      fetchHistory(1, false);
    }
  }, [showHistoryModal]);

  // Fetch characters list
  const fetchCharacters = async () => {
    if (!isAuthenticated || !accessToken) {
      return;
    }

    setLoadingCharacters(true);
    try {
      const response = await fetch("/api/characters", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCharacters(data.characters || []);
        // Select first character by default
        if (data.characters && data.characters.length > 0) {
          setSelectedCharacterId(data.characters[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch characters:", error);
    } finally {
      setLoadingCharacters(false);
    }
  };

  // Fetch character assets (char_avatar, char_image, and all generation records)
  const fetchCharacterAssets = async (characterId: string) => {
    if (!isAuthenticated || !accessToken) {
      return;
    }

    setLoadingAssets(true);
    try {
      // Fetch character details
      const charResponse = await fetch(`/api/characters/${characterId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // Fetch character generation records
      const assetsResponse = await fetch(`/api/characters/${characterId}/assets`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (charResponse.ok && assetsResponse.ok) {
        const charData = await charResponse.json();
        const assetsData = await assetsResponse.json();
        
        const allAssets: CharacterAsset[] = [];
        
        // Add char_avatar and char_image if they exist
        if (charData.char_avatar) {
          allAssets.push({
            id: `avatar-${characterId}`,
            task_id: 'avatar',
            output_image_url: charData.char_avatar,
            prompt: '角色头像',
            task_type: 'avatar',
            created_at: charData.created_at,
          });
        }
        
        if (charData.char_image) {
          allAssets.push({
            id: `image-${characterId}`,
            task_id: 'char_image',
            output_image_url: charData.char_image,
            prompt: '角色图片',
            task_type: 'char_image',
            created_at: charData.created_at,
          });
        }
        
        // Add generation records
        if (assetsData.assets && Array.isArray(assetsData.assets)) {
          allAssets.push(...assetsData.assets);
        }
        
        setCharacterAssets(allAssets);
      }
    } catch (error) {
      console.error("Failed to fetch character assets:", error);
    } finally {
      setLoadingAssets(false);
    }
  };

  // Fetch characters when modal opens
  useEffect(() => {
    if (showCharacterModal) {
      fetchCharacters();
    }
  }, [showCharacterModal]);

  // Fetch assets when selected character changes
  useEffect(() => {
    if (selectedCharacterId) {
      fetchCharacterAssets(selectedCharacterId);
    }
  }, [selectedCharacterId]);

  // Preload images when history records are loaded (for faster selection)
  useEffect(() => {
    if (historyRecords.length > 0) {
      // Preload first 10 images in background
      const preloadImages = historyRecords.slice(0, 10);
      console.log(`Preloading ${preloadImages.length} images...`);
      
      preloadImages.forEach(async (record) => {
        const imageUrl = record.output_image_url;
        if (imageUrl && !imageBlobCache.has(imageUrl)) {
          try {
            const proxyUrl = `/api/download?url=${encodeURIComponent(imageUrl)}`;
            const response = await fetch(proxyUrl);
            if (response.ok) {
              const blob = await response.blob();
              setImageBlobCache(prev => {
                const newCache = new Map(prev);
                newCache.set(imageUrl, blob);
                return newCache;
              });
              console.log(`Preloaded image: ${imageUrl.substring(0, 50)}...`);
            }
          } catch (error) {
            // Silently fail preload, not critical
            console.log(`Failed to preload image: ${imageUrl.substring(0, 50)}...`);
          }
        }
      });
    }
  }, [historyRecords]);

  const handleFileChange = async (files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    await processFiles(fileArray);
  };

  // Sync previews with images array whenever images change
  useEffect(() => {
    if (images.length === 0) {
      setPreviews([]);
      return;
    }

    // Increment batch number to track this processing batch
    const currentBatch = ++processingBatchRef.current;
    console.log(`[ImageUpload] Generating previews for batch ${currentBatch}, images count: ${images.length}`);

    // Generate previews for all images
    const previewPromises = images.map((file, index) => {
      return new Promise<{ index: number; preview: string }>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({ index, preview: reader.result as string });
        };
        reader.onerror = () => {
          console.error(`[ImageUpload] Failed to read file at index ${index}`);
          resolve({ index, preview: '' });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(previewPromises).then((results) => {
      // Check if this batch is still the latest batch
      if (currentBatch !== processingBatchRef.current) {
        console.log(`[ImageUpload] Batch ${currentBatch} is outdated, ignoring preview update`);
        return;
      }

      // Sort by index to ensure correct order
      const sortedPreviews = results
        .sort((a, b) => a.index - b.index)
        .map(r => r.preview);
      
      console.log(`[ImageUpload] Setting previews for batch ${currentBatch}, previews count: ${sortedPreviews.length}`);
      setPreviews(sortedPreviews);
    });
  }, [images]);

  const processFiles = async (files: File[]) => {
    // 压缩图片文件
    const compressedFiles: File[] = [];
    for (const file of files) {
      if (file.size > 2 * 1024 * 1024) { // 大于 2MB 就压缩
        try {
          const compressed = await compressImage(file);
          compressedFiles.push(compressed);
          console.log(`Image compressed: ${file.size} → ${compressed.size} bytes`);
        } catch (error) {
          console.error('Image compression failed:', error);
          compressedFiles.push(file); // 压缩失败就用原文件
        }
      } else {
        compressedFiles.push(file);
      }
    }
    
    // 使用函数式更新确保使用最新的 images 状态，避免闭包问题
    setImages((prevImages) => {
      const newImages = [...prevImages, ...compressedFiles].slice(0, maxImages);
      
      console.log('[ImageUpload] Processing files:', {
        prevImagesCount: prevImages.length,
        compressedFilesCount: compressedFiles.length,
        newImagesCount: newImages.length,
        maxImages,
      });
      
      // 立即通知父组件状态变化
      onImagesChange(newImages);
      
      // Preview generation will be handled by useEffect when images state updates
      
      return newImages;
    });
  };

  // 图片压缩函数
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        // 计算压缩后的尺寸
        let { width, height } = img;
        const maxDimension = 1920; // 最大宽度或高度
        
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          } else {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 绘制压缩后的图片
        ctx?.drawImage(img, 0, 0, width, height);
        
        // 转换为 Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Compression failed'));
            }
          },
          'image/jpeg',
          0.8 // 质量 80%
        );
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      await processFiles(files);
    }
  };

  // Handle upload area click
  const handleUploadAreaClick = () => {
    if (isAuthenticated) {
      // Show method selection modal
      setShowUploadMethodModal(true);
    } else {
      // Directly open file picker if not authenticated
      fileInputRef.current?.click();
    }
  };

  // Select image from history
  const handleSelectFromHistory = async (imageUrl: string) => {
    try {
      console.log("Selecting image from history:", imageUrl);
      
      let blob: Blob;
      
      // Check blob cache first
      if (imageBlobCache.has(imageUrl)) {
        console.log("Using cached blob for image");
        blob = imageBlobCache.get(imageUrl)!;
      } else {
        console.log("Downloading image...");
        setDownloadingImage(true);
        
        try {
          // Use proxy to avoid CORS issues
          const proxyUrl = `/api/download?url=${encodeURIComponent(imageUrl)}`;
          
          const response = await fetch(proxyUrl);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
          }
          
          blob = await response.blob();
          console.log("Downloaded blob size:", blob.size, "type:", blob.type);
          
          // Cache the blob
          setImageBlobCache(prev => {
            const newCache = new Map(prev);
            newCache.set(imageUrl, blob);
            return newCache;
          });
          console.log("Cached blob for future use");
        } finally {
          setDownloadingImage(false);
        }
      }
      
      const filename = `history-image-${Date.now()}.jpg`;
      const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
      
      console.log("Created file:", file.name, file.size);
      
      await processFiles([file]);
      setShowHistoryModal(false);
      setShowUploadMethodModal(false);
      
      console.log("Successfully loaded image from history");
    } catch (error: any) {
      console.error("Failed to load image from history:", error);
      alert(`加载历史图片失败：${error.message || '请重试'}`);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setImages(newImages);
    setPreviews(newPreviews);
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        {label} {maxImages > 1 && `(最多${maxImages}张)`}
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {previews.map((preview, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setLightboxIndex(index)}
            className={`group relative ${previewAspect} bg-gray-100 rounded-lg overflow-hidden cursor-zoom-in`}
          >
            <img
              src={preview}
              alt={`Upload ${index + 1}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                点击查看大图
              </span>
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                removeImage(index);
              }}
              className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </button>
        ))}

        {images.length < maxImages && (
          <button
            type="button"
            onClick={handleUploadAreaClick}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`${previewAspect} border-2 border-dashed rounded-lg transition-all min-h-[200px] flex flex-col items-center justify-center gap-3 text-gray-500 ${
              isDragging
                ? "border-primary-500 bg-primary-50 text-primary-600"
                : "border-gray-300 hover:border-primary-500 hover:bg-primary-50 hover:text-primary-600"
            }`}
          >
            <Upload className="w-12 h-12" />
            <div className="text-center">
              <span className="text-base font-medium block">
                {isDragging ? "松开鼠标上传" : "点击上传"}
              </span>
              <span className="text-xs text-gray-400 mt-1 block">
                {isDragging ? "" : "或拖拽图片到这里"}
              </span>
              <span className="text-xs text-gray-400 mt-1 block">支持 JPG, PNG, WebP</span>
            </div>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={maxImages > 1}
        onChange={(e) => handleFileChange(e.target.files)}
        className="hidden"
      />

      {/* Lightbox */}
      {lightboxIndex !== null && previews[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <img
            src={previews[lightboxIndex]}
            alt="图片预览"
            className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}

      {/* Upload Method Selection Modal */}
      {showUploadMethodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">选择上传方式</h3>
              <button
                onClick={() => setShowUploadMethodModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-3">
              <button
                onClick={() => {
                  setShowUploadMethodModal(false);
                  fileInputRef.current?.click();
                }}
                className="w-full flex items-center gap-4 p-4 bg-primary-50 hover:bg-primary-100 border-2 border-primary-200 hover:border-primary-300 rounded-lg transition-all group"
              >
                <div className="p-3 bg-primary-100 group-hover:bg-primary-200 rounded-lg transition-colors">
                  <ImageIcon className="w-6 h-6 text-primary-600" />
                </div>
                <div className="text-left flex-1">
                  <div className="text-base font-medium text-gray-900">从本地上传</div>
                  <div className="text-sm text-gray-500">选择设备中的图片文件</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowUploadMethodModal(false);
                  setShowHistoryModal(true);
                  fetchHistory();
                }}
                className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 border-2 border-gray-200 hover:border-gray-300 rounded-lg transition-all group"
              >
                <div className="p-3 bg-gray-100 group-hover:bg-gray-200 rounded-lg transition-colors">
                  <History className="w-6 h-6 text-gray-600" />
                </div>
                <div className="text-left flex-1">
                  <div className="text-base font-medium text-gray-900">从历史记录</div>
                  <div className="text-sm text-gray-500">使用之前生成的图片</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowUploadMethodModal(false);
                  setShowCharacterModal(true);
                  fetchCharacters();
                }}
                className="w-full flex items-center gap-4 p-4 bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 hover:border-purple-300 rounded-lg transition-all group"
              >
                <div className="p-3 bg-purple-100 group-hover:bg-purple-200 rounded-lg transition-colors">
                  <User className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-left flex-1">
                  <div className="text-base font-medium text-gray-900">从角色</div>
                  <div className="text-sm text-gray-500">使用角色的照片和生成图</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">从历史记录选择图片</h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary-600 mb-4"></div>
                  <div className="text-gray-600 font-medium">加载历史记录中...</div>
                  <div className="text-gray-400 text-sm mt-2">首次加载可能需要几秒钟</div>
                </div>
              ) : historyRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <History className="w-16 h-16 mb-4 opacity-50" />
                  <p>暂无历史图片</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {historyRecords.map((record) => (
                      <button
                        key={record.id}
                        onClick={() => handleSelectFromHistory(record.output_image_url!)}
                        disabled={downloadingImage}
                        className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden hover:ring-2 hover:ring-primary-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <img
                          src={`/api/download?url=${encodeURIComponent(record.output_image_url!)}`}
                          alt="历史图片"
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          onError={(e) => {
                            // 如果代理失败，显示占位图
                            const target = e.target as HTMLImageElement;
                            target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="14"%3E图片加载失败%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            选择
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  {/* Load More Button */}
                  {historyHasMore && (
                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={() => fetchHistory(historyPage + 1, true)}
                        disabled={loadingMoreHistory}
                        className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {loadingMoreHistory ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-gray-600"></div>
                            <span>加载中...</span>
                          </>
                        ) : (
                          <span>加载更多</span>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Character Modal */}
      {showCharacterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">从角色选择图片</h3>
              <button
                onClick={() => {
                  setShowCharacterModal(false);
                  setSelectedCharacterId(null);
                  setCharacterAssets([]);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex">
              {/* Left Sidebar - Character List */}
              <div className="w-64 border-r border-gray-200 overflow-y-auto bg-gray-50">
                {loadingCharacters ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-purple-600"></div>
                  </div>
                ) : characters.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-400 px-4">
                    <User className="w-12 h-12 mb-2 opacity-50" />
                    <p className="text-sm text-center">暂无角色</p>
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    {characters.map((character) => (
                      <button
                        key={character.id}
                        onClick={() => setSelectedCharacterId(character.id)}
                        className={`w-full text-left p-3 rounded-lg transition-all ${
                          selectedCharacterId === character.id
                            ? 'bg-purple-100 border-2 border-purple-300'
                            : 'bg-white border-2 border-transparent hover:border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {character.char_avatar ? (
                            <img
                              src={character.char_avatar}
                              alt={character.char_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                              <User className="w-6 h-6 text-white" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {character.char_name}
                            </div>
                            {character.char_description && (
                              <div className="text-xs text-gray-500 truncate">
                                {character.char_description}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right - Character Assets */}
              <div className="flex-1 overflow-y-auto p-6">
                {!selectedCharacterId ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <User className="w-16 h-16 mb-4 opacity-50" />
                    <p>请选择一个角色</p>
                  </div>
                ) : loadingAssets ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-purple-600 mb-4"></div>
                    <div className="text-gray-600 font-medium">加载角色图片中...</div>
                  </div>
                ) : characterAssets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                    <p>该角色暂无图片</p>
                  </div>
                ) : (
                  <div>
                    <div className="mb-4 text-sm text-gray-600">
                      共 {characterAssets.length} 张图片
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {characterAssets.map((asset) => (
                        <button
                          key={asset.id}
                          onClick={async () => {
                            setDownloadingImage(true);
                            try {
                              // Convert URL to blob to file
                              let blob: Blob;
                              
                              if (imageBlobCache.has(asset.output_image_url)) {
                                blob = imageBlobCache.get(asset.output_image_url)!;
                              } else {
                                const response = await fetch(asset.output_image_url);
                                blob = await response.blob();
                                
                                // Cache the blob
                                setImageBlobCache(prev => {
                                  const newCache = new Map(prev);
                                  newCache.set(asset.output_image_url, blob);
                                  return newCache;
                                });
                              }

                              const file = new File(
                                [blob],
                                `character-${asset.task_type}-${Date.now()}.png`,
                                { type: "image/png" }
                              );

                              const newImages = maxImages === 1 ? [file] : [...images, file];
                              if (maxImages > 1 && newImages.length > maxImages) {
                                newImages.splice(0, newImages.length - maxImages);
                              }

                              setImages(newImages);
                              onImagesChange(newImages);
                              setShowCharacterModal(false);
                              setSelectedCharacterId(null);
                              setCharacterAssets([]);
                            } catch (error) {
                              console.error("Failed to load image:", error);
                              alert("加载图片失败，请重试");
                            } finally {
                              setDownloadingImage(false);
                            }
                          }}
                          className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all"
                        >
                          <img
                            src={asset.output_image_url}
                            alt={asset.prompt || '角色图片'}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 bg-white rounded-full p-2">
                              <ImageIcon className="w-5 h-5 text-purple-600" />
                            </div>
                          </div>
                          {asset.task_type === 'avatar' && (
                            <div className="absolute top-1 left-1 bg-purple-500 text-white text-xs px-2 py-0.5 rounded">
                              头像
                            </div>
                          )}
                          {asset.task_type === 'char_image' && (
                            <div className="absolute top-1 left-1 bg-pink-500 text-white text-xs px-2 py-0.5 rounded">
                              角色图
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Downloading Toast */}
      {downloadingImage && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 bg-white rounded-lg shadow-2xl px-6 py-4 flex items-center gap-4 border border-gray-200">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-primary-600"></div>
          <div>
            <div className="text-gray-900 font-medium">下载图片中...</div>
            <div className="text-gray-500 text-sm">首次下载需要几秒钟，之后会更快</div>
          </div>
        </div>
      )}
    </div>
  );
}
