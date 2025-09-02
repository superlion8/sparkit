'use client';

import { useState } from 'react';
import { ImageGenerator } from '@/components/ImageGenerator';
import { ImageEditor } from '@/components/ImageEditor';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'generate' | 'edit'>('generate');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🍌 Sparkit
          </h1>
          <p className="text-xl text-gray-600">
            AI-Powered Image Generation & Editing Tool
          </p>
        </header>

        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-lg p-1 shadow-md">
              <button
                onClick={() => setActiveTab('generate')}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  activeTab === 'generate'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:text-purple-600'
                }`}
              >
                Generate Image
              </button>
              <button
                onClick={() => setActiveTab('edit')}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  activeTab === 'edit'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:text-purple-600'
                }`}
              >
                Edit Image
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            {activeTab === 'generate' ? (
              <ImageGenerator />
            ) : (
              <ImageEditor />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}