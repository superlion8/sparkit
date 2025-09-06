'use client';

import React, { useState } from 'react';
import { Upload, Wand2, Download, Share2, Copy, RefreshCw } from 'lucide-react';

const GeneratePage: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedStyle, setSelectedStyle] = useState('realistic');

  const artStyles = [
    { id: 'realistic', name: 'Realistic', preview: '🎨' },
    { id: 'anime', name: 'Anime', preview: '🌸' },
    { id: 'oil_painting', name: 'Oil Painting', preview: '🖼️' },
    { id: 'watercolor', name: 'Watercolor', preview: '🎨' },
    { id: 'digital_art', name: 'Digital Art', preview: '💻' },
    { id: 'sketch', name: 'Sketch', preview: '✏️' },
    { id: 'cyberpunk', name: 'Cyberpunk', preview: '🤖' },
    { id: 'fantasy', name: 'Fantasy', preview: '🧙‍♂️' }
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    // Simulate API call
    setTimeout(() => {
      setGeneratedImages([
        'https://via.placeholder.com/512x512/6366f1/ffffff?text=Generated+Image+1',
        'https://via.placeholder.com/512x512/8b5cf6/ffffff?text=Generated+Image+2',
        'https://via.placeholder.com/512x512/ec4899/ffffff?text=Generated+Image+3'
      ]);
      setIsGenerating(false);
    }, 3000);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Prompt Input Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Describe your image
            </label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A majestic dragon flying over a futuristic city at sunset, highly detailed, cinematic lighting..."
                className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
              />
              <div className="absolute bottom-3 right-3 text-sm text-gray-400">
                {prompt.length}/500
              </div>
            </div>
          </div>

          {/* Art Style Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Art Style
            </label>
            <div className="grid grid-cols-4 gap-3">
              {artStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedStyle === style.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{style.preview}</div>
                  <div className="text-xs font-medium text-gray-700">{style.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                <span className="text-sm text-gray-600">Generate 3 variations</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded border-gray-300" />
                <span className="text-sm text-gray-600">High resolution</span>
              </label>
            </div>
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Generate Images</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Generated Images */}
      {generatedImages.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Generated Images</h3>
            <div className="flex items-center space-x-2">
              <button className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Download className="w-4 h-4 mr-2" />
                Download All
              </button>
              <button className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {generatedImages.map((image, index) => (
              <div key={index} className="group relative bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="aspect-square">
                  <img
                    src={image}
                    alt={`Generated image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 flex space-x-2 transition-opacity">
                    <button className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors">
                      <Download className="w-4 h-4 text-gray-700" />
                    </button>
                    <button className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors">
                      <Share2 className="w-4 h-4 text-gray-700" />
                    </button>
                    <button className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors">
                      <Copy className="w-4 h-4 text-gray-700" />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-600 truncate">{prompt}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">Style: {artStyles.find(s => s.id === selectedStyle)?.name}</span>
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

      {/* Quick Prompts */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Prompts</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            'A serene mountain landscape',
            'Futuristic city at night',
            'Abstract digital art',
            'Portrait of a warrior',
            'Magical forest scene',
            'Space exploration theme',
            'Vintage car design',
            'Fantasy castle'
          ].map((quickPrompt, index) => (
            <button
              key={index}
              onClick={() => setPrompt(quickPrompt)}
              className="p-3 text-left text-sm text-gray-700 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
            >
              {quickPrompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GeneratePage;
