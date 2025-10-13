"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import Image from "next/image";

interface ImageGridProps {
  images: string[];
  onDownload?: (url: string, index: number) => void;
}

export default function ImageGrid({ images, onDownload }: ImageGridProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleDownload = async (url: string, index: number) => {
    if (onDownload) {
      onDownload(url, index);
    } else {
      // Default download behavior
      const link = document.createElement("a");
      link.href = url;
      link.download = `generated-image-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {images.map((url, index) => (
        <div
          key={index}
          className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group"
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <img
            src={url}
            alt={`Generated image ${index + 1}`}
            className="w-full h-full object-cover"
          />
          {hoveredIndex === index && (
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center transition-opacity">
              <button
                onClick={() => handleDownload(url, index)}
                className="bg-white text-gray-900 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-100 transition-colors"
              >
                <Download className="w-4 h-4" />
                下载
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

