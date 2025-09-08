'use client';

import { ImageGenerator } from './ImageGenerator';
import { ImageEditor } from './ImageEditor';

interface MainContentProps {
  activeTab: string;
  searchQuery: string;
}

export function MainContent({ activeTab, searchQuery }: MainContentProps) {
  const renderContent = () => {
    switch (activeTab) {
      case 'generate':
        return <ImageGenerator />;
      case 'edit':
        return <ImageEditor />;
      case 'explore':
        return <ExploreContent searchQuery={searchQuery} />;
      case 'gallery':
        return <GalleryContent searchQuery={searchQuery} />;
      case 'moodboards':
        return <MoodboardsContent />;
      case 'chat':
        return <ChatContent />;
      case 'subscribe':
        return <SubscribeContent />;
      case 'help':
        return <HelpContent />;
      case 'updates':
        return <UpdatesContent />;
      default:
        return <ExploreContent searchQuery={searchQuery} />;
    }
  };

  return (
    <div 
      className="flex-1 overflow-y-auto"
      style={{ backgroundColor: 'var(--base-bg)' }}
    >
      <div className="p-6">
        {renderContent()}
      </div>
    </div>
  );
}

// Explore Content Component
function ExploreContent({ searchQuery }: { searchQuery: string }) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 
          className="display-text mb-4"
          style={{ color: 'var(--primary-text)' }}
        >
          Discover Amazing Creations
        </h2>
        <p 
          className="body-large max-w-2xl mx-auto"
          style={{ color: 'var(--secondary-text)' }}
        >
          Explore the latest AI-generated images from our community and get inspired for your next creation
        </p>
      </div>

      {/* Featured Images Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="group relative">
            <div 
              className="aspect-square rounded-2xl overflow-hidden border"
              style={{ 
                backgroundColor: 'var(--surface-bg)',
                borderColor: 'var(--border-color)'
              }}
            >
              <div 
                className="w-full h-full flex items-center justify-center"
                style={{ 
                  background: 'var(--gradient-primary)',
                  opacity: 0.1
                }}
              >
                <span 
                  className="body-small"
                  style={{ color: 'var(--secondary-text)' }}
                >
                  Sample Image {index + 1}
                </span>
              </div>
            </div>
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
              <button 
                className="p-3 rounded-full backdrop-blur-sm transition-colors"
                style={{ backgroundColor: 'var(--surface-bg)' }}
              >
                <span 
                  className="body-small"
                  style={{ color: 'var(--primary-text)' }}
                >
                  View
                </span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Gallery Content Component
function GalleryContent({ searchQuery }: { searchQuery: string }) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Your Gallery</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          All your AI-generated and edited images in one place
        </p>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="group relative">
            <div className="aspect-square bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-purple-600/30 to-blue-600/30 flex items-center justify-center">
                <span className="text-white/50 text-sm">Your Image {index + 1}</span>
              </div>
            </div>
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
              <button className="p-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors">
                <span className="text-white text-sm">Edit</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Moodboards Content Component
function MoodboardsContent() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Moodboards</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Organize your inspiration and create collections of related images
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="group relative">
            <div className="aspect-video bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-purple-600/30 to-blue-600/30 flex items-center justify-center">
                <span className="text-white/50 text-sm">Moodboard {index + 1}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Chat Content Component
function ChatContent() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">AI Assistant</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Chat with our AI assistant for help with prompts, techniques, and creative guidance
        </p>
      </div>

      <div className="bg-black/20 rounded-2xl p-6">
        <p className="text-gray-400 text-center">AI chat interface coming soon...</p>
      </div>
    </div>
  );
}

// Subscribe Content Component
function SubscribeContent() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Upgrade Your Plan</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Unlock more features and higher limits with our premium plans
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['Free', 'Pro', 'Enterprise'].map((plan, index) => (
          <div key={plan} className="bg-black/20 rounded-2xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-2">{plan}</h3>
            <p className="text-gray-400 mb-4">Perfect for {plan.toLowerCase()} users</p>
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-300">Feature 1</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-300">Feature 2</span>
              </div>
            </div>
            <button className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 ${
              index === 1 
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}>
              {index === 0 ? 'Current Plan' : 'Upgrade'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Help Content Component
function HelpContent() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Help & Support</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Find answers to common questions and get help with using Sparkit
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {['Getting Started', 'Image Generation', 'Image Editing', 'Account Settings'].map((topic, index) => (
          <div key={topic} className="bg-black/20 rounded-2xl p-6 border border-white/10 hover:border-purple-500/30 transition-colors cursor-pointer">
            <h3 className="text-lg font-semibold text-white mb-2">{topic}</h3>
            <p className="text-gray-400 text-sm">Learn how to use this feature effectively</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Updates Content Component
function UpdatesContent() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">What's New</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Stay updated with the latest features and improvements
        </p>
      </div>

      <div className="space-y-4">
        {[
          { title: 'New UI Design', date: 'Today', description: 'Completely redesigned interface with Midjourney-inspired layout' },
          { title: 'Enhanced Image Editor', date: 'Yesterday', description: 'Improved editing tools and better user experience' },
          { title: 'Gallery Organization', date: '3 days ago', description: 'New ways to organize and manage your images' }
        ].map((update, index) => (
          <div key={index} className="bg-black/20 rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">{update.title}</h3>
              <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">{update.date}</span>
            </div>
            <p className="text-gray-400">{update.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
