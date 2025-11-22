"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import ImageUpload from "@/components/ImageUpload";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Plus, User, X, Edit2, Trash2, Image as ImageIcon } from "lucide-react";

interface Character {
  id: string;
  char_name: string;
  char_avatar: string;
  char_image: string | null;
  created_at: string;
}

export default function CharactersPage() {
  const { accessToken, isAuthenticated, promptLogin } = useAuth();
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [charName, setCharName] = useState("");
  const [charAvatar, setCharAvatar] = useState<File[]>([]);
  const [charImage, setCharImage] = useState<File[]>([]);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetchCharacters();
    }
  }, [isAuthenticated, accessToken]);

  const fetchCharacters = async () => {
    if (!accessToken) return;

    try {
      setLoading(true);
      const response = await fetch("/api/characters", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("获取角色列表失败");
      }

      const data = await response.json();
      console.log("[Character Page] Fetched characters:", data);
      const charactersList = data.characters || [];
      console.log("[Character Page] Characters list:", charactersList);
      
      // 检查每个角色的头像 URL
      charactersList.forEach((char: Character) => {
        console.log("[Character Page] Character avatar URL:", {
          id: char.id,
          name: char.char_name,
          avatarUrl: char.char_avatar,
          avatarUrlType: typeof char.char_avatar,
          avatarUrlLength: char.char_avatar?.length,
        });
      });
      
      setCharacters(charactersList);
    } catch (err: any) {
      console.error("Failed to fetch characters:", err);
      setError(err.message || "获取角色列表失败");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCharacter = async () => {
    if (!isAuthenticated || !accessToken) {
      promptLogin();
      return;
    }

    if (!charName.trim()) {
      setError("请输入角色名称");
      return;
    }

    if (charAvatar.length === 0) {
      setError("请上传角色头像");
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const formData = new FormData();
      formData.append("char_name", charName.trim());
      formData.append("char_avatar", charAvatar[0]);
      if (charImage.length > 0) {
        formData.append("char_image", charImage[0]);
      }

      const response = await fetch("/api/characters", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "创建角色失败");
      }

      const result = await response.json();
      console.log("[Character Page] Character created:", result);

      // 重置表单
      setCharName("");
      setCharAvatar([]);
      setCharImage([]);
      setShowCreateModal(false);

      // 立即将新创建的角色添加到列表（优化用户体验）
      if (result.character) {
        setCharacters((prev) => [result.character, ...prev]);
      }

      // 刷新列表以确保数据同步
      await fetchCharacters();
    } catch (err: any) {
      console.error("Failed to create character:", err);
      setError(err.message || "创建角色失败");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCharacter = async (id: string) => {
    if (!accessToken) return;
    if (!confirm("确定要删除这个角色吗？此操作不可恢复。")) return;

    try {
      const response = await fetch(`/api/characters/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("删除角色失败");
      }

      await fetchCharacters();
    } catch (err: any) {
      console.error("Failed to delete character:", err);
      alert(err.message || "删除角色失败");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">请先登录</h2>
          <p className="text-gray-600 mb-6">登录后即可创建和管理您的角色</p>
          <button
            onClick={promptLogin}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            立即登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <User className="w-8 h-8 text-primary-600" />
            角色管理
          </h1>
          <p className="text-gray-600 mt-2">创建和管理您的角色，为后续功能做准备</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          创建角色
        </button>
      </div>

      {loading ? (
        <LoadingSpinner text="加载角色列表中..." />
      ) : error && characters.length === 0 ? (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6">
          <p className="text-red-700">{error}</p>
        </div>
      ) : characters.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">还没有角色</h2>
          <p className="text-gray-600 mb-6">创建您的第一个角色开始使用</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            创建角色
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {characters.map((character) => (
            <div
              key={character.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/characters/${character.id}`)}
            >
              <div className="aspect-square bg-gray-100 relative">
                {character.char_avatar ? (
                  <img
                    src={character.char_avatar}
                    alt={character.char_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error("[Character Page] Failed to load avatar:", {
                        characterId: character.id,
                        characterName: character.char_name,
                        avatarUrl: character.char_avatar,
                        error: e,
                      });
                      // 隐藏图片，显示占位符
                      e.currentTarget.style.display = 'none';
                    }}
                    onLoad={() => {
                      console.log("[Character Page] Avatar loaded successfully:", {
                        characterId: character.id,
                        avatarUrl: character.char_avatar,
                      });
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-16 h-16 text-gray-400" />
                  </div>
                )}
                {/* 如果图片加载失败，显示占位符 */}
                {character.char_avatar && (
                  <div className="w-full h-full flex items-center justify-center absolute inset-0 bg-gray-100 hidden">
                    <User className="w-16 h-16 text-gray-400" />
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCharacter(character.id);
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {character.char_name}
                </h3>
                <p className="text-sm text-gray-500">
                  {new Date(character.created_at).toLocaleDateString("zh-CN")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Character Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">创建角色</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setError(null);
                  setCharName("");
                  setCharAvatar([]);
                  setCharImage([]);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  角色名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={charName}
                  onChange={(e) => setCharName(e.target.value)}
                  placeholder="请输入角色名称"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  角色头像 <span className="text-red-500">*</span>
                </label>
                <ImageUpload
                  maxImages={1}
                  onImagesChange={setCharAvatar}
                  label="上传头像"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  全身照 <span className="text-gray-500 text-xs">(可选)</span>
                </label>
                <ImageUpload
                  maxImages={1}
                  onImagesChange={setCharImage}
                  label="上传全身照"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setError(null);
                    setCharName("");
                    setCharAvatar([]);
                    setCharImage([]);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={creating}
                >
                  取消
                </button>
                <button
                  onClick={handleCreateCharacter}
                  disabled={creating || !charName.trim() || charAvatar.length === 0}
                  className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <LoadingSpinner />
                      <span>创建中...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      <span>创建角色</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

