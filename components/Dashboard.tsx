'use client';

import React from 'react';
import { Image, Zap, Edit3, Star, TrendingUp, Clock, Download } from 'lucide-react';

const Dashboard: React.FC = () => {
  const stats = [
    { label: 'Images Generated', value: '1,247', icon: Image, change: '+12%', color: 'text-blue-600' },
    { label: 'AI Generations', value: '3,891', icon: Zap, change: '+8%', color: 'text-purple-600' },
    { label: 'Images Edited', value: '892', icon: Edit3, change: '+15%', color: 'text-green-600' },
    { label: 'Favorites', value: '156', icon: Star, change: '+23%', color: 'text-yellow-600' }
  ];

  const recentActivity = [
    { id: 1, type: 'generate', title: 'Dragon in futuristic city', time: '2 minutes ago', image: 'https://via.placeholder.com/64x64/6366f1/ffffff?text=D' },
    { id: 2, type: 'edit', title: 'Portrait enhancement', time: '15 minutes ago', image: 'https://via.placeholder.com/64x64/8b5cf6/ffffff?text=P' },
    { id: 3, type: 'generate', title: 'Abstract digital art', time: '1 hour ago', image: 'https://via.placeholder.com/64x64/ec4899/ffffff?text=A' },
    { id: 4, type: 'edit', title: 'Background removal', time: '2 hours ago', image: 'https://via.placeholder.com/64x64/10b981/ffffff?text=B' }
  ];

  const quickActions = [
    { title: 'Generate New Image', description: 'Create stunning images with AI', icon: Zap, color: 'bg-purple-500' },
    { title: 'Edit Existing Image', description: 'Upload and enhance your photos', icon: Edit3, color: 'bg-blue-500' },
    { title: 'View Gallery', description: 'Browse all your creations', icon: Image, color: 'bg-green-500' },
    { title: 'Batch Processing', description: 'Process multiple images at once', icon: TrendingUp, color: 'bg-orange-500' }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome back! 👋</h1>
        <p className="text-purple-100">Ready to create something amazing? Let's generate some stunning images with AI.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color.replace('text-', 'bg-').replace('-600', '-100')}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-sm font-medium ${stat.color}`}>{stat.change}</span>
                <span className="text-sm text-gray-500 ml-1">from last month</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">View all</button>
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-lg overflow-hidden">
                  <img src={activity.image} alt={activity.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      activity.type === 'generate' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {activity.type === 'generate' ? 'Generated' : 'Edited'}
                    </span>
                    <span className="text-xs text-gray-500">{activity.time}</span>
                  </div>
                </div>
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  className="p-4 text-left border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-md transition-all group"
                >
                  <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">{action.title}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Trending Styles */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Trending Art Styles</h2>
          <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">Explore all</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { name: 'Realistic', emoji: '🎨', count: '2.3k' },
            { name: 'Anime', emoji: '🌸', count: '1.8k' },
            { name: 'Cyberpunk', emoji: '🤖', count: '1.5k' },
            { name: 'Fantasy', emoji: '🧙‍♂️', count: '1.2k' },
            { name: 'Oil Painting', emoji: '🖼️', count: '980' },
            { name: 'Watercolor', emoji: '🎨', count: '756' }
          ].map((style, index) => (
            <button
              key={index}
              className="p-4 text-center border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors group"
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{style.emoji}</div>
              <div className="font-medium text-gray-900 text-sm">{style.name}</div>
              <div className="text-xs text-gray-500 mt-1">{style.count} uses</div>
            </button>
          ))}
        </div>
      </div>

      {/* Tips & Tricks */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">💡 Pro Tips</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">1</span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Use specific details</h3>
              <p className="text-sm text-gray-600">Include lighting, style, and composition details for better results</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">2</span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Try different styles</h3>
              <p className="text-sm text-gray-600">Experiment with various art styles to find your perfect match</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
