import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-9xl font-bold text-primary-600 mb-4">404</h1>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">页面未找到</h2>
        <p className="text-gray-600 mb-8">
          抱歉，您访问的页面不存在。
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Home className="w-5 h-5" />
          返回首页
        </Link>
      </div>
    </div>
  );
}

