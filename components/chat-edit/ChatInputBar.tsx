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
      className={`bg-white border-t border-gray-200 px-4 py-3 ${isDragging ? 'ring-2 ring-primary-500 ring-inset' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="max-w-4xl mx-auto">
        {/* 已上传的图片预览 - 单独一行显示 */}
        {input.inputImages.length > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap items-center">
            {input.inputImages.map((img, index) => (
              <div key={img.id} className="relative group">
                <img
                  src={img.preview}
                  alt={`Input ${index + 1}`}
                  className="w-14 h-14 object-cover rounded-lg border border-gray-200"
                />
                <div className="absolute -top-1 -left-1 bg-primary-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                  图{index + 1}
                </div>
                <button
                  onClick={() => onRemoveImage(img.id)}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {input.inputImages.length < modelConfig.maxImages && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-14 h-14 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-primary-500 hover:text-primary-500 transition-colors"
              >
                <ImagePlus className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* 主输入区 */}
        <div className="flex items-end gap-2">
          {/* 添加图片按钮 - 没有图片时显示 */}
          {input.inputImages.length === 0 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 p-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
              title="添加图片"
            >
              <ImagePlus className="w-5 h-5" />
            </button>
          )}

          {/* Prompt 输入框 */}
          <div className="flex-1 relative">
            <textarea
              value={input.prompt}
              onChange={(e) => onInputChange({ prompt: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="描述你想要的效果..."
              rows={1}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 min-h-[42px] max-h-[100px] text-sm"
              style={{ height: 'auto' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 100) + 'px';
              }}
            />
          </div>

          {/* 发送按钮 */}
          <button
            onClick={onSubmit}
            disabled={!canSubmit || isAtMaxTasks}
            className="flex-shrink-0 p-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            title={isAtMaxTasks ? `最多同时进行 ${MAX_CONCURRENT_TASKS} 个任务` : '发送'}
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>

        {/* 控制栏 */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {/* 模型选择 */}
          <div className="relative">
            <button
              onClick={() => setShowModelMenu(!showModelMenu)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-600 transition-colors"
            >
              <span>{modelConfig.name}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showModelMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowModelMenu(false)} 
                />
                <div className="absolute bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[120px]">
                  {(Object.keys(MODEL_CONFIG) as ChatModel[]).map((model) => (
                    <button
                      key={model}
                      onClick={() => {
                        onInputChange({ model });
                        setShowModelMenu(false);
                        if (!MODEL_CONFIG[model].supportsMultipleImages && input.inputImages.length > 1) {
                          input.inputImages.slice(1).forEach(img => onRemoveImage(img.id));
                        }
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 ${
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
            className="px-2.5 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-600 border-none cursor-pointer"
          >
            {NUM_IMAGES_OPTIONS.map((num) => (
              <option key={num} value={num}>{num}张</option>
            ))}
          </select>

          {/* 宽高比 */}
          <select
            value={input.aspectRatio}
            onChange={(e) => onInputChange({ aspectRatio: e.target.value })}
            className="px-2.5 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-600 border-none cursor-pointer"
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
              className="px-2.5 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-600 border-none cursor-pointer"
            >
              {IMAGE_SIZES.map((size) => (
                <option key={size.value} value={size.value}>{size.label}</option>
              ))}
            </select>
          )}

          {/* 任务计数 */}
          {activeTaskCount > 0 && (
            <div className="ml-auto text-xs text-gray-500">
              {activeTaskCount} 个任务进行中
            </div>
          )}
        </div>
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
