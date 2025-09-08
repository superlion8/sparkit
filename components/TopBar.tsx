'use client';

import { useState } from 'react';
import { Search, Filter, Settings, Zap, Bell, User } from 'lucide-react';

interface TopBarProps {
  currentTab: string;
  onSearch: (query: string) => void;
}

export function TopBar({ currentTab, onSearch }: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const getTabTitle = (tab: string) => {
    const titles: { [key: string]: string } = {
      explore: 'Explore',
      generate: 'Create',
      edit: 'Edit',
      gallery: 'Gallery',
      moodboards: 'Moodboards',
      organize: 'Organize',
      chat: 'Chat',
      tasks: 'Tasks',
      subscribe: 'Subscribe',
      help: 'Help',
      updates: 'Updates'
    };
    return titles[tab] || 'Sparkit';
  };

  const getTabDescription = (tab: string) => {
    const descriptions: { [key: string]: string } = {
      explore: 'Discover amazing AI-generated images',
      generate: 'Create stunning images with AI',
      edit: 'Transform your images with AI editing',
      gallery: 'Your personal collection',
      moodboards: 'Organize your inspiration',
      organize: 'Manage your files and folders',
      chat: 'Chat with AI assistant',
      tasks: 'View your generation queue',
      subscribe: 'Upgrade your plan',
      help: 'Get help and support',
      updates: 'Latest updates and features'
    };
    return descriptions[tab] || 'AI Image Studio';
  };

  return (
    <div 
      className="backdrop-blur-xl border-b px-4 lg:px-6 py-4"
      style={{
        backgroundColor: 'var(--surface-bg)',
        borderColor: 'var(--border-color)',
        opacity: 0.95
      }}
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left Section */}
        <div className="flex items-center gap-4 lg:gap-6">
          <div>
            <h1 
              className="h1-text"
              style={{ color: 'var(--primary-text)' }}
            >
              {getTabTitle(currentTab)}
            </h1>
            <p 
              className="body-small hidden sm:block"
              style={{ color: 'var(--secondary-text)' }}
            >
              {getTabDescription(currentTab)}
            </p>
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-2xl lg:mx-8">
          <form onSubmit={handleSearch} className="relative">
            <div className="relative">
              <Search 
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 lg:w-5 lg:h-5" 
                style={{ color: 'var(--secondary-text)' }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  currentTab === 'generate' 
                    ? "Describe the image you want to create..." 
                    : currentTab === 'edit'
                    ? "Search your images to edit..."
                    : "Search images, prompts, or collections..."
                }
                className="w-full pl-10 lg:pl-12 pr-4 py-2 lg:py-3 border rounded-xl lg:rounded-2xl transition-all duration-300 backdrop-blur-sm body-large"
                style={{
                  backgroundColor: 'var(--base-bg)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--primary-text)'
                }}
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 lg:p-2 rounded-lg transition-all duration-300"
                style={{ background: 'var(--gradient-primary)' }}
              >
                <Search className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
              </button>
            </div>
          </form>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2 lg:gap-3">
          {/* Filter Button */}
          <button 
            className="p-2 lg:p-3 rounded-xl hover:bg-white/20 transition-colors"
            style={{ 
              backgroundColor: 'var(--surface-bg)',
              color: 'var(--secondary-text)'
            }}
          >
            <Filter className="w-4 h-4 lg:w-5 lg:h-5" />
          </button>

          {/* Settings Button */}
          <button 
            className="p-2 lg:p-3 rounded-xl hover:bg-white/20 transition-colors"
            style={{ 
              backgroundColor: 'var(--surface-bg)',
              color: 'var(--secondary-text)'
            }}
          >
            <Settings className="w-4 h-4 lg:w-5 lg:h-5" />
          </button>

          {/* Notifications */}
          <button 
            className="p-2 lg:p-3 rounded-xl hover:bg-white/20 transition-colors relative"
            style={{ 
              backgroundColor: 'var(--surface-bg)',
              color: 'var(--secondary-text)'
            }}
          >
            <Bell className="w-4 h-4 lg:w-5 lg:h-5" />
            <span 
              className="absolute -top-1 -right-1 w-2 h-2 lg:w-3 lg:h-3 rounded-full"
              style={{ backgroundColor: 'var(--error-color)' }}
            ></span>
          </button>

          {/* Quick Actions */}
          {currentTab === 'generate' && (
            <button 
              className="hidden sm:flex items-center gap-2 px-3 lg:px-4 py-2 lg:py-3 text-white rounded-xl font-semibold transition-all duration-300 text-sm lg:text-base"
              style={{ background: 'var(--gradient-primary)' }}
            >
              <Zap className="w-3 h-3 lg:w-4 lg:h-4" />
              <span className="hidden lg:inline">Quick Generate</span>
            </button>
          )}

          {/* User Profile */}
          <div 
            className="flex items-center gap-2 lg:gap-3 p-1.5 lg:p-2 rounded-xl hover:bg-white/20 transition-colors cursor-pointer"
            style={{ 
              backgroundColor: 'var(--surface-bg)',
              color: 'var(--secondary-text)'
            }}
          >
            <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full overflow-hidden flex items-center justify-center">
              <img 
                src="/sparkit-logo.png" 
                alt="User Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="hidden lg:block">
              <p 
                className="body-small font-medium"
                style={{ color: 'var(--primary-text)' }}
              >
                Free Plan
              </p>
              <p 
                className="caption-text"
                style={{ color: 'var(--secondary-text)' }}
              >
                0/10 generations
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
