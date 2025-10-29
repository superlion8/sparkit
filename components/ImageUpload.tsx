"use client";

import { Upload, X, History, Image as ImageIcon } from "lucide-react";
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
  
  // Upload method selection modal
  const [showUploadMethodModal, setShowUploadMethodModal] = useState(false);
  
  // History selection modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const { accessToken, isAuthenticated } = useAuth();

  // Fetch history when modal opens
  const fetchHistory = async () => {
    if (!isAuthenticated || !accessToken) {
      console.log("Not authenticated, cannot fetch history");
      return;
    }

    setLoadingHistory(true);
    try {
      console.log("Fetching history with token:", accessToken.substring(0, 20) + "...");
      const response = await fetch("/api/history?pageSize=50", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log("History API response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("History data:", data);
        // Filter records that have output images
        const recordsWithImages = (data.history || []).filter(
          (record: HistoryRecord) => record.output_image_url
        );
        console.log("Records with images:", recordsWithImages.length);
        setHistoryRecords(recordsWithImages);
      } else {
        console.error("Failed to fetch history:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleFileChange = async (files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    await processFiles(fileArray);
  };

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
    
    const newImages = [...images, ...compressedFiles].slice(0, maxImages);
    
    setImages(newImages);
    onImagesChange(newImages);

    // Generate previews
    const newPreviews: string[] = [];
    newImages.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === newImages.length) {
          setPreviews(newPreviews);
        }
      };
      reader.readAsDataURL(file);
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
      // Fetch the image and convert to File
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const filename = `history-image-${Date.now()}.jpg`;
      const file = new File([blob], filename, { type: blob.type });
      
      await processFiles([file]);
      setShowHistoryModal(false);
      setShowUploadMethodModal(false);
    } catch (error) {
      console.error("Failed to load image from history:", error);
      alert("加载历史图片失败，请重试");
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
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-500">加载中...</div>
                </div>
              ) : historyRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <History className="w-16 h-16 mb-4 opacity-50" />
                  <p>暂无历史图片</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {historyRecords.map((record) => (
                    <button
                      key={record.id}
                      onClick={() => handleSelectFromHistory(record.output_image_url!)}
                      className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden hover:ring-2 hover:ring-primary-500 transition-all"
                    >
                      <img
                        src={record.output_image_url!}
                        alt="历史图片"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          选择
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
