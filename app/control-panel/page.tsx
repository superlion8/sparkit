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
  subject_expression: string;
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

// CharacterPrompt now has the same structure as CaptionPrompt
type CharacterPrompt = CaptionPrompt;

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
    subject_desc: "",
    subject_pose: "",
    subject_expression: "",
    subject_wardrobe: "",
    environment: "",
    camera: "",
  });
  
  // Block 2: Reverse Character
  const [reverseCharacterLoading, setReverseCharacterLoading] = useState(false);
  const [characterPrompt, setCharacterPrompt] = useState<CharacterPrompt | null>(null);
  const [characterFields, setCharacterFields] = useState({
    scene: "",
    subject_desc: "",
    subject_pose: "",
    subject_expression: "",
    subject_wardrobe: "",
    environment: "",
    camera: "",
  });
  
  // Block 3: Control Dimensions
  // Each dimension has 3 options: "ref" (按参考图), "char" (按角色图), "adjust" (微调)
  const [controlDimensions, setControlDimensions] = useState({
    pose: "ref", // "ref", "char", or "adjust"
    expression: "ref",
    wardrobe: "ref",
    environment: "ref",
    camera: "ref",
  });
  const [adjustingPrompt, setAdjustingPrompt] = useState(false);
  const [variatePrompt, setVariatePrompt] = useState<CaptionPrompt | null>(null);
  const [variateFields, setVariateFields] = useState({
    scene: "",
    subject_desc: "",
    subject_pose: "",
    subject_expression: "",
    subject_wardrobe: "",
    environment: "",
    camera: "",
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
        subject_desc: JSON.stringify(cp.subject_desc || {}, null, 2),
        subject_pose: cp.subject_pose || "",
        subject_expression: cp.subject_expression || "",
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
      
      // Parse and set fields for display (same as caption)
      const cp = data.characterPrompt;
      setCharacterFields({
        scene: cp.scene || "",
        subject_desc: JSON.stringify(cp.subject_desc || {}, null, 2),
        subject_pose: cp.subject_pose || "",
        subject_expression: cp.subject_expression || "",
        subject_wardrobe: JSON.stringify(cp.subject_wardrobe || {}, null, 2),
        environment: JSON.stringify(cp.environment || {}, null, 2),
        camera: JSON.stringify(cp.camera || {}, null, 2),
      });
    } catch (err: any) {
      setError(err.message || "反推失败");
      setErrorDetails(err);
    } finally {
      setReverseCharacterLoading(false);
    }
  };

  // Block 3: Generate Prompt
  const handleGeneratePrompt = async () => {
    if (!captionPrompt || !characterPrompt) {
      setError("请先完成参考图和角色图的反推");
      return;
    }

    if (!isAuthenticated || !accessToken) {
      setError("登录后才能使用此功能");
      promptLogin();
      return;
    }

    // Reconstruct prompts from edited fields
    let updatedRefPrompt: any = { ...captionPrompt };
    let updatedCharPrompt: any = { ...characterPrompt };
    
    try {
      // Update ref prompt from edited fields
      if (captionFields.scene) updatedRefPrompt.scene = captionFields.scene;
      if (captionFields.subject_desc) {
        updatedRefPrompt.subject_desc = JSON.parse(captionFields.subject_desc);
      }
      if (captionFields.subject_pose) updatedRefPrompt.subject_pose = captionFields.subject_pose;
      if (captionFields.subject_expression) updatedRefPrompt.subject_expression = captionFields.subject_expression;
      if (captionFields.subject_wardrobe) {
        updatedRefPrompt.subject_wardrobe = JSON.parse(captionFields.subject_wardrobe);
      }
      if (captionFields.environment) {
        updatedRefPrompt.environment = JSON.parse(captionFields.environment);
      }
      if (captionFields.camera) {
        updatedRefPrompt.camera = JSON.parse(captionFields.camera);
      }
      
      // Update char prompt from edited fields
      if (characterFields.scene) updatedCharPrompt.scene = characterFields.scene;
      if (characterFields.subject_desc) {
        updatedCharPrompt.subject_desc = JSON.parse(characterFields.subject_desc);
      }
      if (characterFields.subject_pose) updatedCharPrompt.subject_pose = characterFields.subject_pose;
      if (characterFields.subject_expression) updatedCharPrompt.subject_expression = characterFields.subject_expression;
      if (characterFields.subject_wardrobe) {
        updatedCharPrompt.subject_wardrobe = JSON.parse(characterFields.subject_wardrobe);
      }
      if (characterFields.environment) {
        updatedCharPrompt.environment = JSON.parse(characterFields.environment);
      }
      if (characterFields.camera) {
        updatedCharPrompt.camera = JSON.parse(characterFields.camera);
      }
    } catch (e) {
      setError("JSON 格式错误，请检查编辑的字段");
      return;
    }

    // Check if any dimension needs adjustment
    const needsAdjustment = 
      controlDimensions.pose === "adjust" ||
      controlDimensions.expression === "adjust" ||
      controlDimensions.wardrobe === "adjust" ||
      controlDimensions.environment === "adjust" ||
      controlDimensions.camera === "adjust";

    if (needsAdjustment) {
      // Call API to adjust prompt
      setAdjustingPrompt(true);
      setError("");
      setErrorDetails(null);

      try {
        const response = await fetch("/api/generate/control-panel/adjust-prompt", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            refPromptJson: updatedRefPrompt,
            charPromptJson: updatedCharPrompt,
            controlDimensions: controlDimensions,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "微调 prompt 失败");
        }

        const data = await response.json();
        const adjustedPrompt = data.adjustedPrompt;

        // Set variate prompt and fields for display/editing
        setVariatePrompt(adjustedPrompt);
        setVariateFields({
          scene: adjustedPrompt.scene || "",
          subject_desc: JSON.stringify(adjustedPrompt.subject_desc || {}, null, 2),
          subject_pose: adjustedPrompt.subject_pose || "",
          subject_expression: adjustedPrompt.subject_expression || "",
          subject_wardrobe: JSON.stringify(adjustedPrompt.subject_wardrobe || {}, null, 2),
          environment: JSON.stringify(adjustedPrompt.environment || {}, null, 2),
          camera: JSON.stringify(adjustedPrompt.camera || {}, null, 2),
        });

        // Also set final prompt data (will be updated when user edits variateFields)
        setFinalPromptData(adjustedPrompt);
        setFinalPromptJson(JSON.stringify(adjustedPrompt, null, 2));
      } catch (err: any) {
        setError(err.message || "微调 prompt 失败");
        setErrorDetails(err);
      } finally {
        setAdjustingPrompt(false);
      }
    } else {
      // Build final prompt based on control dimensions
      // subject_desc always uses char_prompt
      // scene follows environment choice
      const finalData: any = {
        scene: controlDimensions.environment === "ref" 
          ? updatedRefPrompt.scene 
          : updatedCharPrompt.scene,
        subject_desc: updatedCharPrompt.subject_desc, // Always use character description
        subject_pose: controlDimensions.pose === "ref" 
          ? updatedRefPrompt.subject_pose 
          : updatedCharPrompt.subject_pose,
        subject_expression: controlDimensions.expression === "ref" 
          ? updatedRefPrompt.subject_expression 
          : updatedCharPrompt.subject_expression,
        subject_wardrobe: controlDimensions.wardrobe === "ref" 
          ? updatedRefPrompt.subject_wardrobe 
          : updatedCharPrompt.subject_wardrobe,
        environment: controlDimensions.environment === "ref" 
          ? updatedRefPrompt.environment 
          : updatedCharPrompt.environment,
        camera: controlDimensions.camera === "ref" 
          ? updatedRefPrompt.camera 
          : updatedCharPrompt.camera,
      };

      setVariatePrompt(finalData);
      setVariateFields({
        scene: finalData.scene || "",
        subject_desc: JSON.stringify(finalData.subject_desc || {}, null, 2),
        subject_pose: finalData.subject_pose || "",
        subject_expression: finalData.subject_expression || "",
        subject_wardrobe: JSON.stringify(finalData.subject_wardrobe || {}, null, 2),
        environment: JSON.stringify(finalData.environment || {}, null, 2),
        camera: JSON.stringify(finalData.camera || {}, null, 2),
      });

      setFinalPromptData(finalData);
      setFinalPromptJson(JSON.stringify(finalData, null, 2));
    }
  };

  // Update final prompt when user edits variateFields
  const updateFinalPromptFromVariateFields = () => {
    if (!variatePrompt) return;

    try {
      const finalData: any = {
        scene: variateFields.scene || variatePrompt.scene,
        subject_desc: variateFields.subject_desc 
          ? JSON.parse(variateFields.subject_desc) 
          : variatePrompt.subject_desc,
        subject_pose: variateFields.subject_pose || variatePrompt.subject_pose,
        subject_expression: variateFields.subject_expression || variatePrompt.subject_expression,
        subject_wardrobe: variateFields.subject_wardrobe
          ? JSON.parse(variateFields.subject_wardrobe)
          : variatePrompt.subject_wardrobe,
        environment: variateFields.environment
          ? JSON.parse(variateFields.environment)
          : variatePrompt.environment,
        camera: variateFields.camera
          ? JSON.parse(variateFields.camera)
          : variatePrompt.camera,
      };

      setFinalPromptData(finalData);
      setFinalPromptJson(JSON.stringify(finalData, null, 2));
    } catch (e) {
      console.error("更新 final prompt 失败:", e);
    }
  };

  // 辅助函数：从 variateFields 重建完整的 prompt 对象
  const rebuildPromptFromFields = () => {
    if (!variatePrompt) return null;
    
    const parseJsonOrKeep = (value: string, fallback: any) => {
      if (!value || !value.trim()) return fallback;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    };

    return {
      scene: variateFields.scene || variatePrompt.scene,
      subject_desc: parseJsonOrKeep(variateFields.subject_desc, variatePrompt.subject_desc),
      subject_pose: variateFields.subject_pose || variatePrompt.subject_pose,
      subject_expression: variateFields.subject_expression || variatePrompt.subject_expression,
      subject_wardrobe: parseJsonOrKeep(variateFields.subject_wardrobe, variatePrompt.subject_wardrobe),
      environment: parseJsonOrKeep(variateFields.environment, variatePrompt.environment),
      camera: parseJsonOrKeep(variateFields.camera, variatePrompt.camera),
    };
  };

  // 辅助函数：更新单个字段并同步更新 finalPromptJson
  const updateVariateField = (fieldName: string, value: string) => {
    const updatedFields = { ...variateFields, [fieldName]: value };
    setVariateFields(updatedFields);
    
    // 立即重建 prompt 并更新 finalPromptJson
    try {
      const tempFields = { ...variateFields, [fieldName]: value };
      const parseJsonOrKeep = (val: string, fallback: any) => {
        if (!val || !val.trim()) return fallback;
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      };

      if (variatePrompt) {
        const rebuiltPrompt = {
          scene: tempFields.scene || variatePrompt.scene,
          subject_desc: parseJsonOrKeep(tempFields.subject_desc, variatePrompt.subject_desc),
          subject_pose: tempFields.subject_pose || variatePrompt.subject_pose,
          subject_expression: tempFields.subject_expression || variatePrompt.subject_expression,
          subject_wardrobe: parseJsonOrKeep(tempFields.subject_wardrobe, variatePrompt.subject_wardrobe),
          environment: parseJsonOrKeep(tempFields.environment, variatePrompt.environment),
          camera: parseJsonOrKeep(tempFields.camera, variatePrompt.camera),
        };
        
        const jsonString = JSON.stringify(rebuiltPrompt, null, 2);
        setFinalPromptJson(jsonString);
        setFinalPromptData(rebuiltPrompt);
        console.log(`✍️ 字段 "${fieldName}" 已更新，同步更新 finalPromptJson`);
      }
    } catch (e) {
      console.error("更新字段时重建 prompt 失败:", e);
    }
  };

  // Generate Final Image
  const handleGenerate = async () => {
    if (!characterImage.length) {
      setError("请上传角色图");
      return;
    }

    // 优先使用用户编辑后的 finalPromptJson（最底部的 JSON 编辑框）
    // 如果没有，则从 variateFields 重建
    let promptToUse: any = null;
    let promptJsonString = "";
    
    // 1. 首先尝试使用 finalPromptJson（用户可能直接编辑了 JSON）
    if (finalPromptJson && finalPromptJson.trim()) {
      try {
        promptToUse = JSON.parse(finalPromptJson);
        promptJsonString = finalPromptJson;
        console.log("✅ 使用 finalPromptJson (用户编辑的完整 JSON)");
      } catch (e) {
        console.error("finalPromptJson 解析失败，尝试从 variateFields 重建:", e);
      }
    }
    
    // 2. 如果 finalPromptJson 解析失败，从 variateFields 重建
    if (!promptToUse && variatePrompt && variateFields) {
      console.log("从 variateFields 重建 prompt...");
      try {
        // 辅助函数：尝试解析 JSON，如果失败返回原值
        const parseJsonOrKeep = (value: string, fallback: any) => {
          if (!value || !value.trim()) return fallback;
          try {
            return JSON.parse(value);
          } catch {
            // 如果不是 JSON，检查是否是简单字符串
            return value;
          }
        };

        promptToUse = {
          scene: variateFields.scene || variatePrompt.scene,
          subject_desc: parseJsonOrKeep(variateFields.subject_desc, variatePrompt.subject_desc),
          subject_pose: variateFields.subject_pose || variatePrompt.subject_pose,
          subject_expression: variateFields.subject_expression || variatePrompt.subject_expression,
          subject_wardrobe: parseJsonOrKeep(variateFields.subject_wardrobe, variatePrompt.subject_wardrobe),
          environment: parseJsonOrKeep(variateFields.environment, variatePrompt.environment),
          camera: parseJsonOrKeep(variateFields.camera, variatePrompt.camera),
        };
        promptJsonString = JSON.stringify(promptToUse, null, 2);
        console.log("✅ 从 variateFields 重建成功");
      } catch (e) {
        console.error("从 variateFields 重建失败:", e);
      }
    }
    
    // 3. 最后尝试使用 finalPromptData
    if (!promptToUse && finalPromptData) {
      promptToUse = finalPromptData;
      promptJsonString = JSON.stringify(promptToUse, null, 2);
      console.log("✅ 使用 finalPromptData (备用)");
    }

    if (!promptToUse) {
      setError("请先生成最终 prompt");
      return;
    }

    if (!isAuthenticated || !accessToken) {
      setError("登录后才能使用此功能");
      promptLogin();
      return;
    }

    console.log("=== 发送给后端的 prompt ===");
    console.log(JSON.stringify(promptToUse, null, 2));

    setGenerating(true);
    setError("");
    setErrorDetails(null);

    try {
      const formData = new FormData();
      formData.append("characterImage", characterImage[0]);
      formData.append("finalPromptJson", promptJsonString || JSON.stringify(promptToUse));

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

      {/* 2x2 Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
        {/* Top Left: 反推参考图 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">反推参考图</h2>
          <div className="flex-1 flex flex-col space-y-4">
            {/* Image Upload Area */}
            <div className="flex-shrink-0">
              <ImageUpload
                maxImages={1}
                onImagesChange={setReferenceImage}
                label="上传参考图"
              />
            </div>
            
            {/* Reverse Button */}
            <button
              onClick={handleReverseCaption}
              disabled={reverseCaptionLoading || referenceImage.length === 0}
              className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 flex-shrink-0"
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
            
            {/* Output Fields - 2 columns, 4 rows (7 fields total) */}
            {captionPrompt && (
              <div className="flex-1 grid grid-cols-2 gap-3 overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">场景</label>
                  <textarea
                    value={captionFields.scene}
                    onChange={(e) => setCaptionFields({ ...captionFields, scene: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">人物样貌描述</label>
                  <textarea
                    value={captionFields.subject_desc}
                    onChange={(e) => setCaptionFields({ ...captionFields, subject_desc: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-mono"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">人物动作</label>
                  <textarea
                    value={captionFields.subject_pose}
                    onChange={(e) => setCaptionFields({ ...captionFields, subject_pose: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">人物表情</label>
                  <textarea
                    value={captionFields.subject_expression}
                    onChange={(e) => setCaptionFields({ ...captionFields, subject_expression: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">人物着装</label>
                  <textarea
                    value={captionFields.subject_wardrobe}
                    onChange={(e) => setCaptionFields({ ...captionFields, subject_wardrobe: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-mono"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">环境</label>
                  <textarea
                    value={captionFields.environment}
                    onChange={(e) => setCaptionFields({ ...captionFields, environment: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-mono"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">镜头</label>
                  <textarea
                    value={captionFields.camera}
                    onChange={(e) => setCaptionFields({ ...captionFields, camera: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-mono"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Right: 反推角色描述 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">反推角色描述</h2>
          <div className="flex-1 flex flex-col space-y-4">
            {/* Image Upload Area */}
            <div className="flex-shrink-0">
              <ImageUpload
                maxImages={1}
                onImagesChange={setCharacterImage}
                label="上传角色图"
              />
            </div>
            
            {/* Reverse Button */}
            <button
              onClick={handleReverseCharacter}
              disabled={reverseCharacterLoading || characterImage.length === 0}
              className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 flex-shrink-0"
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
            
            {/* Character Fields - Same structure as reference */}
            {characterPrompt && (
              <div className="flex-1 grid grid-cols-2 gap-3 overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">场景</label>
                  <textarea
                    value={characterFields.scene}
                    onChange={(e) => setCharacterFields({ ...characterFields, scene: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">人物样貌描述</label>
                  <textarea
                    value={characterFields.subject_desc}
                    onChange={(e) => setCharacterFields({ ...characterFields, subject_desc: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-mono"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">人物动作</label>
                  <textarea
                    value={characterFields.subject_pose}
                    onChange={(e) => setCharacterFields({ ...characterFields, subject_pose: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">人物表情</label>
                  <textarea
                    value={characterFields.subject_expression}
                    onChange={(e) => setCharacterFields({ ...characterFields, subject_expression: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">人物着装</label>
                  <textarea
                    value={characterFields.subject_wardrobe}
                    onChange={(e) => setCharacterFields({ ...characterFields, subject_wardrobe: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-mono"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">环境</label>
                  <textarea
                    value={characterFields.environment}
                    onChange={(e) => setCharacterFields({ ...characterFields, environment: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-mono"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">镜头</label>
                  <textarea
                    value={characterFields.camera}
                    onChange={(e) => setCharacterFields({ ...characterFields, camera: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-mono"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Left: 控制维度 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">控制维度</h2>
          <div className="flex-1 flex flex-col space-y-4">
            {/* 选择控制哪些 */}
            <div className="flex-shrink-0">
              <label className="block text-sm font-medium text-gray-700 mb-2">选择控制哪些</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">动作</label>
                  <select
                    value={controlDimensions.pose}
                    onChange={(e) => setControlDimensions({ ...controlDimensions, pose: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  >
                    <option value="ref">按参考图</option>
                    <option value="char">按角色图</option>
                    <option value="adjust">微调</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">表情</label>
                  <select
                    value={controlDimensions.expression}
                    onChange={(e) => setControlDimensions({ ...controlDimensions, expression: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  >
                    <option value="ref">按参考图</option>
                    <option value="char">按角色图</option>
                    <option value="adjust">微调</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">着装</label>
                  <select
                    value={controlDimensions.wardrobe}
                    onChange={(e) => setControlDimensions({ ...controlDimensions, wardrobe: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  >
                    <option value="ref">按参考图</option>
                    <option value="char">按角色图</option>
                    <option value="adjust">微调</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">环境</label>
                  <select
                    value={controlDimensions.environment}
                    onChange={(e) => setControlDimensions({ ...controlDimensions, environment: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  >
                    <option value="ref">按参考图</option>
                    <option value="char">按角色图</option>
                    <option value="adjust">微调</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">镜头</label>
                  <select
                    value={controlDimensions.camera}
                    onChange={(e) => setControlDimensions({ ...controlDimensions, camera: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  >
                    <option value="ref">按参考图</option>
                    <option value="char">按角色图</option>
                    <option value="adjust">微调</option>
                  </select>
                </div>
              </div>
              
              <button
                onClick={handleGeneratePrompt}
                disabled={adjustingPrompt || !captionPrompt || !characterPrompt}
                className="w-full mt-4 bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {adjustingPrompt ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    微调中...
                  </>
                ) : (
                  "生成 Prompt"
                )}
              </button>
            </div>
            
            {/* 输出prompt - Show individual fields like reference module */}
            {variatePrompt && variateFields ? (
              <div className="flex-1 flex flex-col space-y-3">
                {/* Individual Fields - Same structure as reference module, but EDITABLE */}
                <div className="flex-1 grid grid-cols-3 gap-3 overflow-y-auto">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      场景 <span className="text-xs text-gray-500">(可编辑)</span>
                    </label>
                    <textarea
                      value={variateFields.scene}
                      onChange={(e) => updateVariateField('scene', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      人物样貌描述 <span className="text-xs text-gray-500">(可编辑)</span>
                    </label>
                    <textarea
                      value={variateFields.subject_desc}
                      onChange={(e) => updateVariateField('subject_desc', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-mono"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      人物动作 <span className="text-xs text-gray-500">(可编辑)</span>
                    </label>
                    <textarea
                      value={variateFields.subject_pose}
                      onChange={(e) => updateVariateField('subject_pose', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      人物表情 <span className="text-xs text-gray-500">(可编辑)</span>
                    </label>
                    <textarea
                      value={variateFields.subject_expression}
                      onChange={(e) => updateVariateField('subject_expression', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      人物着装 <span className="text-xs text-gray-500">(可编辑)</span>
                    </label>
                    <textarea
                      value={variateFields.subject_wardrobe}
                      onChange={(e) => updateVariateField('subject_wardrobe', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-mono"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      环境 <span className="text-xs text-gray-500">(可编辑)</span>
                    </label>
                    <textarea
                      value={variateFields.environment}
                      onChange={(e) => updateVariateField('environment', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-mono"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      镜头 <span className="text-xs text-gray-500">(可编辑)</span>
                    </label>
                    <textarea
                      value={variateFields.camera}
                      onChange={(e) => updateVariateField('camera', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-mono"
                      rows={3}
                    />
                  </div>
                </div>
                
                {/* Summary Prompt */}
                <div className="flex-1 flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    final prompt <span className="text-xs text-gray-500">(可编辑JSON)</span>
                  </label>
                  <textarea
                    value={finalPromptJson || ""}
                    onChange={(e) => {
                      setFinalPromptJson(e.target.value);
                      try {
                        setFinalPromptData(JSON.parse(e.target.value));
                      } catch (err) {
                        // Invalid JSON, ignore
                      }
                    }}
                    className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-mono resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1">输出prompt</label>
                <textarea
                  value={finalPromptJson || ""}
                  onChange={(e) => {
                    setFinalPromptJson(e.target.value);
                    try {
                      setFinalPromptData(JSON.parse(e.target.value));
                    } catch (err) {
                      // Invalid JSON, ignore
                    }
                  }}
                  placeholder="生成 prompt 后将显示在这里，可编辑"
                  className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-mono resize-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Bottom Right: 生成结果 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">生成结果</h2>
          <div className="flex-1 flex flex-col">
            {finalImage ? (
              <div className="flex-1 flex flex-col gap-3">
                <div className="flex-1 relative bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={finalImage}
                    alt="Generated"
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={() => downloadImage(finalImage, "control-panel-result.png")}
                    className="absolute top-2 right-2 bg-primary-600 text-white px-3 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 text-sm shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    下载
                  </button>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={generating || !finalPromptData || characterImage.length === 0}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2.5 rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-sm font-medium"
                >
                  {generating ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      重新生成中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      使用修改后的提示词重新生成
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex-1 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <Settings className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">生成结果将显示在这里</p>
                  <button
                    onClick={handleGenerate}
                    disabled={generating || !finalPromptData || characterImage.length === 0}
                    className="mt-4 bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mx-auto"
                  >
                    {generating ? (
                      <>
                        <Sparkles className="w-4 h-4 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <Settings className="w-4 h-4" />
                        生成图片
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Display - Full width below grid */}
      {error && (
        <div className="mt-6 bg-red-50 border-2 border-red-300 rounded-xl p-6">
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
    </div>
  );
}

