"use client";

import { useCallback, useEffect, useState } from "react";

interface AdminStats {
  totalTasks: number;
  todayTasks: number;
  weekTasks: number;
  activeUsers: number;
  taskTypeDistribution: Record<string, number>;
  dailyStats: Array<{
    date: string;
    count: number;
  }>;
  userRanking: Array<{
    email: string;
    username: string;
    count: number;
  }>;
}

interface AdminDashboardProps {
  accessToken: string | null;
}

export default function AdminDashboard({ accessToken }: AdminDashboardProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/stats", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        let message = "无法获取统计数据";
        try {
          const data = await response.json();
          message = data.error ?? message;
        } catch {
          message = `${message} (${response.status})`;
        }
        setError(message);
        return;
      }

      const result = await response.json();
      setStats(result);
    } catch (err: any) {
      setError(err?.message ?? "请求失败");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      fetchStats();
    }
  }, [accessToken, fetchStats]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-32"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
        <div className="text-red-600 text-center">
          <p className="font-medium">统计数据加载失败</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={fetchStats}
            className="mt-3 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const StatCard = ({ title, value, subtitle, color = "blue" }: {
    title: string;
    value: string | number;
    subtitle?: string;
    color?: "blue" | "green" | "purple" | "orange";
  }) => {
    const colorClasses = {
      blue: "bg-blue-50 border-blue-200 text-blue-900",
      green: "bg-green-50 border-green-200 text-green-900",
      purple: "bg-purple-50 border-purple-200 text-purple-900",
      orange: "bg-orange-50 border-orange-200 text-orange-900",
    };

    return (
      <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
        <div className="text-sm font-medium opacity-80">{title}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
        {subtitle && <div className="text-xs opacity-70 mt-1">{subtitle}</div>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">数据概览</h2>
          <button
            onClick={fetchStats}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
          >
            刷新
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="总任务数"
            value={stats.totalTasks.toLocaleString()}
            color="blue"
          />
          <StatCard
            title="今日任务"
            value={stats.todayTasks.toLocaleString()}
            color="green"
          />
          <StatCard
            title="本周任务"
            value={stats.weekTasks.toLocaleString()}
            color="purple"
          />
          <StatCard
            title="活跃用户"
            value={stats.activeUsers.toLocaleString()}
            subtitle="有生成记录的用户"
            color="orange"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 任务类型分布 */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">任务类型分布</h3>
            <div className="space-y-2">
              {Object.entries(stats.taskTypeDistribution)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 6)
                .map(([type, count]) => {
                  const percentage = ((count / stats.totalTasks) * 100).toFixed(1);
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <div className="text-sm text-gray-700 flex-1">
                        <span className="font-medium">{type}</span>
                      </div>
                      <div className="text-sm text-gray-500 ml-4">
                        {count} ({percentage}%)
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* 用户排名 (历史累计，最近7天有活动) */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">用户排名 (历史累计)</h3>
            <p className="text-xs text-gray-500 mb-2">仅显示最近7天有活动的用户</p>
            <div className="space-y-2">
              {stats.userRanking.slice(0, 8).map((user, index) => (
                <div key={user.email} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <div className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-50 text-blue-700'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="text-sm text-gray-700 flex-1 min-w-0">
                      <div className="font-medium truncate">{user.username}</div>
                      <div className="text-xs text-gray-500 truncate">{user.email}</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900 ml-2">
                    {user.count}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 最近7天趋势 - 折线图 */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">最近7天趋势</h3>
            <div className="h-48 relative">
              <svg viewBox="0 0 300 120" className="w-full h-full">
                {/* 网格线 */}
                <defs>
                  <pattern id="grid" width="50" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                
                {/* 数据折线 */}
                {(() => {
                  const maxCount = Math.max(...stats.dailyStats.map(d => d.count), 1);
                  const points = stats.dailyStats.map((data, index) => {
                    const x = 20 + (index * 40);
                    const y = 100 - (data.count / maxCount) * 80;
                    return `${x},${y}`;
                  }).join(' ');
                  
                  return (
                    <>
                      {/* 面积填充 */}
                      <path 
                        d={`M20,100 L${points} L260,100 Z`}
                        fill="rgba(59, 130, 246, 0.1)" 
                      />
                      {/* 折线 */}
                      <polyline
                        fill="none"
                        stroke="rgb(59, 130, 246)"
                        strokeWidth="2"
                        points={points}
                      />
                      {/* 数据点 */}
                      {stats.dailyStats.map((data, index) => {
                        const x = 20 + (index * 40);
                        const y = 100 - (data.count / maxCount) * 80;
                        const isToday = data.date === new Date().toISOString().split('T')[0];
                        return (
                          <circle
                            key={data.date}
                            cx={x}
                            cy={y}
                            r={isToday ? "4" : "3"}
                            fill={isToday ? "rgb(239, 68, 68)" : "rgb(59, 130, 246)"}
                            stroke="white"
                            strokeWidth="2"
                          />
                        );
                      })}
                    </>
                  );
                })()}
                
                {/* X轴标签 */}
                {stats.dailyStats.map((data, index) => {
                  const x = 20 + (index * 40);
                  return (
                    <text
                      key={data.date}
                      x={x}
                      y="115"
                      textAnchor="middle"
                      className="text-xs fill-gray-600"
                      fontSize="10"
                    >
                      {new Date(data.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                    </text>
                  );
                })}
              </svg>
              
              {/* 数值标签 */}
              <div className="absolute inset-0 pointer-events-none">
                {stats.dailyStats.map((data, index) => {
                  const maxCount = Math.max(...stats.dailyStats.map(d => d.count), 1);
                  const leftPercent = (20 + (index * 40)) / 300 * 100;
                  const topPercent = (100 - (data.count / maxCount) * 80) / 120 * 100;
                  
                  return (
                    <div
                      key={data.date}
                      className="absolute text-xs text-gray-700 font-medium transform -translate-x-1/2 -translate-y-6"
                      style={{ 
                        left: `${leftPercent}%`,
                        top: `${topPercent}%`
                      }}
                    >
                      {data.count}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}