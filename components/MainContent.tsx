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
  const plans = [
    {
      name: 'Free',
      description: 'Perfect for getting started',
      price: '$0',
      period: '/month',
      features: ['10 generations/month', 'Basic editing tools', 'Community support'],
      bgColor: '#F5F5F7',
      textColor: '#222',
      borderColor: '#E0E0E0',
      buttonColor: '#6B7280',
      buttonText: 'Current Plan',
      isCurrent: true
    },
    {
      name: 'Pro',
      description: 'Perfect for creators',
      price: '$19',
      period: '/month',
      features: ['100 generations/month', 'Advanced editing tools', 'Priority support', 'HD exports'],
      bgColor: '#FFF5E5',
      textColor: '#FF6A3D',
      borderColor: '#FFD4A3',
      buttonColor: '#FF6A3D',
      buttonText: 'Upgrade to Pro',
      isCurrent: false,
      isPopular: true
    },
    {
      name: 'Enterprise',
      description: 'Perfect for teams',
      price: '$99',
      period: '/month',
      features: ['Unlimited generations', 'All editing tools', '24/7 support', 'API access', 'Custom models'],
      bgColor: '#F3E8FF',
      textColor: '#7C3AED',
      borderColor: '#C4B5FD',
      buttonColor: '#7C3AED',
      buttonText: 'Contact Sales',
      isCurrent: false
    }
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 
          className="display-text mb-4"
          style={{ color: 'var(--primary-text)' }}
        >
          Upgrade Your Plan
        </h2>
        <p 
          className="body-large max-w-2xl mx-auto"
          style={{ color: 'var(--secondary-text)' }}
        >
          Unlock more features and higher limits with our premium plans
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, index) => (
          <div 
            key={plan.name}
            className={`rounded-2xl p-6 border-2 transition-all duration-300 hover:shadow-lg hover:scale-105 ${
              plan.isPopular ? 'ring-2 ring-orange-400 ring-opacity-50' : ''
            }`}
            style={{
              backgroundColor: plan.bgColor,
              borderColor: plan.borderColor
            }}
          >
            {plan.isPopular && (
              <div className="text-center mb-4">
                <span 
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{ 
                    backgroundColor: '#FF6A3D', 
                    color: 'white' 
                  }}
                >
                  Most Popular
                </span>
              </div>
            )}
            
            <div className="text-center mb-6">
              <h3 
                className="h2-text mb-2"
                style={{ color: plan.textColor }}
              >
                {plan.name}
              </h3>
              <p 
                className="body-small mb-4"
                style={{ color: 'var(--secondary-text)' }}
              >
                {plan.description}
              </p>
              <div className="flex items-baseline justify-center">
                <span 
                  className="text-4xl font-bold"
                  style={{ color: plan.textColor }}
                >
                  {plan.price}
                </span>
                <span 
                  className="body-small ml-1"
                  style={{ color: 'var(--secondary-text)' }}
                >
                  {plan.period}
                </span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {plan.features.map((feature, featureIndex) => (
                <div key={featureIndex} className="flex items-center gap-3">
                  <div 
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: plan.textColor }}
                  ></div>
                  <span 
                    className="body-small"
                    style={{ color: 'var(--secondary-text)' }}
                  >
                    {feature}
                  </span>
                </div>
              ))}
            </div>

            <button 
              className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 hover:shadow-md ${
                plan.isCurrent 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:scale-105'
              }`}
              style={{
                backgroundColor: plan.isCurrent ? '#E5E7EB' : plan.buttonColor,
                color: plan.isCurrent ? '#6B7280' : 'white'
              }}
              disabled={plan.isCurrent}
            >
              {plan.buttonText}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Help Content Component
function HelpContent() {
  const helpTopics = [
    {
      title: 'Getting Started',
      description: 'Learn how to use this feature effectively',
      icon: '⚡',
      bgColor: '#FFF5E5',
      textColor: '#FF6A3D',
      hoverBg: 'linear-gradient(135deg, #FFF5E5 0%, #FFE5CC 100%)',
      borderColor: '#FFD4A3'
    },
    {
      title: 'Image Generation',
      description: 'Learn how to use this feature effectively',
      icon: '🎨',
      bgColor: '#F3E8FF',
      textColor: '#7C3AED',
      hoverBg: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)',
      borderColor: '#C4B5FD'
    },
    {
      title: 'Image Editing',
      description: 'Learn how to use this feature effectively',
      icon: '✨',
      bgColor: '#E6F9F5',
      textColor: '#10B981',
      hoverBg: 'linear-gradient(135deg, #E6F9F5 0%, #D1FAE5 100%)',
      borderColor: '#A7F3D0'
    },
    {
      title: 'Account Settings',
      description: 'Learn how to use this feature effectively',
      icon: '⚙️',
      bgColor: '#E6F0FF',
      textColor: '#2563EB',
      hoverBg: 'linear-gradient(135deg, #E6F0FF 0%, #DBEAFE 100%)',
      borderColor: '#93C5FD'
    }
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 
          className="display-text mb-4"
          style={{ color: 'var(--primary-text)' }}
        >
          Help & Support
        </h2>
        <p 
          className="body-large max-w-2xl mx-auto"
          style={{ color: 'var(--secondary-text)' }}
        >
          Find answers to common questions and get help with using Sparkit
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {helpTopics.map((topic, index) => (
          <div 
            key={topic.title}
            className="rounded-2xl p-6 border-2 transition-all duration-300 cursor-pointer hover:shadow-lg hover:scale-105"
            style={{
              backgroundColor: topic.bgColor,
              borderColor: topic.borderColor,
              background: topic.bgColor
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = topic.hoverBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = topic.bgColor;
            }}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{topic.icon}</span>
              <div className="flex-1">
                <h3 
                  className="h3-text mb-2"
                  style={{ color: topic.textColor }}
                >
                  {topic.title}
                </h3>
                <p 
                  className="body-small"
                  style={{ color: 'var(--secondary-text)' }}
                >
                  {topic.description}
                </p>
              </div>
            </div>
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
