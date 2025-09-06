'use client';

import React, { useState } from 'react';
import { Search, Filter, Grid, List, Download, Share2, Star, Trash2, Eye } from 'lucide-react';

const GalleryPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const [filter, setFilter] = useState('all');

  const images = [
    { id: 1, url: 'https://via.placeholder.com/400x400/6366f1/ffffff?text=Image+1', title: 'Futuristic City', style: 'Cyberpunk', date: '2024-01-15', isFavorite: true },
    { id: 2, url: 'https://via.placeholder.com/400x400/8b5cf6/ffffff?text=Image+2', title: 'Mountain Landscape', style: 'Realistic', date: '2024-01-14', isFavorite: false },
    { id: 3, url: 'https://via.placeholder.com/400x400/ec4899/ffffff?text=Image+3', title: 'Abstract Art', style: 'Digital Art', date: '2024-01-13', isFavorite: true },
    { id: 4, url: 'https://via.placeholder.com/400x400/10b981/ffffff?text=Image+4', title: 'Portrait Study', style: 'Oil Painting', date: '2024-01-12', isFavorite: false },
    { id: 5, url: 'https://via.placeholder.com/400x400/f59e0b/ffffff?text=Image+5', title: 'Fantasy Castle', style: 'Fantasy', date: '2024-01-11', isFavorite: true },
    { id: 6, url: 'https://via.placeholder.com/400x400/ef4444/ffffff?text=Image+6', title: 'Space Scene', style: 'Sci-Fi', date: '2024-01-10', isFavorite: false },
    { id: 7, url: 'https://via.placeholder.com/400x400/06b6d4/ffffff?text=Image+7', title: 'Watercolor Flower', style: 'Watercolor', date: '2024-01-09', isFavorite: true },
    { id: 8, url: 'https://via.placeholder.com/400x400/84cc16/ffffff?text=Image+8', title: 'Anime Character', style: 'Anime', date: '2024-01-08', isFavorite: false }
  ];

  const filteredImages = filter === 'all' 
    ? images 
    : filter === 'favorites' 
    ? images.filter(img => img.isFavorite)
    : images.filter(img => img.style === filter);

  const toggleImageSelection = (imageId: number) => {
    setSelectedImages(prev => 
      prev.includes(imageId) 
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  const toggleFavorite = (imageId: number) => {
    // In a real app, this would update the backend
    console.log('Toggle favorite for image:', imageId);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gallery</h1>
          <p className="text-gray-600">All your AI-generated and edited images</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Download Selected ({selectedImages.length})
          </button>
          <button className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search images by title or style..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              >
                <option value="all">All Images</option>
                <option value="favorites">Favorites</option>
                <option value="Realistic">Realistic</option>
                <option value="Anime">Anime</option>
                <option value="Cyberpunk">Cyberpunk</option>
                <option value="Fantasy">Fantasy</option>
                <option value="Digital Art">Digital Art</option>
                <option value="Oil Painting">Oil Painting</option>
                <option value="Watercolor">Watercolor</option>
                <option value="Sci-Fi">Sci-Fi</option>
              </select>
            </div>

            {/* View Mode */}
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-purple-100 text-purple-600' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-purple-100 text-purple-600' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Images Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredImages.map((image) => (
            <div key={image.id} className="group relative bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="aspect-square relative">
                <img
                  src={image.url}
                  alt={image.title}
                  className="w-full h-full object-cover"
                />
                
                {/* Selection Checkbox */}
                <div className="absolute top-3 left-3">
                  <input
                    type="checkbox"
                    checked={selectedImages.includes(image.id)}
                    onChange={() => toggleImageSelection(image.id)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 flex space-x-2 transition-opacity">
                    <button className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors">
                      <Eye className="w-4 h-4 text-gray-700" />
                    </button>
                    <button className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors">
                      <Download className="w-4 h-4 text-gray-700" />
                    </button>
                    <button 
                      onClick={() => toggleFavorite(image.id)}
                      className={`p-2 rounded-lg shadow-lg transition-colors ${
                        image.isFavorite 
                          ? 'bg-yellow-100 text-yellow-600' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${image.isFavorite ? 'fill-current' : ''}`} />
                    </button>
                    <button className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors">
                      <Share2 className="w-4 h-4 text-gray-700" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-medium text-gray-900 truncate">{image.title}</h3>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-gray-500">{image.style}</span>
                  <span className="text-xs text-gray-400">{image.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {filteredImages.map((image) => (
            <div key={image.id} className="flex items-center p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-4 flex-1">
                <input
                  type="checkbox"
                  checked={selectedImages.includes(image.id)}
                  onChange={() => toggleImageSelection(image.id)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <div className="w-16 h-16 rounded-lg overflow-hidden">
                  <img src={image.url} alt={image.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{image.title}</h3>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-sm text-gray-500">{image.style}</span>
                    <span className="text-sm text-gray-400">{image.date}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => toggleFavorite(image.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    image.isFavorite 
                      ? 'bg-yellow-100 text-yellow-600' 
                      : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
                  }`}
                >
                  <Star className={`w-4 h-4 ${image.isFavorite ? 'fill-current' : ''}`} />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Download className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Share2 className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredImages.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Image className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No images found</h3>
          <p className="text-gray-500 mb-6">Try adjusting your filters or generate some new images</p>
          <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all">
            Generate New Image
          </button>
        </div>
      )}
    </div>
  );
};

export default GalleryPage;
