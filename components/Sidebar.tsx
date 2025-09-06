'use client';

import React, { useState } from 'react';
import { 
  Home, 
  Image, 
  Edit3, 
  Layers, 
  Settings, 
  Download, 
  History,
  Star,
  Zap,
  Palette,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const navigationItems = [
  {
    id: 'home',
    label: 'Home',
    icon: Home,
    description: 'Dashboard overview'
  },
  {
    id: 'generate',
    label: 'Generate',
    icon: Zap,
    description: 'Create new images',
    badge: 'AI'
  },
  {
    id: 'edit',
    label: 'Edit',
    icon: Edit3,
    description: 'Edit existing images'
  },
  {
    id: 'batch',
    label: 'Batch',
    icon: Layers,
    description: 'Process multiple images'
  },
  {
    id: 'gallery',
    label: 'Gallery',
    icon: Image,
    description: 'View all creations'
  },
  {
    id: 'favorites',
    label: 'Favorites',
    icon: Star,
    description: 'Saved images'
  },
  {
    id: 'history',
    label: 'History',
    icon: History,
    description: 'Recent activity'
  },
  {
    id: 'styles',
    label: 'Styles',
    icon: Palette,
    description: 'Art styles & presets'
  }
];

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`bg-gray-900 text-white transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    } h-screen flex flex-col border-r border-gray-700`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Sparkit
              </span>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                isActive 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' 
                  : 'hover:bg-gray-700 text-gray-300 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${
                isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
              }`} />
              {!isCollapsed && (
                <div className="flex-1 text-left">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="px-2 py-0.5 text-xs bg-purple-500 text-white rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 group-hover:text-gray-300">
                    {item.description}
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <button className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white transition-colors">
          <Settings className="w-5 h-5" />
          {!isCollapsed && <span className="font-medium">Settings</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
