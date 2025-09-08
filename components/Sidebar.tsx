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
  Grid3X3,
  MessageSquare,
  CheckSquare,
  CreditCard
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ activeTab, onTabChange, isCollapsed, onToggleCollapse }: SidebarProps) {
  const [isDarkMode, setIsDarkMode] = useState(true);

  const mainTabs = [
    { id: 'explore', label: 'Explore', icon: Home, description: 'Browse creations' },
    { id: 'generate', label: 'Create', icon: Sparkles, description: 'Generate images' },
    { id: 'edit', label: 'Edit', icon: Wand2, description: 'Edit images' },
    { id: 'gallery', label: 'Gallery', icon: ImageIcon, description: 'My creations' },
    { id: 'moodboards', label: 'Moodboards', icon: Grid3X3, description: 'Collections', isNew: true },
    { id: 'organize', label: 'Organize', icon: Grid3X3, description: 'Manage files' },
    { id: 'chat', label: 'Chat', icon: MessageSquare, description: 'AI Assistant' },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, description: 'Job queue' },
  ];

  const accountTabs = [
    { id: 'subscribe', label: 'Subscribe', icon: CreditCard, description: 'Upgrade plan' },
  ];

  const bottomTabs = [
    { id: 'help', label: 'Help', icon: HelpCircle, description: 'Support' },
    { id: 'updates', label: 'Updates', icon: Bell, description: 'What\'s new' },
  ];

  const TabItem = ({ tab, isActive, onClick }: { tab: any, isActive: boolean, onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
        isActive
          ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-white border border-purple-500/30'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <div className={`p-1.5 rounded-lg transition-colors ${
        isActive 
          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
          : 'bg-white/10 group-hover:bg-white/20'
      }`}>
        <tab.icon className="w-4 h-4" />
      </div>
      {!isCollapsed && (
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="font-medium">{tab.label}</span>
            {tab.isNew && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full">
                New!
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">{tab.description}</p>
        </div>
      )}
    </button>
  );

  return (
    <div className={`bg-black/40 backdrop-blur-xl border-r border-white/10 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-72'
    } h-screen flex flex-col fixed lg:relative z-50 lg:z-auto`}>
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Sparkit</h1>
                <p className="text-xs text-gray-400">AI Image Studio</p>
              </div>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {isCollapsed ? <Menu className="w-5 h-5 text-gray-400" /> : <X className="w-5 h-5 text-gray-400" />}
          </button>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 p-4 space-y-2 overflow-y-auto">
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
        <div className="pt-4 border-t border-white/10">
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
      <div className="p-4 border-t border-white/10 space-y-2">
        {bottomTabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
          />
        ))}

        {/* Theme Toggle */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
        >
          <div className="p-1.5 rounded-lg bg-white/10">
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </div>
          {!isCollapsed && (
            <span className="font-medium">
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </span>
          )}
        </button>

        {/* User Account */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer">
          <div className="p-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600">
            <User className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">My Account</span>
                <span className="text-xs">•••</span>
              </div>
              <p className="text-xs text-gray-500">Free Plan</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
