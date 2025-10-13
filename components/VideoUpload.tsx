"use client";

import { Upload, X, Video } from "lucide-react";
import { useRef, useState } from "react";

interface VideoUploadProps {
  onVideoChange: (video: File | null) => void;
  label?: string;
}

export default function VideoUpload({ 
  onVideoChange,
  label = "上传视频"
}: VideoUploadProps) {
  const [video, setVideo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('video/')) {
      alert('请上传视频文件');
      return;
    }

    // 验证文件大小 (100MB 限制)
    if (file.size > 100 * 1024 * 1024) {
      alert('视频文件不能超过 100MB');
      return;
    }
    
    setVideo(file);
    onVideoChange(file);

    // 生成预览
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeVideo = () => {
    setVideo(null);
    setPreview("");
    onVideoChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>

      {preview ? (
        <div className="relative bg-gray-100 rounded-lg overflow-hidden">
          <video
            src={preview}
            controls
            className="w-full h-auto max-h-[400px] object-contain"
          />
          <button
            onClick={removeVideo}
            className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors shadow-lg"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded text-sm">
            {video?.name} ({formatFileSize(video?.size || 0)})
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-primary-600 min-h-[200px] py-8"
        >
          <Video className="w-16 h-16" />
          <div className="text-center">
            <span className="text-base font-medium block">点击上传视频</span>
            <span className="text-xs text-gray-400 mt-1 block">支持 MP4, MOV, AVI, WebM</span>
            <span className="text-xs text-gray-400 mt-1 block">最大 100MB</span>
          </div>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

