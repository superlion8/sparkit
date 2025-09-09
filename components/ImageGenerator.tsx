'use client';

import { useState } from 'react';
import { Loader2, Download, Sparkles, Wand2, ImageIcon, Copy, Check } from 'lucide-react';
import Image from 'next/image';

export function ImageGenerator() {
  const [prompt, setPrompt] = useState('');
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setLoading(true);
    setError('');
    setGeneratedImages([]);

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, count }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      if (data.generatedImages) {
        setGeneratedImages(data.generatedImages.map((img: any) => {
          // Check if it's already a complete data URL
          if (img.bytesBase64Encoded.startsWith('data:')) {
            return img.bytesBase64Encoded;
          }
          // Check if it's SVG content (starts with '<svg' when decoded)
          try {
            const decoded = atob(img.bytesBase64Encoded);
            if (decoded.trim().startsWith('<svg')) {
              return `data:image/svg+xml;base64,${img.bytesBase64Encoded}`;
            }
          } catch (e) {
            // If decoding fails, assume it's PNG
          }
          return `data:image/png;base64,${img.bytesBase64Encoded}`;
        }));
      }
    } catch (error) {
      console.error('Generation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate image');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (imageUrl: string, index: number) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `sparkit-generated-${index + 1}.png`;
    link.click();
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
  };

  const handleCopyImage = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy image:', error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-gradient-to-r from-purple-600/20 to-blue-600/20">
            <Sparkles className="w-6 h-6 text-purple-400" />
          </div>
          <h2 
            className="text-3xl font-bold"
            style={{ color: 'var(--primary-text)' }}
          >
            Generate Images
          </h2>
        </div>
        <p 
          className="body-large max-w-2xl mx-auto"
          style={{ color: 'var(--secondary-text)' }}
        >
          Describe your vision and let AI bring it to life with stunning visuals
        </p>
      </div>

      <div className="space-y-6">
        {/* Prompt Input */}
        <div className="space-y-3">
          <label 
            className="block text-sm font-semibold"
            style={{ color: 'var(--primary-text)' }}
          >
            Describe your image
          </label>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A majestic mountain landscape at sunset with aurora borealis dancing in the sky..."
              className="w-full p-4 rounded-2xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none backdrop-blur-sm transition-all duration-300"
              style={{
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--border-color)',
                border: '1px solid',
                color: 'var(--primary-text)'
              }}
              rows={4}
            />
            {prompt && (
              <button
                onClick={handleCopyPrompt}
                className="absolute top-3 right-3 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                title="Copy prompt"
              >
                <Copy 
                  className="w-4 h-4" 
                  style={{ color: 'var(--secondary-text)' }}
                />
              </button>
            )}
          </div>
        </div>

        {/* Image Count Selector */}
        <div className="space-y-3">
          <label 
            className="block text-sm font-semibold"
            style={{ color: 'var(--primary-text)' }}
          >
            Number of images
          </label>
          <div className="flex gap-2">
            {[1, 2, 3].map((num) => (
              <button
                key={num}
                onClick={() => setCount(num)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  count === num
                    ? 'btn-primary'
                    : 'btn-secondary'
                }`}
                style={{
                  color: count === num ? 'white' : 'var(--secondary-text)'
                }}
              >
                {num} {num === 1 ? 'image' : 'images'}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="status-error px-4 py-3 rounded-xl backdrop-blur-sm border" style={{ borderColor: 'var(--error-color)' }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--error-color)' }}></div>
              {error}
            </div>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed py-4 px-8 rounded-2xl font-semibold flex items-center justify-center gap-3 disabled:transform-none"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Generating your masterpiece...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              <span>Generate Images</span>
            </>
          )}
        </button>

        {/* Generated Images */}
        {generatedImages.length > 0 && (
          <div 
            className="space-y-6 p-6 rounded-2xl"
            style={{ backgroundColor: 'var(--result-bg)' }}
          >
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--primary-text)' }}>Your Generated Images</h3>
              <p 
                className="body-small"
                style={{ color: 'var(--secondary-text)' }}
              >
                Click to download or copy to clipboard
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {generatedImages.map((imageUrl, index) => (
                <div key={index} className="group relative">
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 p-1">
                    <div className="relative rounded-xl overflow-hidden">
                      <Image
                        src={imageUrl}
                        alt={`Generated image ${index + 1}`}
                        width={400}
                        height={400}
                        className="w-full h-auto rounded-xl transition-transform duration-300 group-hover:scale-105"
                      />
                      
                      {/* Overlay with actions */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                        <button
                          onClick={() => handleDownload(imageUrl, index)}
                          className="p-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors"
                          title="Download image"
                        >
                          <Download 
                            className="w-5 h-5" 
                            style={{ color: 'white' }}
                          />
                        </button>
                        <button
                          onClick={() => handleCopyImage(imageUrl, index)}
                          className="p-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors"
                          title="Copy to clipboard"
                        >
                          {copiedIndex === index ? (
                            <Check className="w-5 h-5 text-green-400" />
                          ) : (
                            <Copy 
                              className="w-5 h-5" 
                              style={{ color: 'white' }}
                            />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Image info */}
                  <div className="mt-3 text-center">
                    <p 
                      className="text-sm"
                      style={{ color: 'var(--secondary-text)' }}
                    >
                      Image {index + 1} of {generatedImages.length}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state when no images */}
        {!loading && generatedImages.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 mb-4">
              <ImageIcon className="w-10 h-10 text-purple-400" />
            </div>
            <h3 
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--primary-text)' }}
            >
              Ready to create?
            </h3>
            <p 
              className="body-small"
              style={{ color: 'var(--disabled-text)' }}
            >
              Enter a detailed prompt above to generate your first image
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
