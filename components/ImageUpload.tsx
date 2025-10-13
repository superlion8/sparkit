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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages = [...images, ...files].slice(0, maxImages);
    
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

