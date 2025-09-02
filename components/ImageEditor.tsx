'use client';

import { useState, useRef } from 'react';
import { Loader2, Upload, Download, Edit } from 'lucide-react';
import Image from 'next/image';

export function ImageEditor() {
  const [prompt, setPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [editedImage, setEditedImage] = useState<string>('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setEditedImage('');
      setError('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setEditedImage('');
      setError('');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleEdit = async () => {
    if (!selectedImage || !prompt.trim()) {
      setError('Please select an image and enter a prompt');
      return;
    }

    setLoading(true);
    setError('');
    setEditedImage('');

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('prompt', prompt);

      const response = await fetch('/api/edit-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to edit image');
      }

      if (data.generatedImages && data.generatedImages.length > 0) {
        setEditedImage(`data:image/png;base64,${data.generatedImages[0].bytesBase64Encoded}`);
      }
    } catch (error) {
      console.error('Edit error:', error);
      setError(error instanceof Error ? error.message : 'Failed to edit image');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = 'edited-image.png';
    link.click();
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6 text-gray-800 flex items-center gap-2">
        <Edit className="w-6 h-6 text-purple-600" />
        Edit Image
      </h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Image
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 transition-colors"
          >
            {previewUrl ? (
              <div className="space-y-4">
                <Image
                  src={previewUrl}
                  alt="Preview"
                  width={300}
                  height={300}
                  className="mx-auto rounded-lg shadow-md max-w-full h-auto"
                />
                <p className="text-sm text-gray-600">Click to change image</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-gray-700">
                    Drop an image here or click to upload
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports PNG, JPG, JPEG
                  </p>
                </div>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Edit Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe how you want to edit the image..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            rows={3}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <button
          onClick={handleEdit}
          disabled={loading || !selectedImage || !prompt.trim()}
          className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Editing...
            </>
          ) : (
            <>
              <Edit className="w-5 h-5" />
              Edit Image
            </>
          )}
        </button>

        {editedImage && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800">Edited Image:</h3>
            <div className="relative group">
              <Image
                src={editedImage}
                alt="Edited image"
                width={400}
                height={400}
                className="w-full h-auto rounded-lg shadow-md max-w-md mx-auto"
              />
              <button
                onClick={() => handleDownload(editedImage)}
                className="absolute top-2 right-2 bg-white bg-opacity-90 hover:bg-opacity-100 p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Download className="w-4 h-4 text-gray-700" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}