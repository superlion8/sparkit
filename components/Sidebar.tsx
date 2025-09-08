'use client';

import { useState } from 'react';
import { 
  Home, 
  Sparkles, 
  Wand2, 
  ImageIcon, 
  Settings, 
  User, 
  HelpCircle, 
  Bell, 
  Sun, 
  Moon,
  Menu,
  X,
  Plus,
  Grid,
  MessageSquare,
  CheckSquare,
  CreditCard
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isDarkMode: boolean;
  onThemeChange: (isDark: boolean) => void;
}

export function Sidebar({ activeTab, onTabChange, isCollapsed, onToggleCollapse, isDarkMode, onThemeChange }: SidebarProps) {

  const mainTabs = [
    { id: 'explore', label: 'Explore', icon: Home, description: 'Browse creations' },
    { id: 'generate', label: 'Create', icon: Sparkles, description: 'Generate images' },
    { id: 'edit', label: 'Edit', icon: Wand2, description: 'Edit images' },
    { id: 'gallery', label: 'Gallery', icon: ImageIcon, description: 'My creations' },
    { id: 'moodboards', label: 'Moodboards', icon: Grid, description: 'Collections', isNew: true },
    { id: 'chat', label: 'Chat', icon: MessageSquare, description: 'AI Assistant' },
  ];

  const accountTabs = [
    { id: 'subscribe', label: 'Subscribe', icon: CreditCard, description: 'Upgrade plan' },
    { id: 'help', label: 'Help', icon: HelpCircle, description: 'Support' },
    { id: 'updates', label: 'Updates', icon: Bell, description: 'What\'s new' },
  ];

  const TabItem = ({ tab, isActive, onClick }: { tab: any, isActive: boolean, onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 group ${
        isActive
          ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-white border border-purple-500/30'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
      style={{
        color: isActive ? 'var(--primary-text)' : 'var(--secondary-text)',
        backgroundColor: isActive ? 'rgba(124, 58, 237, 0.1)' : 'transparent',
        borderColor: isActive ? 'rgba(124, 58, 237, 0.3)' : 'transparent'
      }}
    >
      <div 
        className={`p-1 rounded-md transition-colors ${
          isActive 
            ? 'text-white' 
            : 'group-hover:bg-white/20'
        }`}
        style={{
          background: isActive ? 'var(--gradient-primary)' : 'rgba(255, 255, 255, 0.1)'
        }}
      >
        <tab.icon className="w-3.5 h-3.5" />
      </div>
      {!isCollapsed && (
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium truncate">{tab.label}</span>
            {tab.isNew && (
              <span 
                className="px-1.5 py-0.5 text-xs font-semibold text-white rounded-full flex-shrink-0"
                style={{ backgroundColor: 'var(--accent-color)' }}
              >
                New!
              </span>
            )}
          </div>
          <p 
            className="text-xs truncate"
            style={{ color: 'var(--secondary-text)' }}
          >
            {tab.description}
          </p>
        </div>
      )}
    </button>
  );

  return (
    <div 
      className="backdrop-blur-xl border-r transition-all duration-300 h-screen flex flex-col fixed lg:relative z-50 lg:z-auto"
      style={{
        width: isCollapsed ? '3.5rem' : '16rem',
        backgroundColor: 'var(--surface-bg)',
        borderColor: 'var(--border-color)',
        opacity: 0.95
      }}
    >
      {/* Header */}
      <div 
        className="p-3 border-b"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-center flex-1">
            <img 
              src="/sparkit-logo.png" 
              alt="Sparkit Logo" 
              className={`object-contain transition-all duration-300 ${
                isCollapsed ? 'w-10 h-10' : 'w-16 h-16'
              }`}
            />
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md hover:bg-white/10 transition-colors flex-shrink-0"
            style={{ color: 'var(--secondary-text)' }}
          >
            {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="space-y-1">
          {mainTabs.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
            />
          ))}
        </div>

        {/* Account Section */}
        <div 
          className="pt-3 border-t"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="space-y-1">
            {accountTabs.map((tab) => (
              <TabItem
                key={tab.id}
                tab={tab}
                isActive={activeTab === tab.id}
                onClick={() => onTabChange(tab.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div 
        className="p-3 border-t space-y-1"
        style={{ borderColor: 'var(--border-color)' }}
      >
        {/* Theme Toggle */}
        <button
          onClick={() => onThemeChange(!isDarkMode)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-all duration-200"
          style={{ color: 'var(--secondary-text)' }}
        >
          <div 
            className="p-1 rounded-md"
            style={{ backgroundColor: 'var(--surface-bg)' }}
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </div>
          {!isCollapsed && (
            <span className="text-sm font-medium">
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </span>
          )}
        </button>

        {/* User Account */}
        <div 
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-all duration-200 cursor-pointer"
          style={{ color: 'var(--secondary-text)' }}
        >
          <div 
            className="p-1 rounded-md"
            style={{ background: 'var(--gradient-primary)' }}
          >
            <User className="w-3.5 h-3.5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span 
                  className="text-sm font-medium truncate"
                  style={{ color: 'var(--primary-text)' }}
                >
                  My Account
                </span>
                <span 
                  className="text-xs"
                  style={{ color: 'var(--secondary-text)' }}
                >
                  •••
                </span>
              </div>
              <p 
                className="text-xs truncate"
                style={{ color: 'var(--secondary-text)' }}
              >
                Free Plan
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
