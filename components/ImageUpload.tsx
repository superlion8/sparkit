"use client";

import { Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import Image from "next/image";

interface ImageUploadProps {
  maxImages?: number;
  onImagesChange: (images: File[]) => void;
  label?: string;
}

export default function ImageUpload({ 
  maxImages = 1, 
  onImagesChange,
  label = "上传图片"
}: ImageUploadProps) {
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
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
          <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={preview}
              alt={`Upload ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => removeImage(index)}
              className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ))}

        {images.length < maxImages && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-primary-600 min-h-[200px]"
          >
            <Upload className="w-12 h-12" />
            <div className="text-center">
              <span className="text-base font-medium block">点击上传</span>
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
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

