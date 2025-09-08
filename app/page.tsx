'use client';

import { useState } from 'react';
import { ImageGenerator } from '../components/ImageGenerator';
import { ImageEditor } from '../components/ImageEditor';
import { Sparkles, Wand2, Palette, Zap } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'generate' | 'edit'>('generate');

  return (
    <div className="min-h-screen animated-bg relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl float" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl float" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-16">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-6xl font-bold gradient-text">
              Sparkit
            </h1>
          </div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Transform your imagination into stunning visuals with AI-powered image generation and editing
          </p>
          
          {/* Feature highlights */}
          <div className="flex flex-wrap justify-center gap-6 mt-8">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full glass">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-gray-300">Lightning Fast</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full glass">
              <Palette className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-300">High Quality</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full glass">
              <Wand2 className="w-4 h-4 text-pink-400" />
              <span className="text-sm text-gray-300">AI Powered</span>
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto">
          {/* Tab Navigation */}
          <div className="flex justify-center mb-12">
            <div className="glass rounded-2xl p-2 shadow-2xl">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('generate')}
                  className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center gap-3 ${
                    activeTab === 'generate'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Sparkles className="w-5 h-5" />
                  Generate
                </button>
                <button
                  onClick={() => setActiveTab('edit')}
                  className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center gap-3 ${
                    activeTab === 'edit'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Wand2 className="w-5 h-5" />
                  Edit
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="glass rounded-3xl shadow-2xl p-8 border border-white/10">
            {activeTab === 'generate' ? (
              <ImageGenerator />
            ) : (
              <ImageEditor />
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-16 text-gray-400">
          <p className="text-sm">
            Powered by Google Gemini AI • Built with Next.js & Tailwind CSS
          </p>
        </footer>
      </div>
    </div>
  );
}