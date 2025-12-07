"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Users, Ban, CheckCircle, Search, RefreshCw, Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface UserInfo {
  email: string;
  username: string;
  taskCount: number;
  lastActiveAt: string;
  isBanned: boolean;
}

export default function AdminUsersPage() {
  const { accessToken, isAuthenticated, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalUsers: 0, bannedCount: 0 });

  const fetchUsers = async () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "获取用户列表失败");
      }

      const data = await response.json();
      setUsers(data.users || []);
      setStats({
        totalUsers: data.totalUsers || 0,
        bannedCount: data.bannedCount || 0,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetchUsers();
    }
  }, [isAuthenticated, accessToken]);

  const handleBan = async (email: string) => {
    if (!accessToken) return;
    if (!confirm(`确定要禁用用户 ${email} 吗？`)) return;

    setActionLoading(email);

    try {
      const response = await fetch("/api/admin/users/ban", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "禁用失败");
      }

      // 刷新列表
      await fetchUsers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnban = async (email: string) => {
    if (!accessToken) return;
    if (!confirm(`确定要解除 ${email} 的禁用状态吗？`)) return;

    setActionLoading(email);

    try {
      const response = await fetch(`/api/admin/users/ban?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "解除禁用失败");
      }

      // 刷新列表
      await fetchUsers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link
            href="/"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary-600" />
            用户管理
          </h1>
        </div>
        <p className="text-gray-600">
          管理用户访问权限，查看用户生成任务统计
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">总用户数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">正常用户</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalUsers - stats.bannedCount}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <Ban className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">已禁用</p>
              <p className="text-2xl font-bold text-gray-900">{stats.bannedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Refresh */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索用户名或邮箱..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            刷新
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  用户
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  邮箱
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                  任务数
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  最后活跃
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                  状态
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                      加载中...
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? "未找到匹配的用户" : "暂无用户数据"}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.email}
                    className={`hover:bg-gray-50 ${user.isBanned ? "bg-red-50/50" : ""}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{user.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {user.taskCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {formatDate(user.lastActiveAt)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {user.isBanned ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <Ban className="w-3 h-3" />
                          已禁用
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          正常
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {user.isBanned ? (
                        <button
                          onClick={() => handleUnban(user.email)}
                          disabled={actionLoading === user.email}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 disabled:opacity-50 transition-colors"
                        >
                          {actionLoading === user.email ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700"></div>
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          解除禁用
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBan(user.email)}
                          disabled={actionLoading === user.email}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors"
                        >
                          {actionLoading === user.email ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700"></div>
                          ) : (
                            <Ban className="w-4 h-4" />
                          )}
                          禁用
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-6 text-center text-sm text-gray-500">
        显示 {filteredUsers.length} / {users.length} 个用户
      </div>
    </div>
  );
}

