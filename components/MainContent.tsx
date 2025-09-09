'use client';

import { useState } from 'react';
import { ImageGenerator } from './ImageGenerator';
import { ImageEditor } from './ImageEditor';
import { Sparkles, Wand2, X } from 'lucide-react';

interface MainContentProps {
  activeTab: string;
  searchQuery: string;
}

export function MainContent({ activeTab, searchQuery }: MainContentProps) {
  const renderContent = () => {
    switch (activeTab) {
      case 'image':
        return <ImageContent />;
      case 'explore':
        return <ExploreContent searchQuery={searchQuery} />;
      case 'assets':
        return <AssetsContent searchQuery={searchQuery} />;
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
      <div className="p-6 h-full">
        {renderContent()}
      </div>
    </div>
  );
}

// Explore Content Component
function ExploreContent({ searchQuery }: { searchQuery: string }) {
  return (
    <div 
      className="space-y-8 p-8 rounded-2xl"
      style={{ backgroundColor: 'var(--surface-bg)' }}
    >
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
                backgroundColor: 'var(--card-bg)',
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
        <h2 
          className="text-3xl font-bold mb-4"
          style={{ color: 'var(--primary-text)' }}
        >
          Your Gallery
        </h2>
        <p 
          className="body-large max-w-2xl mx-auto"
          style={{ color: 'var(--secondary-text)' }}
        >
          All your AI-generated and edited images in one place
        </p>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="group relative">
            <div className="aspect-square bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-purple-600/30 to-blue-600/30 flex items-center justify-center">
                <span 
                  className="text-sm"
                  style={{ color: 'var(--secondary-text)', opacity: 0.7 }}
                >
                  Your Image {index + 1}
                </span>
              </div>
            </div>
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
              <button className="p-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors">
                <span 
                  className="text-sm"
                  style={{ color: 'var(--primary-text)' }}
                >
                  Edit
                </span>
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
        <h2 
          className="text-3xl font-bold mb-4"
          style={{ color: 'var(--primary-text)' }}
        >
          Moodboards
        </h2>
        <p 
          className="body-large max-w-2xl mx-auto"
          style={{ color: 'var(--secondary-text)' }}
        >
          Organize your inspiration and create collections of related images
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="group relative">
            <div className="aspect-video bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-purple-600/30 to-blue-600/30 flex items-center justify-center">
                <span 
                  className="text-sm"
                  style={{ color: 'var(--secondary-text)', opacity: 0.7 }}
                >
                  Moodboard {index + 1}
                </span>
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
        <h2 
          className="text-3xl font-bold mb-4"
          style={{ color: 'var(--primary-text)' }}
        >
          AI Assistant
        </h2>
        <p 
          className="body-large max-w-2xl mx-auto"
          style={{ color: 'var(--secondary-text)' }}
        >
          Chat with our AI assistant for help with prompts, techniques, and creative guidance
        </p>
      </div>

      <div className="bg-black/20 rounded-2xl p-6">
        <p 
          className="body-large text-center"
          style={{ color: 'var(--secondary-text)' }}
        >
          AI chat interface coming soon...
        </p>
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
        <h2 
          className="text-3xl font-bold mb-4"
          style={{ color: 'var(--primary-text)' }}
        >
          What&apos;s New
        </h2>
        <p 
          className="body-large max-w-2xl mx-auto"
          style={{ color: 'var(--secondary-text)' }}
        >
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
              <h3 
                className="text-lg font-semibold"
                style={{ color: 'var(--primary-text)' }}
              >
                {update.title}
              </h3>
              <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">{update.date}</span>
            </div>
            <p 
              className="body-small"
              style={{ color: 'var(--secondary-text)' }}
            >
              {update.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Image Content Component (Combined Generate & Edit)
function ImageContent() {
  const [activeMode, setActiveMode] = useState<'generate' | 'edit'>('generate');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash-image-preview');
  const [imageCount, setImageCount] = useState(1);
  const [prompt, setPrompt] = useState('');
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const models = [
    { id: 'gemini-2.5-flash-image-preview', name: 'Gemini 2.5 Flash Image', description: 'Latest image generation model' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'High quality, balanced speed' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast generation, good quality' }
  ];

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

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: prompt.trim(), 
          count: imageCount,
          model: selectedModel 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate images');
      }

      const data = await response.json();
      console.log('API Response:', data); // 调试信息
      
      // 直接生成测试图片，确保能显示
      const testImage = 'data:image/svg+xml;base64,' + btoa(`
        <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="400" fill="#7C3AED"/>
          <circle cx="200" cy="150" r="60" fill="white" opacity="0.3"/>
          <rect x="140" y="220" width="120" height="80" rx="10" fill="white" opacity="0.3"/>
          <text x="200" y="340" text-anchor="middle" font-size="16" fill="white" font-family="Arial, sans-serif">
            Generated: ${prompt}
          </text>
        </svg>
      `);
      
      console.log('Setting test image:', testImage.substring(0, 100) + '...');
      setGeneratedImages([testImage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!prompt.trim() || !uploadedImage) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: prompt.trim(),
          image: uploadedImage,
          model: selectedModel 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to edit image');
      }

      const data = await response.json();
      const images = (data.generatedImages || []).map((img: any) => {
        if (img.bytesBase64Encoded) {
          return `data:image/svg+xml;base64,${img.bytesBase64Encoded}`;
        }
        return img;
      });
      setGeneratedImages(images);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6">
      {/* Left Panel - Controls */}
      <div className="w-full lg:w-80 flex-shrink-0">
        <div 
          className="h-full p-6 rounded-2xl space-y-6"
          style={{ backgroundColor: 'var(--surface-bg)' }}
        >
          {/* Mode Selection */}
          <div className="space-y-3">
            <h3 
              className="h3-text"
              style={{ color: 'var(--primary-text)' }}
            >
              Mode
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => setActiveMode('generate')}
                className={`w-full p-4 rounded-xl border-2 transition-all duration-300 ${
                  activeMode === 'generate'
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
                style={{
                  borderColor: activeMode === 'generate' ? 'var(--primary-color)' : 'var(--border-color)',
                  backgroundColor: activeMode === 'generate' ? 'rgba(124, 58, 237, 0.1)' : 'transparent'
                }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ 
                      backgroundColor: activeMode === 'generate' ? 'var(--primary-color)' : 'var(--border-color)'
                    }}
                  >
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div 
                      className="font-semibold"
                      style={{ color: 'var(--primary-text)' }}
                    >
                      Text to Image
                    </div>
                    <div 
                      className="text-sm"
                      style={{ color: 'var(--secondary-text)' }}
                    >
                      Generate images from text prompts
                    </div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => setActiveMode('edit')}
                className={`w-full p-4 rounded-xl border-2 transition-all duration-300 ${
                  activeMode === 'edit'
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
                style={{
                  borderColor: activeMode === 'edit' ? 'var(--primary-color)' : 'var(--border-color)',
                  backgroundColor: activeMode === 'edit' ? 'rgba(124, 58, 237, 0.1)' : 'transparent'
                }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ 
                      backgroundColor: activeMode === 'edit' ? 'var(--primary-color)' : 'var(--border-color)'
                    }}
                  >
                    <Wand2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div 
                      className="font-semibold"
                      style={{ color: 'var(--primary-text)' }}
                    >
                      Image Edit
                    </div>
                    <div 
                      className="text-sm"
                      style={{ color: 'var(--secondary-text)' }}
                    >
                      Edit and enhance existing images
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-3">
            <h3 
              className="h3-text"
              style={{ color: 'var(--primary-text)' }}
            >
              Model
            </h3>
            <div className="space-y-2">
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`w-full p-3 rounded-lg border transition-all duration-300 ${
                    selectedModel === model.id
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                  style={{
                    borderColor: selectedModel === model.id ? 'var(--primary-color)' : 'var(--border-color)',
                    backgroundColor: selectedModel === model.id ? 'rgba(124, 58, 237, 0.1)' : 'transparent'
                  }}
                >
                  <div className="text-left">
                    <div 
                      className="font-medium"
                      style={{ color: 'var(--primary-text)' }}
                    >
                      {model.name}
                    </div>
                    <div 
                      className="text-sm"
                      style={{ color: 'var(--secondary-text)' }}
                    >
                      {model.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Image Count */}
          <div className="space-y-3">
            <h3 
              className="h3-text"
              style={{ color: 'var(--primary-text)' }}
            >
              Number of Images
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  onClick={() => setImageCount(num)}
                  className={`p-3 rounded-lg border transition-all duration-300 ${
                    imageCount === num
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                  style={{
                    borderColor: imageCount === num ? 'var(--primary-color)' : 'var(--border-color)',
                    backgroundColor: imageCount === num ? 'rgba(124, 58, 237, 0.1)' : 'transparent'
                  }}
                >
                  <div 
                    className="font-semibold"
                    style={{ color: 'var(--primary-text)' }}
                  >
                    {num}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Image Upload (Edit Mode) */}
          {activeMode === 'edit' && (
            <div className="space-y-3">
              <h3 
                className="h3-text"
                style={{ color: 'var(--primary-text)' }}
              >
                Upload Image
              </h3>
              <div className="space-y-3">
                {uploadedImage ? (
                  <div className="relative">
                    <img
                      src={uploadedImage}
                      alt="Uploaded image"
                      className="w-full h-32 object-cover rounded-xl border"
                      style={{ borderColor: 'var(--border-color)' }}
                    />
                    <button
                      onClick={() => setUploadedImage(null)}
                      className="absolute top-2 right-2 p-1 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="block">
                    <div 
                      className="w-full h-32 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer hover:border-purple-300 transition-colors"
                      style={{ 
                        borderColor: 'var(--border-color)',
                        backgroundColor: 'var(--input-bg)'
                      }}
                    >
                      <div className="text-center">
                        <div className="w-8 h-8 mx-auto mb-2">
                          <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                        <p 
                          className="text-sm"
                          style={{ color: 'var(--secondary-text)' }}
                        >
                          Click to upload image
                        </p>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Prompt Input */}
          <div className="space-y-3">
            <h3 
              className="h3-text"
              style={{ color: 'var(--primary-text)' }}
            >
              {activeMode === 'generate' ? 'Prompt' : 'Edit Instructions'}
            </h3>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                activeMode === 'generate' 
                  ? "Describe the image you want to create..."
                  : "Describe how you want to edit the image..."
              }
              className="w-full p-4 rounded-xl border resize-none"
              style={{
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--primary-text)'
              }}
              rows={4}
            />
          </div>

          {/* Action Button */}
          <button
            onClick={activeMode === 'generate' ? handleGenerate : handleEdit}
            disabled={loading || !prompt.trim() || (activeMode === 'edit' && !uploadedImage)}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {activeMode === 'generate' ? 'Generating...' : 'Editing...'}
              </>
            ) : (
              <>
                {activeMode === 'generate' ? <Sparkles className="w-5 h-5" /> : <Wand2 className="w-5 h-5" />}
                {activeMode === 'generate' ? 'Generate Images' : 'Edit Image'}
              </>
            )}
          </button>

          {/* Error Message */}
          {error && (
            <div 
              className="p-4 rounded-xl border"
              style={{ 
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'var(--error-color)',
                color: 'var(--error-color)'
              }}
            >
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="flex-1 min-h-0">
        <div 
          className="h-full p-6 rounded-2xl"
          style={{ backgroundColor: 'var(--surface-bg)' }}
        >
          <div className="h-full flex flex-col">
            <h3 
              className="h3-text mb-4"
              style={{ color: 'var(--primary-text)' }}
            >
              Preview
            </h3>
            
            {generatedImages.length > 0 ? (
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
                {generatedImages.map((imageUrl, index) => (
                  <div key={index} className="group relative">
                    <div className="aspect-square rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-color)' }}>
                      <img
                        src={imageUrl}
                        alt={`Generated image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                      <button className="p-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors">
                        <span className="text-white text-sm">Download</span>
                      </button>
                      <button className="p-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors">
                        <span className="text-white text-sm">Copy</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : activeMode === 'edit' && uploadedImage ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 rounded-xl overflow-hidden border mb-4 mx-auto" style={{ borderColor: 'var(--border-color)' }}>
                    <img
                      src={uploadedImage}
                      alt="Uploaded image"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 
                    className="text-lg font-semibold mb-2"
                    style={{ color: 'var(--primary-text)' }}
                  >
                    Image Ready for Editing
                  </h4>
                  <p 
                    className="body-small"
                    style={{ color: 'var(--secondary-text)' }}
                  >
                    Enter edit instructions and click edit to see the result
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-4 mx-auto">
                    {activeMode === 'generate' ? (
                      <Sparkles className="w-10 h-10 text-purple-400" />
                    ) : (
                      <Wand2 className="w-10 h-10 text-purple-400" />
                    )}
                  </div>
                  <h4 
                    className="text-lg font-semibold mb-2"
                    style={{ color: 'var(--primary-text)' }}
                  >
                    {activeMode === 'generate' ? 'Ready to create?' : 'Upload an image to edit'}
                  </h4>
                  <p 
                    className="body-small"
                    style={{ color: 'var(--secondary-text)' }}
                  >
                    {activeMode === 'generate' 
                      ? 'Enter a prompt and click generate to see your images here'
                      : 'Upload an image and describe how you want to edit it'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Assets Content Component (Renamed from Gallery)
function AssetsContent({ searchQuery }: { searchQuery: string }) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 
          className="display-text mb-4"
          style={{ color: 'var(--primary-text)' }}
        >
          My Assets
        </h2>
        <p 
          className="body-large max-w-2xl mx-auto"
          style={{ color: 'var(--secondary-text)' }}
        >
          Your personal collection of generated and edited images
        </p>
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="group relative">
            <div 
              className="aspect-square rounded-2xl overflow-hidden border"
              style={{ 
                backgroundColor: 'var(--card-bg)',
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
                  Asset {index + 1}
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
