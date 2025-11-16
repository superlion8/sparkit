"use client";

import { useState } from "react";
import ImageUpload from "@/components/ImageUpload";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { logTaskEvent, generateClientTaskId } from "@/lib/clientTasks";
import { Settings, Download, Sparkles } from "lucide-react";
import { downloadImage } from "@/lib/downloadUtils";

interface CaptionPrompt {
  scene: string;
  subject_desc: {
    gender_presentation: string;
    age_bracket: string;
    ethnicity: string;
    build: string;
    skin_tone: string;
    hair: {
      length: string;
      style: string;
      color: string;
    };
  };
  subject_pose: string;
  subject_wardrobe: {
    top: string;
    bottom: string;
    socks: string;
    accessories: Record<string, any>;
  };
  environment: {
    description: string;
    objects: string[];
    lighting: {
      source: string;
      quality: string;
      white_balance_K: string;
    };
  };
  camera: {
    mode: string;
    focal_length_eq_mm: string;
    exposure: {
      aperture_f: string;
      iso: string;
      shutter_s: string;
      ev_comp: string;
    };
    focus: string;
    depth_of_field: string;
    framing: {
      aspect_ratio: string;
      crop: string;
      angle: string;
      composition_notes: string;
    };
  };
}

interface CharacterPrompt {
  subject_desc: {
    gender_presentation: string;
    age_bracket: string;
    ethnicity: string;
    build: string;
    skin_tone: string;
    hair: {
      length: string;
      style: string;
      color: string;
    };
  };
}

