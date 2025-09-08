'use client';

import { useState, useRef } from 'react';
import { Loader2, Upload, Download, Edit, Wand2, ImageIcon, Copy, Check, X } from 'lucide-react';
import Image from 'next/image';

export function ImageEditor() {
  const [prompt, setPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [editedImage, setEditedImage] = useState<string>('');
  const [error, setError] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
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
    link.download = 'sparkit-edited.png';
    link.click();
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleCopyImage = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2000);
    } catch (error) {
      console.error('Failed to copy image:', error);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setPreviewUrl('');
    setEditedImage('');
    setError('');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-gradient-to-r from-blue-600/20 to-purple-600/20">
            <Wand2 className="w-6 h-6 text-blue-400" />
          </div>
          <h2 className="text-3xl font-bold text-white">
            Edit Images
          </h2>
        </div>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Upload an image and describe how you want to transform it with AI
        </p>
      </div>

      <div className="space-y-6">
        {/* Image Upload Area */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-300">
            Upload your image
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
              previewUrl
                ? 'border-purple-500/50 bg-purple-500/5'
                : 'border-white/20 hover:border-purple-500/50 hover:bg-white/5'
            }`}
          >
            {previewUrl ? (
              <div className="space-y-4">
                <div className="relative inline-block">
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    width={300}
                    height={300}
                    className="mx-auto rounded-xl shadow-lg max-w-full h-auto"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage();
                    }}
                    className="absolute -top-2 -right-2 p-2 rounded-full bg-red-500/80 hover:bg-red-500 text-white transition-colors"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-400">Click to change image</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20">
                  <Upload className="w-8 h-8 text-purple-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white mb-2">
                    Drop an image here or click to upload
                  </p>
                  <p className="text-sm text-gray-400">
                    Supports PNG, JPG, JPEG, WebP (Max 10MB)
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

        {/* Edit Prompt */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-300">
            Describe your edits
          </label>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Add a sunset sky, change the background to a forest, make it more colorful..."
              className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none text-white placeholder-gray-400 backdrop-blur-sm transition-all duration-300"
              rows={4}
            />
            {prompt && (
              <button
                onClick={handleCopyPrompt}
                className="absolute top-3 right-3 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                title="Copy prompt"
              >
                {copiedPrompt ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              {error}
            </div>
          </div>
        )}

        {/* Edit Button */}
        <button
          onClick={handleEdit}
          disabled={loading || !selectedImage || !prompt.trim()}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white py-4 px-8 rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Transforming your image...</span>
            </>
          ) : (
            <>
              <Edit className="w-5 h-5" />
              <span>Edit Image</span>
            </>
          )}
        </button>

        {/* Edited Image Result */}
        {editedImage && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-white mb-2">Your Edited Image</h3>
              <p className="text-gray-400">Click to download or copy to clipboard</p>
            </div>
            
            <div className="relative group max-w-2xl mx-auto">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-1">
                <div className="relative rounded-xl overflow-hidden">
                  <Image
                    src={editedImage}
                    alt="Edited image"
                    width={600}
                    height={600}
                    className="w-full h-auto rounded-xl transition-transform duration-300 group-hover:scale-105"
                  />
                  
                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                    <button
                      onClick={() => handleDownload(editedImage)}
                      className="p-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors"
                      title="Download image"
                    >
                      <Download className="w-5 h-5 text-white" />
                    </button>
                    <button
                      onClick={() => handleCopyImage(editedImage)}
                      className="p-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedImage ? (
                        <Check className="w-5 h-5 text-green-400" />
                      ) : (
                        <Copy className="w-5 h-5 text-white" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty state when no image uploaded */}
        {!selectedImage && !loading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 mb-4">
              <ImageIcon className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2">Ready to edit?</h3>
            <p className="text-gray-500">Upload an image above to start editing with AI</p>
          </div>
        )}
      </div>
    </div>
  );
}