# Sparkit Mimic 浏览器插件 - 后端集成指南

本文档说明如何将浏览器插件与 Sparkit 后端集成。

## 需要的后端 API 端点

### 1. 角色管理 API

#### GET /api/characters
获取用户的所有角色列表

**请求头**:
```
Authorization: Bearer {accessToken}
```

**响应**:
```json
{
  "characters": [
    {
      "id": "character-id",
      "name": "角色名称",
      "description": "角色描述",
      "char_image": "https://...",
      "char_avatar": "https://...",
      "user_id": "user-id"
    }
  ]
}
```

#### GET /api/characters/:id
获取单个角色详情

**请求头**:
```
Authorization: Bearer {accessToken}
```

**响应**:
```json
{
  "character": {
    "id": "character-id",
    "name": "角色名称",
    "description": "角色描述",
    "char_image": "https://...",
    "char_avatar": "https://...",
    "user_id": "user-id"
  }
}
```

### 2. Mimic 生成 API

#### POST /api/generate/mimic
执行 Mimic 角色替换（已存在于 Sparkit）

**请求头**:
```
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data
```

**请求体**:
```
FormData:
  - referenceImage: File (参考图片)
  - characterImage: File (角色图片)
  - charAvatar: File (可选，角色头像)
  - keepBackground: "true" | "false"
  - numImages: "2"
  - aspectRatio: "default" | "1:1" | "16:9" | ...
  - characterId: "character-id"
```

**响应**:
```json
{
  "captionPrompt": "反推的提示词",
  "backgroundImageUrl": "https://...",
  "finalImageUrls": ["https://...", "https://..."],
  "finalImagesBase64": ["data:image/png;base64,..."],
  "generatedCount": 2,
  "requestedCount": 2
}
```

### 3. 认证验证 API

#### GET /api/auth/verify
验证访问令牌是否有效

**请求头**:
```
Authorization: Bearer {accessToken}
```

**响应**:
```json
{
  "valid": true,
  "email": "user@example.com",
  "userId": "user-id"
}
```

### 4. 健康检查 API (可选)

#### GET /api/health
检查服务是否正常运行

**响应**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 需要创建的新 API 端点

以下端点需要在 Sparkit 后端添加：

### 1. 角色列表 API

**文件**: `/Users/a/sparkit/app/api/characters/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  const { errorResponse, user } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const { data: characters, error } = await supabaseAdminClient
      .from("characters")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ characters: characters || [] });
  } catch (error: any) {
    console.error("Failed to get characters:", error);
    return NextResponse.json(
      { error: "Failed to get characters" },
      { status: 500 }
    );
  }
}
```

### 2. 单个角色详情 API

**文件**: `/Users/a/sparkit/app/api/characters/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { errorResponse, user } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const { data: character, error } = await supabaseAdminClient
      .from("characters")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      throw error;
    }

    if (!character) {
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ character });
  } catch (error: any) {
    console.error("Failed to get character:", error);
    return NextResponse.json(
      { error: "Failed to get character" },
      { status: 500 }
    );
  }
}
```

### 3. 认证验证 API

**文件**: `/Users/a/sparkit/app/api/auth/verify/route.ts`

如果已存在，确保返回格式如下：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { errorResponse, user } = await validateRequestAuth(request);
  if (errorResponse) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  return NextResponse.json({
    valid: true,
    email: user.email,
    userId: user.id
  });
}
```

### 4. 健康检查 API

**文件**: `/Users/a/sparkit/app/api/health/route.ts`

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
}
```

## 数据库表结构

确保 Supabase 中有以下表：

### characters 表

```sql
CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  char_image TEXT NOT NULL,
  char_avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_characters_user_id ON characters(user_id);
CREATE INDEX idx_characters_created_at ON characters(created_at DESC);
```

### generation_tasks 表（已存在）

确保有 `character_id` 字段用于关联：

```sql
ALTER TABLE generation_tasks 
ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_generation_tasks_character_id 
ON generation_tasks(character_id);
```

## CORS 配置

确保 Sparkit 后端允许来自浏览器插件的请求：

**文件**: `/Users/a/sparkit/next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
}

module.exports = nextConfig
```

## 认证流程

### 1. 获取访问令牌

插件通过以下方式获取用户的访问令牌：

**方法 1: 从 Sparkit 网站的 LocalStorage 读取**

