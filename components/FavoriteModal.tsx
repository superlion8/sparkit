"use client";

import { useState, useEffect } from "react";
import { X, Heart, Folder, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Character {
  id: string;
  char_name: string;
  char_avatar: string;
}

interface FavoriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  onSuccess?: () => void;
  // 如果提供了 characterId，说明在角色页面，只能收藏到当前角色
  characterId?: string;
}

export default function FavoriteModal({
  isOpen,
  onClose,
  taskId,
  onSuccess,
  characterId,
}: FavoriteModalProps) {
  const { accessToken } = useAuth();
  const [favoriteType, setFavoriteType] = useState<"global" | "character">("global");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 如果在角色页面，直接设置为角色收藏
  useEffect(() => {
    if (characterId) {
      setFavoriteType("character");
      setSelectedCharacter(characterId);
    }
  }, [characterId]);

  // 加载角色列表
  useEffect(() => {
    if (isOpen && favoriteType === "character" && !characterId) {
      fetchCharacters();
    }
  }, [isOpen, favoriteType, characterId]);

  const fetchCharacters = async () => {
    if (!accessToken) return;
    
    try {
      const response = await fetch("/api/characters", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCharacters(data.characters || []);
      }
    } catch (error) {
      console.error("Failed to fetch characters:", error);
    }
  };

  const handleFavorite = async () => {
    if (loading || !accessToken) return;

    // 验证
    if (favoriteType === "character" && !selectedCharacter) {
      alert("请选择一个角色");
      return;
    }

    setLoading(true);

    try {
      let response;

      if (favoriteType === "global") {
        // 收藏到历史记录
        response = await fetch("/api/favorites/global", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ task_id: taskId }),
        });
      } else {
        // 收藏到角色
        response = await fetch(`/api/characters/${selectedCharacter}/favorites`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ task_id: taskId }),
        });
      }

      if (response.ok) {
        onSuccess?.();
        onClose();
      } else {
        const data = await response.json();
        alert(data.error || "收藏失败");
      }
    } catch (error) {
      console.error("Failed to add favorite:", error);
      alert("收藏失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">收藏图片</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 如果不在角色页面，显示收藏类型选择 */}
          {!characterId && (
            <>
              <p className="text-sm text-gray-600 mb-4">选择收藏位置：</p>
              
              <div className="space-y-3 mb-6">
                {/* 收藏到历史记录 */}
                <button
                  onClick={() => setFavoriteType("global")}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    favoriteType === "global"
                      ? "border-primary-500 bg-primary-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    favoriteType === "global" ? "bg-primary-100" : "bg-gray-100"
                  }`}>
                    <Folder className={`w-6 h-6 ${
                      favoriteType === "global" ? "text-primary-600" : "text-gray-600"
                    }`} />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-semibold text-gray-900">历史记录收藏</h3>
                    <p className="text-sm text-gray-500">收藏到生成历史的收藏夹</p>
                  </div>
                  {favoriteType === "global" && (
                    <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>

                {/* 收藏到角色 */}
                <button
                  onClick={() => setFavoriteType("character")}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    favoriteType === "character"
                      ? "border-primary-500 bg-primary-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    favoriteType === "character" ? "bg-primary-100" : "bg-gray-100"
                  }`}>
                    <User className={`w-6 h-6 ${
                      favoriteType === "character" ? "text-primary-600" : "text-gray-600"
                    }`} />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-semibold text-gray-900">角色收藏</h3>
                    <p className="text-sm text-gray-500">收藏到指定角色的收藏夹</p>
                  </div>
                  {favoriteType === "character" && (
                    <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              </div>

              {/* 选择角色 */}
              {favoriteType === "character" && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">选择角色：</p>
                  <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                    {characters.map((char) => (
                      <button
                        key={char.id}
                        onClick={() => setSelectedCharacter(char.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                          selectedCharacter === char.id
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <img
                          src={char.char_avatar}
                          alt={char.char_name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <span className="text-sm font-medium text-gray-900 truncate flex-1 text-left">
                          {char.char_name}
                        </span>
                        {selectedCharacter === char.id && (
                          <div className="w-4 h-4 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  {characters.length === 0 && (
                    <p className="text-center text-gray-500 text-sm py-8">
                      暂无角色，请先创建角色
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* 如果在角色页面 */}
          {characterId && (
            <p className="text-center text-gray-600 py-4">
              将此图片收藏到当前角色的收藏夹
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={handleFavorite}
              disabled={loading || (favoriteType === "character" && !selectedCharacter)}
              className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Heart className="w-4 h-4" />
              {loading ? "收藏中..." : "确认收藏"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

