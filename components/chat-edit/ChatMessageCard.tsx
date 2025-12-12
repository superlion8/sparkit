"use client";

import { useState } from "react";
import { 
  ChatMessage, 
  OutputImage,
  MODEL_CONFIG 
} from "@/types/chat-edit";
import { 
  Download, 
  Heart, 
  Loader2, 
  RefreshCw,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface ChatMessageCardProps {
  message: ChatMessage;
  onRegenerate: (message: ChatMessage) => void;
  onToggleFavorite: (messageId: string, imageId: string) => void;
  onDownload: (image: OutputImage) => void;
  accessToken: string | null;
}

export default function ChatMessageCard({
  message,
  onRegenerate,
  onToggleFavorite,
  onDownload,
}: ChatMessageCardProps) {
  const [hoveredInput, setHoveredInput] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const modelConfig = MODEL_CONFIG[message.model];
  const isGenerating = message.status === 'generating';
  const isError = message.status === 'error';

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // 打开 lightbox
  const openLightbox = (images: { url: string; preview?: string }[], index: number) => {
    const allUrls = images.map(img => img.url || img.preview || '');
    setLightboxImage(allUrls[index]);
    setLightboxIndex(index);
  };

  // 关闭 lightbox
  const closeLightbox = () => {
    setLightboxImage(null);
  };

  // Lightbox 导航
  const navigateLightbox = (direction: 'prev' | 'next') => {
    const images = message.outputImages;
    if (!images.length) return;
    
    let newIndex = lightboxIndex;
    if (direction === 'prev') {
      newIndex = lightboxIndex > 0 ? lightboxIndex - 1 : images.length - 1;
    } else {
      newIndex = lightboxIndex < images.length - 1 ? lightboxIndex + 1 : 0;
    }
    setLightboxIndex(newIndex);
    setLightboxImage(images[newIndex].url);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex">
        {/* 左侧：输入信息 */}
        <div 
          className="w-64 flex-shrink-0 p-4 bg-gray-50 border-r border-gray-200 relative"
          onMouseEnter={() => setHoveredInput(true)}
          onMouseLeave={() => setHoveredInput(false)}
        >
          {/* 输入图片 */}
          {message.inputImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {message.inputImages.map((img, index) => (
                <div key={img.id} className="relative">
                  <img
                    src={img.preview || img.url}
                    alt={`Input ${index + 1}`}
                    className="w-14 h-14 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => openLightbox(message.inputImages.map(i => ({ url: i.preview || i.url })), index)}
                  />
                  <div className="absolute -top-1 -left-1 bg-primary-600 text-white text-xs px-1 py-0.5 rounded text-[10px] font-medium">
                    图{index + 1}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Prompt */}
          <div className="text-sm text-gray-700 break-words">
            {message.prompt || <span className="text-gray-400 italic">无提示词</span>}
          </div>

          {/* 模型和时间 */}
          <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
            <span className="px-2 py-0.5 bg-gray-200 rounded-full">{modelConfig.name}</span>
            <span>{formatTime(message.timestamp)}</span>
          </div>

          {/* 引用按钮 */}
          {hoveredInput && (
            <button
              onClick={() => onRegenerate(message)}
              className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              引用
            </button>
          )}
        </div>

        {/* 右侧：输出结果 */}
        <div className="flex-1 p-4">
          {/* 生成中 */}
          {isGenerating && (
            <div className="flex items-center justify-center h-40 bg-gray-50 rounded-lg">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
                <span className="text-sm text-gray-500">生成中...</span>
              </div>
            </div>
          )}

          {/* 错误状态 */}
          {isError && (
            <div className="flex items-center justify-center h-40 bg-red-50 rounded-lg">
              <div className="flex flex-col items-center gap-3 text-center px-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
                <span className="text-sm text-red-600">{message.error || '生成失败'}</span>
                <button
                  onClick={() => onRegenerate(message)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-300 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  重试
                </button>
              </div>
            </div>
          )}

          {/* 生成结果 */}
          {message.status === 'completed' && message.outputImages.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {message.outputImages.map((img, index) => (
                <div key={img.id} className="relative group">
                  <img
                    src={img.url}
                    alt={`Output ${index + 1}`}
                    className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-95 transition-opacity"
                    onClick={() => {
                      setLightboxImage(img.url);
                      setLightboxIndex(index);
                    }}
                  />
                  {/* 操作按钮 */}
                  <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(message.id, img.id);
                      }}
                      className={`p-1.5 rounded-lg backdrop-blur-sm transition-colors ${
                        img.isFavorited 
                          ? 'bg-red-500 text-white' 
                          : 'bg-white/80 text-gray-700 hover:bg-white'
                      }`}
                      title={img.isFavorited ? '取消收藏' : '收藏'}
                    >
                      <Heart className={`w-4 h-4 ${img.isFavorited ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload(img);
                      }}
                      className="p-1.5 rounded-lg bg-white/80 text-gray-700 hover:bg-white backdrop-blur-sm transition-colors"
                      title="下载"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-8 h-8" />
          </button>
          
          {message.outputImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateLightbox('prev');
                }}
                className="absolute left-4 p-2 text-white/80 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-10 h-10" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateLightbox('next');
                }}
                className="absolute right-4 p-2 text-white/80 hover:text-white transition-colors"
              >
                <ChevronRight className="w-10 h-10" />
              </button>
            </>
          )}
          
          <img
            src={lightboxImage}
            alt="Preview"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          
          {message.outputImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
              {lightboxIndex + 1} / {message.outputImages.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}




