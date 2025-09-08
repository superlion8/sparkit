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
          ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-white border border-purple-500/30'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <div className={`p-1 rounded-md transition-colors ${
        isActive 
          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
          : 'bg-white/10 group-hover:bg-white/20'
      }`}>
        <tab.icon className="w-3.5 h-3.5" />
      </div>
      {!isCollapsed && (
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium truncate">{tab.label}</span>
            {tab.isNew && (
              <span className="px-1.5 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full flex-shrink-0">
                New!
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">{tab.description}</p>
        </div>
      )}
    </button>
  );

  return (
    <div className={`${isDarkMode ? 'bg-black/40' : 'bg-white/40'} backdrop-blur-xl border-r ${isDarkMode ? 'border-white/10' : 'border-gray-200'} transition-all duration-300 ${
      isCollapsed ? 'w-14' : 'w-64'
    } h-screen flex flex-col fixed lg:relative z-50 lg:z-auto`}>
      {/* Header */}
      <div className="p-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Sparkit</h1>
                <p className="text-xs text-gray-400">AI Studio</p>
              </div>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
          >
            {isCollapsed ? <Menu className="w-4 h-4 text-gray-400" /> : <X className="w-4 h-4 text-gray-400" />}
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
        <div className="pt-3 border-t border-white/10">
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
      <div className="p-3 border-t border-white/10 space-y-1">
        {/* Theme Toggle */}
        <button
          onClick={() => onThemeChange(!isDarkMode)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
        >
          <div className="p-1 rounded-md bg-white/10">
            {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </div>
          {!isCollapsed && (
            <span className="text-sm font-medium">
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </span>
          )}
        </button>

        {/* User Account */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer">
          <div className="p-1 rounded-md bg-gradient-to-r from-purple-600 to-blue-600">
            <User className="w-3.5 h-3.5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">My Account</span>
                <span className="text-xs">•••</span>
              </div>
              <p className="text-xs text-gray-500 truncate">Free Plan</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
