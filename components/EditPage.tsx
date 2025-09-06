'use client';

import React, { useState, useRef } from 'react';
import { Upload, Wand2, Download, RotateCcw, Crop, Palette, Zap } from 'lucide-react';

const EditPage: React.FC = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedImages, setEditedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = async () => {
    if (!uploadedImage || !editPrompt.trim()) return;
    
    setIsEditing(true);
    // Simulate API call
    setTimeout(() => {
      setEditedImages([
        'https://via.placeholder.com/512x512/10b981/ffffff?text=Edited+Image+1',
        'https://via.placeholder.com/512x512/f59e0b/ffffff?text=Edited+Image+2',
        'https://via.placeholder.com/512x512/ef4444/ffffff?text=Edited+Image+3'
      ]);
      setIsEditing(false);
    }, 3000);
  };

  const editPresets = [
    { id: 'enhance', name: 'Enhance', icon: Zap, description: 'Improve quality and details' },
    { id: 'style', name: 'Change Style', icon: Palette, description: 'Apply different art styles' },
    { id: 'background', name: 'Remove Background', icon: Crop, description: 'Remove or change background' },
    { id: 'colorize', name: 'Colorize', icon: Palette, description: 'Add colors to black & white' },
    { id: 'upscale', name: 'Upscale', icon: Zap, description: 'Increase resolution' },
    { id: 'restore', name: 'Restore', icon: RotateCcw, description: 'Fix damaged areas' }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Upload Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Upload Image to Edit</h3>
          
          {!uploadedImage ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-purple-400 hover:bg-purple-50 transition-colors cursor-pointer"
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-600 mb-2">Click to upload an image</p>
              <p className="text-sm text-gray-500">PNG, JPG, GIF up to 10MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={uploadedImage}
                  alt="Uploaded"
                  className="w-full max-w-md mx-auto rounded-lg shadow-sm"
                />
                <button
                  onClick={() => setUploadedImage(null)}
                  className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
                >
                  <RotateCcw className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Options */}
      {uploadedImage && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Edit Options</h3>
            
            {/* Quick Presets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Quick Actions
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {editPresets.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => setEditPrompt(preset.description)}
                      className="p-4 text-left border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
                    >
                      <Icon className="w-6 h-6 text-purple-600 mb-2" />
                      <div className="font-medium text-gray-900">{preset.name}</div>
                      <div className="text-sm text-gray-600">{preset.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Edit Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Edit Instructions
              </label>
              <textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="Describe how you want to edit the image... (e.g., 'Make it look like a watercolor painting', 'Add a sunset background', 'Convert to black and white')"
                className="w-full h-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
              />
            </div>

            {/* Edit Button */}
            <div className="flex justify-end">
              <button
                onClick={handleEdit}
                disabled={!editPrompt.trim() || isEditing}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
              >
                {isEditing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Editing...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Edit Image</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edited Results */}
      {editedImages.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Edited Results</h3>
            <button className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4 mr-2" />
              Download All
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {editedImages.map((image, index) => (
              <div key={index} className="group relative bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="aspect-square">
                  <img
                    src={image}
                    alt={`Edited image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 flex space-x-2 transition-opacity">
                    <button className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors">
                      <Download className="w-4 h-4 text-gray-700" />
                    </button>
                    <button className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors">
                      <RotateCcw className="w-4 h-4 text-gray-700" />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-600 truncate">{editPrompt}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">Edited version {index + 1}</span>
                    <div className="flex space-x-1">
                      <button className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                        <Star className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-blue-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Editing Tips</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Be specific about the changes you want (e.g., "change the background to a beach scene")</li>
          <li>• Mention the style you prefer (e.g., "make it look like a painting", "add a vintage effect")</li>
          <li>• You can combine multiple edits in one prompt (e.g., "remove the background and add a sunset sky")</li>
          <li>• For best results, upload high-quality images with good lighting</li>
        </ul>
      </div>
    </div>
  );
};

export default EditPage;