export default function ControlPanelPage() {
  const { accessToken, isAuthenticated, loading: authLoading, promptLogin } = useAuth();
  
  // Images
  const [referenceImage, setReferenceImage] = useState<File[]>([]);
  const [characterImage, setCharacterImage] = useState<File[]>([]);
  
  // Block 1: Reverse Caption
  const [reverseCaptionLoading, setReverseCaptionLoading] = useState(false);
  const [captionPrompt, setCaptionPrompt] = useState<CaptionPrompt | null>(null);
  const [captionFields, setCaptionFields] = useState({
    scene: "",
    subject_pose: "",
    subject_wardrobe: "",
    environment: "",
    camera: "",
  });
  
  // Block 2: Reverse Character
  const [reverseCharacterLoading, setReverseCharacterLoading] = useState(false);
  const [characterPrompt, setCharacterPrompt] = useState<CharacterPrompt | null>(null);
  const [characterDesc, setCharacterDesc] = useState("");
  
  // Block 3: Control Dimensions
  const [controlDimensions, setControlDimensions] = useState({
    pose: "keep", // "keep" or "adjust"
    wardrobe: "keep",
    environment: "keep",
    camera: "keep",
  });
  const [finalPromptJson, setFinalPromptJson] = useState<string>("");
  const [finalPromptData, setFinalPromptData] = useState<any>(null);
  
  // Generate
  const [generating, setGenerating] = useState(false);
  const [finalImage, setFinalImage] = useState<string>("");
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState<any>(null);

  // Block 1: Reverse Caption
  const handleReverseCaption = async () => {
    if (referenceImage.length === 0) {
      setError("请上传参考图");
      return;
    }

    if (!isAuthenticated || !accessToken) {
      setError("登录后才能使用此功能");
      promptLogin();
      return;
    }

    setReverseCaptionLoading(true);
    setError("");
    setErrorDetails(null);

    try {
      const formData = new FormData();
      formData.append("referenceImage", referenceImage[0]);

      const response = await fetch("/api/generate/control-panel/reverse-caption", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "反推失败");
      }

      const data = await response.json();
      setCaptionPrompt(data.captionPrompt);
      
      // Parse and set fields for display
      const cp = data.captionPrompt;
      setCaptionFields({
        scene: cp.scene || "",
        subject_pose: cp.subject_pose || "",
        subject_wardrobe: JSON.stringify(cp.subject_wardrobe || {}, null, 2),
        environment: JSON.stringify(cp.environment || {}, null, 2),
        camera: JSON.stringify(cp.camera || {}, null, 2),
      });
    } catch (err: any) {
      setError(err.message || "反推失败");
      setErrorDetails(err);
    } finally {
      setReverseCaptionLoading(false);
    }
  };

  // Block 2: Reverse Character
  const handleReverseCharacter = async () => {
    if (characterImage.length === 0) {
      setError("请上传角色图");
      return;
    }

    if (!isAuthenticated || !accessToken) {
      setError("登录后才能使用此功能");
      promptLogin();
      return;
    }

    setReverseCharacterLoading(true);
    setError("");
    setErrorDetails(null);

    try {
      const formData = new FormData();
      formData.append("characterImage", characterImage[0]);

      const response = await fetch("/api/generate/control-panel/reverse-character", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "反推失败");
      }

      const data = await response.json();
      setCharacterPrompt(data.characterPrompt);
      setCharacterDesc(JSON.stringify(data.characterPrompt.subject_desc || {}, null, 2));
    } catch (err: any) {
      setError(err.message || "反推失败");
      setErrorDetails(err);
    } finally {
      setReverseCharacterLoading(false);
    }
  };

  // Block 3: Generate Prompt
  const handleGeneratePrompt = () => {
    if (!captionPrompt || !characterPrompt) {
      setError("请先完成参考图和角色图的反推");
      return;
    }

    // Build final prompt based on control dimensions
    const finalData: any = {
      scene: captionPrompt.scene,
      subject_desc: characterPrompt.subject_desc, // Always use character description
      subject_pose: controlDimensions.pose === "keep" 
        ? captionPrompt.subject_pose 
        : captionPrompt.subject_pose + " (slightly adjusted)",
      subject_wardrobe: controlDimensions.wardrobe === "keep"
        ? captionPrompt.subject_wardrobe
        : { ...captionPrompt.subject_wardrobe, adjusted: true },
      environment: controlDimensions.environment === "keep"
        ? captionPrompt.environment
        : { ...captionPrompt.environment, adjusted: true },
      camera: controlDimensions.camera === "keep"
        ? captionPrompt.camera
        : { ...captionPrompt.camera, adjusted: true },
    };

    setFinalPromptData(finalData);
    setFinalPromptJson(JSON.stringify(finalData, null, 2));
  };

  // Generate Final Image
  const handleGenerate = async () => {
    if (!characterImage.length) {
      setError("请上传角色图");
      return;
    }

    if (!finalPromptData) {
      setError("请先生成最终 prompt");
      return;
    }

    if (!isAuthenticated || !accessToken) {
      setError("登录后才能使用此功能");
      promptLogin();
      return;
    }

    setGenerating(true);
    setError("");
    setErrorDetails(null);

    try {
      const formData = new FormData();
      formData.append("characterImage", characterImage[0]);
      formData.append("finalPromptJson", JSON.stringify(finalPromptData));

      const response = await fetch("/api/generate/control-panel/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "生成失败");
      }

      const data = await response.json();
      setFinalImage(data.finalImageUrl || data.finalImageBase64);

      // Log task event
      if (accessToken && data.finalImageUrl) {
        const taskId = generateClientTaskId("control-panel");
        await logTaskEvent(accessToken, {
          taskId,
          taskType: "control-panel",
          prompt: finalPromptJson,
          inputImageUrl: data.characterImageUrl || "",
          outputImageUrl: data.finalImageUrl || "",
        });
      }
    } catch (err: any) {
      setError(err.message || "生成失败");
      setErrorDetails(err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary-600" />
          Control Panel
        </h1>
        <p className="text-gray-600 mt-2">
          强大的控制面板，精确控制图像生成的各个维度
        </p>
        {!authLoading && !isAuthenticated && (
          <div className="mt-4 rounded-lg border border-dashed border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700">
            登录后才能使用 Control Panel 功能
          </div>
        )}
      </div>

      <div className="space-y-8">
        {/* Block 1: Reverse Caption */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">1. 反推参考图</h2>
          <div className="space-y-4">
            <ImageUpload
              maxImages={1}
              onImagesChange={setReferenceImage}
              label="上传参考图"
            />
            <button
              onClick={handleReverseCaption}
              disabled={reverseCaptionLoading || referenceImage.length === 0}
              className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {reverseCaptionLoading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  反推中...
                </>
              ) : (
                "反推"
              )}
            </button>
            
            {captionPrompt && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">场景</label>
                  <textarea
                    value={captionFields.scene}
                    onChange={(e) => setCaptionFields({ ...captionFields, scene: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">人物动作</label>
                  <textarea
                    value={captionFields.subject_pose}
                    onChange={(e) => setCaptionFields({ ...captionFields, subject_pose: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">人物着装</label>
                  <textarea
                    value={captionFields.subject_wardrobe}
                    onChange={(e) => setCaptionFields({ ...captionFields, subject_wardrobe: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-mono"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">环境</label>
                  <textarea
                    value={captionFields.environment}
                    onChange={(e) => setCaptionFields({ ...captionFields, environment: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-mono"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">镜头</label>
                  <textarea
                    value={captionFields.camera}
                    onChange={(e) => setCaptionFields({ ...captionFields, camera: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-mono"
                    rows={4}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Block 2: Reverse Character */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">2. 反推角色描述</h2>
          <div className="space-y-4">
            <ImageUpload
              maxImages={1}
              onImagesChange={setCharacterImage}
              label="上传角色图"
            />
            <button
              onClick={handleReverseCharacter}
              disabled={reverseCharacterLoading || characterImage.length === 0}
              className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {reverseCharacterLoading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  反推中...
                </>
              ) : (
                "反推"
              )}
            </button>
            
            {characterPrompt && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">角色描述</label>
                <textarea
                  value={characterDesc}
                  onChange={(e) => setCharacterDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-mono"
                  rows={6}
                />
              </div>
            )}
          </div>
        </div>

        {/* Block 3: Control Dimensions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">3. 控制维度</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">动作</label>
                <select
                  value={controlDimensions.pose}
                  onChange={(e) => setControlDimensions({ ...controlDimensions, pose: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="keep">保持</option>
                  <option value="adjust">微调</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">着装</label>
                <select
                  value={controlDimensions.wardrobe}
                  onChange={(e) => setControlDimensions({ ...controlDimensions, wardrobe: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="keep">保持</option>
                  <option value="adjust">微调</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">环境</label>
                <select
                  value={controlDimensions.environment}
                  onChange={(e) => setControlDimensions({ ...controlDimensions, environment: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="keep">保持</option>
                  <option value="adjust">微调</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">镜头</label>
                <select
                  value={controlDimensions.camera}
                  onChange={(e) => setControlDimensions({ ...controlDimensions, camera: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="keep">保持</option>
                  <option value="adjust">微调</option>
                </select>
              </div>
            </div>
            
            <button
              onClick={handleGeneratePrompt}
              disabled={!captionPrompt || !characterPrompt}
              className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              生成 Prompt
            </button>
            
            {finalPromptJson && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">最终 Prompt (可编辑)</label>
                <textarea
                  value={finalPromptJson}
                  onChange={(e) => {
                    setFinalPromptJson(e.target.value);
                    try {
                      setFinalPromptData(JSON.parse(e.target.value));
                    } catch (err) {
                      // Invalid JSON, ignore
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-mono"
                  rows={12}
                />
              </div>
            )}
          </div>
        </div>

        {/* Generate Button */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <button
            onClick={handleGenerate}
            disabled={generating || !finalPromptData || characterImage.length === 0}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <Sparkles className="w-5 h-5 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Settings className="w-5 h-5" />
                生成图片
              </>
            )}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-red-900 mb-2">错误</h3>
                <p className="text-red-700 text-sm mb-3 break-words">{error}</p>
                {errorDetails && (
                  <div className="mt-3">
                    <div className="text-xs font-medium text-red-700 mb-2">详情：</div>
                    <div className="mt-2 p-3 bg-red-100 rounded text-red-900 overflow-x-auto max-h-64 overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap break-words">
                        {JSON.stringify(errorDetails, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Result Display */}
        {finalImage && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">生成结果</h2>
            <div className="relative bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={finalImage}
                alt="Generated"
                className="w-full h-auto object-contain"
              />
              <button
                onClick={() => downloadImage(finalImage, "control-panel-result.png")}
                className="absolute top-2 right-2 bg-primary-600 text-white px-3 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                下载
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