```javascript
// 在 background.js 中
const tabs = await chrome.tabs.query({ url: `${SPARKIT_API_URL}/*` });
if (tabs.length > 0) {
  const results = await chrome.scripting.executeScript({
    target: { tabId: tabs[0].id },
    func: () => {
      const supabaseAuthStorage = localStorage.getItem('sb-dev-auth-token');
      if (supabaseAuthStorage) {
        const authData = JSON.parse(supabaseAuthStorage);
        return authData.access_token;
      }
      return null;
    }
  });
  
  const token = results[0].result;
  // 保存到 Chrome Storage
  await chrome.storage.local.set({ sparkitAccessToken: token });
}
```

**方法 2: 在 Sparkit 网站注入代码主动发送**

在 Sparkit 网站添加以下代码（可选）：

```javascript
// /Users/a/sparkit/app/layout.tsx 或其他合适位置
useEffect(() => {
  // 检测是否有浏览器插件
  if (window.chrome && chrome.runtime) {
    // 获取 Supabase token
    const authStorage = localStorage.getItem('sb-dev-auth-token');
    if (authStorage) {
      try {
        const authData = JSON.parse(authStorage);
        // 发送给插件
        chrome.runtime.sendMessage(
          'YOUR_EXTENSION_ID', // 替换为实际的插件 ID
          {
            action: 'setAccessToken',
            token: authData.access_token
          }
        );
      } catch (e) {
        console.error('Failed to send token to extension:', e);
      }
    }
  }
}, []);
```

### 2. Token 存储

Token 存储在 Chrome Storage Local 中：

```javascript
// 保存
await chrome.storage.local.set({ sparkitAccessToken: token });

// 读取
const result = await chrome.storage.local.get(['sparkitAccessToken']);
const token = result.sparkitAccessToken;
```

### 3. Token 验证

每次 API 调用前验证 token 是否有效：

```javascript
const response = await fetch(`${SPARKIT_API_URL}/api/auth/verify`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

if (!response.ok) {
  // Token 无效，提示用户重新登录
  throw new Error('请先登录 Sparkit 网站');
}
```

## 部署检查清单

在部署插件之前，确保：

- [ ] Sparkit 后端已部署并可访问
- [ ] 所有必需的 API 端点已创建
- [ ] 数据库表结构正确
- [ ] CORS 配置正确
- [ ] 角色功能在 Web 端正常工作
- [ ] Mimic API 正常工作
- [ ] 修改插件中的 `SPARKIT_API_URL` 为实际地址
- [ ] 测试完整的认证流程
- [ ] 测试完整的生成流程
- [ ] 准备好插件图标

## 测试流程

1. **后端测试**
   ```bash
   # 测试健康检查
   curl https://你的域名.com/api/health
   
   # 测试角色列表（需要 token）
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://你的域名.com/api/characters
   
   # 测试认证验证
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://你的域名.com/api/auth/verify
   ```

2. **插件测试**
   - 安装插件
   - 登录 Sparkit 网站
   - 检查插件连接状态
   - 测试角色列表加载
   - 测试 Mimic 生成

3. **端到端测试**
   - 打开 Pinterest 或 Instagram
   - 悬停图片显示按钮
   - 选择角色并生成
   - 验证结果保存到角色资源

## 故障排除

### Token 无法获取

**原因**: LocalStorage key 名称不匹配

**解决**: 检查 Supabase 的实际存储 key:
```javascript
// 在浏览器控制台
console.log(Object.keys(localStorage).filter(k => k.includes('auth')));
```

### CORS 错误

**原因**: 后端未正确配置 CORS

**解决**: 
1. 检查 `next.config.js` 的 headers 配置
2. 确保 API 返回正确的 CORS 头
3. 在浏览器开发者工具的 Network 标签查看响应头

### API 404 错误

**原因**: API 端点未创建或路径不匹配

**解决**: 
1. 检查后端是否有对应的 API 文件
2. 验证路由路径是否正确
3. 重启 Next.js 开发服务器

## 扩展功能

可以考虑添加的增强功能：

1. **批量处理**: 一次选择多张图片进行批量 Mimic
2. **历史记录**: 在插件中查看生成历史
3. **快捷键**: 使用键盘快捷键启动 Mimic
4. **自动保存**: 自动下载生成的图片到本地
5. **分享功能**: 直接分享到社交媒体
6. **预设配置**: 保存常用的配置组合

---

✅ 后端集成完成后，插件即可正常使用！

