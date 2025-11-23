"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import ImageGrid from "@/components/ImageGrid";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ArrowLeft, User, Heart, HeartOff, Image as ImageIcon, Video, Download, Trash2, Copy, Check } from "lucide-react";
import { downloadImage } from "@/lib/downloadUtils";

interface Character {
  id: string;
  char_name: string;
  char_avatar: string;
  char_image: string | null;
  created_at: string;
}

interface Asset {
  id: string;
  task_id: string;
  task_type: string;
  output_image_url: string | null;
  output_video_url: string | null;
  prompt: string | null;
  task_time: string;
  is_favorite: boolean;
}

interface Reference {
  id: string;
  reference_image_url: string;
  created_at: string;
}

export default function CharacterDetailPage() {
  const { accessToken, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const characterId = params.id as string;

  const [character, setCharacter] = useState<Character | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [favorites, setFavorites] = useState<Asset[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"assets" | "favorites" | "references">("assets");
  const [error, setError] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && accessToken && characterId) {
      fetchCharacter();
      fetchAssets();
      fetchFavorites();
      fetchReferences();
    }
  }, [isAuthenticated, accessToken, characterId]);

  const fetchCharacter = async () => {
    if (!accessToken || !characterId) return;

    try {
      const response = await fetch(`/api/characters/${characterId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("获取角色信息失败");
      }

      const data = await response.json();
      setCharacter(data.character);
    } catch (err: any) {
      console.error("Failed to fetch character:", err);
      setError(err.message || "获取角色信息失败");
    }
  };

  const fetchAssets = async () => {
    if (!accessToken || !characterId) return;

    try {
      const response = await fetch(`/api/characters/${characterId}/assets`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("获取资源列表失败");
      }

      const data = await response.json();
      setAssets(data.assets || []);
    } catch (err: any) {
      console.error("Failed to fetch assets:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    if (!accessToken || !characterId) return;

    try {
      const response = await fetch(`/api/characters/${characterId}/favorites`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("获取收藏列表失败");
      }

      const data = await response.json();
      setFavorites(data.favorites || []);
    } catch (err: any) {
      console.error("Failed to fetch favorites:", err);
    }
  };

  const fetchReferences = async () => {
    if (!accessToken || !characterId) return;

    try {
      const response = await fetch(`/api/characters/${characterId}/references`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("获取参考图列表失败");
      }

      const data = await response.json();
      setReferences(data.references || []);
    } catch (err: any) {
      console.error("Failed to fetch references:", err);
    }
  };

  const handleToggleFavorite = async (asset: Asset) => {
    if (!accessToken || !characterId) return;

    const isFavorite = asset.is_favorite;

    try {
      if (isFavorite) {
        // 取消收藏
        const response = await fetch(
          `/api/characters/${characterId}/favorites?task_id=${asset.task_id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("取消收藏失败");
        }

        // 更新本地状态
        setAssets((prev) =>
          prev.map((a) =>
            a.task_id === asset.task_id ? { ...a, is_favorite: false } : a
          )
        );
        setFavorites((prev) => prev.filter((f) => f.task_id !== asset.task_id));
      } else {
        // 添加收藏
        const response = await fetch(`/api/characters/${characterId}/favorites`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ task_id: asset.task_id }),
        });

        if (!response.ok) {
          throw new Error("添加收藏失败");
        }

        // 更新本地状态
        setAssets((prev) =>
          prev.map((a) =>
            a.task_id === asset.task_id ? { ...a, is_favorite: true } : a
          )
        );
        setFavorites((prev) => [...prev, { ...asset, is_favorite: true }]);
      }
    } catch (err: any) {
      console.error("Failed to toggle favorite:", err);
      alert(err.message || "操作失败");
    }
  };

  const handleDeleteAsset = async (taskId: string) => {
    if (!accessToken || !characterId) return;
    
    if (!confirm('确定要删除这个资源吗？此操作无法撤销。')) {
      return;
    }

    try {
      const response = await fetch(`/api/characters/${characterId}/resources/${taskId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("删除失败");
      }

      // 更新本地状态
      setAssets((prev) => prev.filter((a) => a.task_id !== taskId));
      setFavorites((prev) => prev.filter((f) => f.task_id !== taskId));
    } catch (err: any) {
      console.error("Failed to delete asset:", err);
      alert(err.message || "删除失败");
    }
  };

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopiedPrompt(prompt);
      setTimeout(() => setCopiedPrompt(null), 2000);
    });
  };

  const handleDeleteReference = async (referenceId: string) => {
    if (!accessToken || !characterId) return;
    
    if (!confirm('确定要删除这张参考图吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/characters/${characterId}/references/${referenceId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("删除失败");
      }

      // 更新本地状态
      setReferences((prev) => prev.filter((r) => r.id !== referenceId));
    } catch (err: any) {
      console.error("Failed to delete reference:", err);
      alert(err.message || "删除失败");
    }
  };

  const getAssetUrl = (asset: Asset): string | null => {
    if (asset.output_image_url) {
      try {
        const urls = JSON.parse(asset.output_image_url);
        return Array.isArray(urls) ? urls[0] : asset.output_image_url;
      } catch {
        return asset.output_image_url;
      }
    }
    return asset.output_video_url;
  };

  const getAssetUrls = (asset: Asset): string[] => {
    if (asset.output_image_url) {
      try {
        const urls = JSON.parse(asset.output_image_url);
        return Array.isArray(urls) ? urls : [asset.output_image_url];
      } catch {
        return [asset.output_image_url];
      }
    }
    return asset.output_video_url ? [asset.output_video_url] : [];
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        <LoadingSpinner text="加载角色信息中..." />
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6">
          <p className="text-red-700">{error || "角色不存在"}</p>
          <button
            onClick={() => router.push("/characters")}
            className="mt-4 text-primary-600 hover:text-primary-700"
          >
            返回角色列表
          </button>
        </div>
      </div>
    );
  }

  const currentAssets = activeTab === "references" ? [] : (activeTab === "assets" ? assets : favorites);

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push("/characters")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>返回角色列表</span>
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
              {character.char_avatar ? (
                <img
                  src={character.char_avatar}
                  alt={character.char_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {character.char_name}
              </h1>
              <p className="text-gray-600">
                创建于 {new Date(character.created_at).toLocaleDateString("zh-CN")}
              </p>
              {character.char_image && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">全身照：</p>
                  <img
                    src={character.char_image}
                    alt={`${character.char_name} 全身照`}
                    className="max-w-md rounded-lg border border-gray-200"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("assets")}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === "assets"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            资源 ({assets.length})
          </button>
          <button
            onClick={() => setActiveTab("favorites")}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === "favorites"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            收藏 ({favorites.length})
          </button>
          <button
            onClick={() => setActiveTab("references")}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === "references"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            参考 ({references.length})
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "references" ? (
        references.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <ImageIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">还没有参考图</h2>
            <p className="text-gray-600">
              使用 Mimic 功能时的参考图将自动保存在这里
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {references.map((ref) => (
              <div
                key={ref.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-gray-100 relative group">
                  <img
                    src={ref.reference_image_url}
                    alt="Reference"
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteReference(ref.id)}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>

                  {/* Download Button */}
                  <button
                    onClick={() => downloadImage(ref.reference_image_url)}
                    className="absolute top-2 left-2 p-2 bg-white/80 text-gray-600 rounded-full hover:bg-white transition-colors shadow-lg opacity-0 group-hover:opacity-100"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>参考图</span>
                    <span>
                      {new Date(ref.created_at).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : currentAssets.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          {activeTab === "assets" ? (
            <>
              <ImageIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">还没有资源</h2>
              <p className="text-gray-600">
                为该角色生成的内容将显示在这里
              </p>
            </>
          ) : (
            <>
              <Heart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">还没有收藏</h2>
              <p className="text-gray-600">
                从资源中点击收藏按钮来收藏您喜欢的内容
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentAssets.map((asset) => {
            const urls = getAssetUrls(asset);
            const mainUrl = getAssetUrl(asset);
            const isImage = asset.output_image_url !== null;

            return (
              <div
                key={asset.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-gray-100 relative group">
                  {mainUrl ? (
                    isImage ? (
                      <img
                        src={mainUrl}
                        alt={asset.prompt || "Generated image"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={mainUrl}
                        className="w-full h-full object-cover"
                        controls
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {isImage ? (
                        <ImageIcon className="w-16 h-16 text-gray-400" />
                      ) : (
                        <Video className="w-16 h-16 text-gray-400" />
                      )}
                    </div>
                  )}
                  
                  {/* Favorite Button */}
                  <button
                    onClick={() => handleToggleFavorite(asset)}
                    className={`absolute top-2 right-2 p-2 rounded-full transition-colors shadow-lg ${
                      asset.is_favorite
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-white/80 text-gray-600 hover:bg-white"
                    }`}
                  >
                    {asset.is_favorite ? (
                      <Heart className="w-5 h-5 fill-current" />
                    ) : (
                      <HeartOff className="w-5 h-5" />
                    )}
                  </button>

                  {/* Action Buttons */}
                  <div className="absolute top-2 left-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Download Button */}
                    {mainUrl && (
                      <button
                        onClick={() => {
                          if (isImage) {
                            downloadImage(mainUrl);
                          } else {
                            window.open(mainUrl, "_blank");
                          }
                        }}
                        className="p-2 bg-white/80 text-gray-600 rounded-full hover:bg-white transition-colors shadow-lg"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    )}
                    
                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteAsset(asset.task_id)}
                      className="p-2 bg-red-500/80 text-white rounded-full hover:bg-red-500 transition-colors shadow-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-4">
                  {asset.prompt && (
                    <div className="mb-2">
                      <div className="flex items-start gap-2">
                        <p className="text-sm text-gray-700 line-clamp-2 flex-1">
                          {asset.prompt}
                        </p>
                        <button
                          onClick={() => handleCopyPrompt(asset.prompt!)}
                          className="flex-shrink-0 p-1.5 text-gray-500 hover:text-primary-600 rounded transition-colors"
                          title="复制提示词"
                        >
                          {copiedPrompt === asset.prompt ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{asset.task_type}</span>
                    <span>
                      {new Date(asset.task_time).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

