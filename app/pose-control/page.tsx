'use client';

import { useState, useRef } from 'react';
import ImageUpload from '@/components/ImageUpload';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Download, Sparkles, Wand2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | 'default';

export default function PoseControlPage() {
  const { accessToken, isAuthenticated, promptLogin } = useAuth();
  
  // Input states
  const [charImages, setCharImages] = useState<File[]>([]);
  const [poseImages, setPoseImages] = useState<File[]>([]);
  const [numImages, setNumImages] = useState<number>(1);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('default');
  
  // Reverse pose states
  const [poseCaption, setPoseCaption] = useState<string>('');
  const [finalPrompt, setFinalPrompt] = useState<string>('');
  const [isReversing, setIsReversing] = useState(false);
  const [reverseError, setReverseError] = useState<string | null>(null);
  
  // Generate states
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Debounce
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleReverseCaption = async () => {
    if (!isAuthenticated) {
      promptLogin();
      return;
    }

    if (poseImages.length === 0) {
      setReverseError('请上传 Pose 图');
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsReversing(true);
    setReverseError(null);
    setPoseCaption('');
    setFinalPrompt('');

    try {
      const formData = new FormData();
      formData.append('poseImage', poseImages[0]);

      const response = await fetch('/api/generate/pose-control/reverse-pose', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '反推失败');
      }

      const caption = data.poseCaption;
      setPoseCaption(caption);

      // Build final prompt
      const prompt = `Make the person in character image take the pose from the pose image. Keep the point of camera view of image 1 and remain the people face same direction. Refine the details to make the image reasonable while necessary.

${caption}`;
      
      setFinalPrompt(prompt);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Reverse request cancelled');
        return;
      }
      console.error('Reverse error:', err);
      setReverseError(err.message || '反推失败，请重试');
    } finally {
      setIsReversing(false);
    }
  };

  const handleGenerate = async () => {
    if (!isAuthenticated) {
      promptLogin();
      return;
    }

    if (charImages.length === 0) {
      setError('请上传角色图');
      return;
    }

    if (!finalPrompt.trim()) {
      setError('请先进行 Pose 反推');
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsGenerating(true);
    setError(null);
    setGeneratedImages([]);

    try {
      const formData = new FormData();
      formData.append('charImage', charImages[0]);
      formData.append('finalPrompt', finalPrompt);
      formData.append('numImages', numImages.toString());
      formData.append('aspectRatio', aspectRatio);

      console.log('Generating images...');
      const startTime = Date.now();

      const response = await fetch('/api/generate/pose-control/generate', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json();
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      if (!response.ok) {
        throw new Error(data.error || '生成失败');
      }

      console.log(`Generation completed in ${duration}s`);
      setGeneratedImages(data.images || []);

      // Log task to history
      if (accessToken && data.inputImageUrl && data.outputImageUrls) {
        try {
          const outputImageUrl = data.outputImageUrls.length > 0 
            ? JSON.stringify(data.outputImageUrls)
            : null;
          
          await fetch('/api/tasks/log', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              task_id: `pose-control-${Date.now()}`,
              task_type: 'pose_control',
              input_image_url: data.inputImageUrl,
              output_image_url: outputImageUrl,
              prompt: finalPrompt,
              task_time: new Date().toISOString(),
            }),
          });
        } catch (logError) {
          console.error('Failed to log task:', logError);
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Generate request cancelled');
        return;
      }
      console.error('Generation error:', err);
      setError(err.message || '生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    generatedImages.forEach((img, index) => {
      setTimeout(() => {
        downloadImage(img, `pose-control-${index + 1}.png`);
      }, index * 200);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Wand2 className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Pose Control
            </h1>
          </div>
          <p className="text-gray-600">
            上传角色图和 Pose 图，让角色模仿 Pose 图中的姿势和拍摄角度
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Image Upload */}
          <div className="space-y-6">
            {/* Character Image Upload */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">
                1. 上传角色图
              </h2>
              <ImageUpload
                maxImages={1}
                onImagesChange={setCharImages}
                label="上传角色图"
              />
            </div>

            {/* Pose Image Upload */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">
                2. 上传 Pose 图
              </h2>
              <ImageUpload
                maxImages={1}
                onImagesChange={setPoseImages}
                label="上传 Pose 图"
              />
            </div>
          </div>

          {/* Right: Reverse, Edit & Generate */}
          <div className="space-y-6">
            {/* Reverse Pose, Edit Prompt & Generate Settings (Combined) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">
                3. 反推、编辑并生成
              </h2>
              
              {/* Reverse Button */}
              <button
                onClick={handleReverseCaption}
                disabled={isReversing || poseImages.length === 0}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
              >
                {isReversing ? (
                  <>
                    <LoadingSpinner />
                    <span>反推中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>反推 Pose 描述</span>
                  </>
                )}
              </button>
              {reverseError && (
                <p className="mb-4 text-sm text-red-600">{reverseError}</p>
              )}

              {/* Final Prompt Editor */}
              {finalPrompt && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      生成提示词（可编辑）
                    </label>
                    <textarea
                      value={finalPrompt}
                      onChange={(e) => setFinalPrompt(e.target.value)}
                      className="w-full h-48 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      placeholder="生成的提示词将在这里显示..."
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      提示：您可以修改上面的提示词以调整生成效果
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200 my-4"></div>

                  {/* Generation Settings */}
                  <h3 className="text-base font-semibold mb-3 text-gray-800">生成设置</h3>
                  
                  {/* Number of Images */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      生成数量
                    </label>
                    <select
                      value={numImages}
                      onChange={(e) => setNumImages(parseInt(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value={1}>1 张</option>
                      <option value={2}>2 张</option>
                      <option value={3}>3 张</option>
                      <option value={4}>4 张</option>
                    </select>
                  </div>

                  {/* Aspect Ratio */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      宽高比
                    </label>
                    <select
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="default">默认（由模型决定）</option>
                      <option value="1:1">1:1 (正方形)</option>
                      <option value="16:9">16:9 (横向)</option>
                      <option value="9:16">9:16 (纵向)</option>
                      <option value="4:3">4:3 (横向)</option>
                      <option value="3:4">3:4 (纵向)</option>
                    </select>
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || charImages.length === 0 || !finalPrompt.trim()}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>{isGenerating ? '生成中...' : '开始生成'}</span>
                  </button>
                  {error && (
                    <p className="mt-2 text-sm text-red-600">{error}</p>
                  )}
                </>
              )}
            </div>

            {finalPrompt && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">4. 生成结果</h2>
                {generatedImages.length > 1 && (
                  <button
                    onClick={handleDownloadAll}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    下载全部 ({generatedImages.length}张)
                  </button>
                )}
              </div>

              {isGenerating ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <LoadingSpinner />
                  <p className="mt-4 text-gray-600">
                    正在生成 {numImages} 张图片...
                  </p>
                </div>
              ) : generatedImages.length > 0 ? (
                <div className={`grid gap-4 ${
                  generatedImages.length === 1 ? 'grid-cols-1' : 
                  generatedImages.length === 2 ? 'grid-cols-2' : 
                  'grid-cols-2'
                }`}>
                  {generatedImages.map((img, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
                        <img
                          src={img}
                          alt={`Generated ${index + 1}`}
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setPreviewImage(img)}
                        />
                      </div>
                      <button
                        onClick={() => downloadImage(img, `pose-control-${index + 1}.png`)}
                        className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title={`下载图片 ${index + 1}`}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <div className="text-center">
                    <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>生成的图片将在这里显示</p>
                  </div>
                </div>
              )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-7xl max-h-full">
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

