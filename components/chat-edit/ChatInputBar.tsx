"use client";

import { useState, useRef, useCallback } from "react";
import { 
  ImagePlus, 
  X, 
  ChevronDown,
  ArrowUp
} from "lucide-react";
import { 
  ChatInputState, 
  ChatModel, 
  InputImage,
  MODEL_CONFIG,
  ASPECT_RATIOS,
  IMAGE_SIZES,
  NUM_IMAGES_OPTIONS,
  MAX_CONCURRENT_TASKS
} from "@/types/chat-edit";

interface ChatInputBarProps {
  input: ChatInputState;
  onInputChange: (payload: Partial<ChatInputState>) => void;
  onAddImage: (image: InputImage) => void;
  onRemoveImage: (id: string) => void;
  onSubmit: () => void;
  isGenerating: boolean;
  activeTaskCount: number;
}

export default function ChatInputBar({
  input,
  onInputChange,
  onAddImage,
  onRemoveImage,
  onSubmit,
  activeTaskCount,
}: ChatInputBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const modelConfig = MODEL_CONFIG[input.model];
  const canSubmit = input.prompt.trim() || input.inputImages.length > 0;
  const isAtMaxTasks = activeTaskCount >= MAX_CONCURRENT_TASKS;

  // 处理文件选择
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return;

    const maxImages = modelConfig.maxImages;
    const currentCount = input.inputImages.length;
    const remaining = maxImages - currentCount;

    const filesToProcess = Array.from(files).slice(0, remaining);

    for (const file of filesToProcess) {
      if (!file.type.startsWith('image/')) continue;

      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        onAddImage({
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          url: '',
          preview,
        });
      };
      reader.readAsDataURL(file);
    }
  }, [input.inputImages.length, modelConfig.maxImages, onAddImage]);

  // 拖拽处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // 键盘提交
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && canSubmit && !isAtMaxTasks) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div 
      className={`bg-white border-t border-gray-200 p-4 ${isDragging ? 'ring-2 ring-primary-500 ring-inset' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 控制栏 - 移到顶部 */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {/* 模型选择 */}
        <div className="relative">
          <button
            onClick={() => setShowModelMenu(!showModelMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors"
          >
            <span>{modelConfig.name}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          {showModelMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowModelMenu(false)} 
              />
              <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[140px]">
                {(Object.keys(MODEL_CONFIG) as ChatModel[]).map((model) => (
                  <button
                    key={model}
                    onClick={() => {
                      onInputChange({ model });
                      setShowModelMenu(false);
                      // 如果切换到不支持多图的模型，只保留第一张图
                      if (!MODEL_CONFIG[model].supportsMultipleImages && input.inputImages.length > 1) {
                        input.inputImages.slice(1).forEach(img => onRemoveImage(img.id));
                      }
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                      input.model === model ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                    }`}
                  >
                    {MODEL_CONFIG[model].name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 生成数量 */}
        <select
          value={input.numImages}
          onChange={(e) => onInputChange({ numImages: parseInt(e.target.value) })}
          className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 border-none cursor-pointer"
        >
          {NUM_IMAGES_OPTIONS.map((num) => (
            <option key={num} value={num}>{num}张</option>
          ))}
        </select>

        {/* 宽高比 */}
        <select
          value={input.aspectRatio}
          onChange={(e) => onInputChange({ aspectRatio: e.target.value })}
          className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 border-none cursor-pointer"
        >
          {ASPECT_RATIOS.map((ratio) => (
            <option key={ratio.value} value={ratio.value}>{ratio.label}</option>
          ))}
        </select>

        {/* 分辨率 - 仅 nano-pro 显示 */}
        {modelConfig.supportsImageSize && (
          <select
            value={input.imageSize}
            onChange={(e) => onInputChange({ imageSize: e.target.value })}
            className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 border-none cursor-pointer"
          >
            {IMAGE_SIZES.map((size) => (
              <option key={size.value} value={size.value}>{size.label}</option>
            ))}
          </select>
        )}

        {/* 任务计数 */}
        {activeTaskCount > 0 && (
          <div className="ml-auto text-sm text-gray-500">
            {activeTaskCount} 个任务进行中
          </div>
        )}
      </div>

      {/* 主输入区 - 图片和输入框在同一行 */}
      <div className="flex items-end gap-3">
        {/* 添加图片按钮 */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 p-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
          title="添加图片"
        >
          <ImagePlus className="w-5 h-5" />
        </button>

        {/* 已上传的图片预览 - 和输入框同行 */}
        {input.inputImages.length > 0 && (
          <div className="flex gap-1.5 flex-shrink-0">
            {input.inputImages.map((img, index) => (
              <div key={img.id} className="relative group">
                <img
                  src={img.preview}
                  alt={`Input ${index + 1}`}
                  className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                />
                <div className="absolute -top-1 -left-1 bg-primary-600 text-white text-[10px] px-1 py-0.5 rounded font-medium">
                  {index + 1}
                </div>
                <button
                  onClick={() => onRemoveImage(img.id)}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Prompt 输入框 */}
        <div className="flex-1 relative">
          <textarea
            value={input.prompt}
            onChange={(e) => onInputChange({ prompt: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="描述你想要的效果..."
            rows={1}
            className="w-full px-4 py-3 pr-4 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 min-h-[48px] max-h-[120px]"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
          />
        </div>

        {/* 发送按钮 - 始终显示箭头 */}
        <button
          onClick={onSubmit}
          disabled={!canSubmit || isAtMaxTasks}
          className="flex-shrink-0 p-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          title={isAtMaxTasks ? `最多同时进行 ${MAX_CONCURRENT_TASKS} 个任务` : '发送'}
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={modelConfig.supportsMultipleImages}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />
    </div>
  );
}
