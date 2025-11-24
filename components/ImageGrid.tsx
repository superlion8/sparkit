"use client";

import { Download, X, ZoomIn, Heart } from "lucide-react";
import { useState } from "react";
import { downloadImage } from "@/lib/downloadUtils";
import FavoriteModal from "./FavoriteModal";

interface ImageGridProps {
  images: string[];
  taskIds?: string[]; // 每张图片对应的 task_id
  onDownload?: (url: string, index: number) => void;
}

export default function ImageGrid({ images, taskIds, onDownload }: ImageGridProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState("");
  const [favoriteModalOpen, setFavoriteModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const handleDownload = async (url: string, index: number) => {
    if (onDownload) {
      onDownload(url, index);
    } else {
      // Use download utility to avoid opening new tab
      await downloadImage(url, `generated-image-${index + 1}.png`);
    }
  };

  const openLightbox = (url: string) => {
    setLightboxImage(url);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxImage("");
  };

  const handleFavorite = (taskId: string, imageUrl: string) => {
    setSelectedTaskId(taskId);
    setSelectedImageUrl(imageUrl);
    setFavoriteModalOpen(true);
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col items-center gap-6">
        {images.map((url, index) => (
          <div key={index} className="w-full max-w-2xl">
            {/* Image Container */}
            <div className="relative bg-gray-100 rounded-lg overflow-hidden shadow-lg group">
              <img
                src={url}
                alt={`Generated image ${index + 1}`}
                className="w-full h-auto object-contain cursor-zoom-in"
                onClick={() => openLightbox(url)}
              />
              {/* Zoom hint on hover */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                <div className="bg-white bg-opacity-90 px-4 py-2 rounded-lg flex items-center gap-2">
                  <ZoomIn className="w-5 h-5 text-gray-700" />
                  <span className="text-sm font-medium text-gray-700">点击查看大图</span>
                </div>
              </div>
            </div>

            {/* Action Buttons - Always visible */}
            <div className="mt-4 flex justify-center gap-3">
              {/* Favorite Button - Only show if taskId exists */}
              {taskIds && taskIds[index] && (
                <button
                  onClick={() => handleFavorite(taskIds[index], url)}
                  className="bg-white text-red-500 border-2 border-red-500 px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-red-50 transition-colors shadow-md"
                  title="收藏图片"
                >
                  <Heart className="w-5 h-5" />
                  收藏
                </button>
              )}
              {/* Download Button */}
              <button
                onClick={() => handleDownload(url, index)}
                className="bg-primary-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-primary-700 transition-colors shadow-md"
              >
                <Download className="w-5 h-5" />
                下载图片
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={lightboxImage}
            alt="Lightbox view"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Favorite Modal */}
      {selectedTaskId && (
        <FavoriteModal
          isOpen={favoriteModalOpen}
          onClose={() => {
            setFavoriteModalOpen(false);
            setSelectedTaskId(null);
            setSelectedImageUrl(null);
          }}
          taskId={selectedTaskId}
          imageUrl={selectedImageUrl || undefined}
          onSuccess={() => {
            // 可以添加成功提示
            console.log('Image favorited successfully');
          }}
        />
      )}
    </>
  );
}

