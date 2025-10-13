# 🔧 Vercel 部署问题排查指南

## ❌ 问题：点击生成按钮没反应

### 快速诊断（3步）

#### 第 1 步：检查浏览器控制台 🔍

1. 在你的 Vercel 部署网站上，按 **F12** 打开开发者工具
2. 切换到 **Console** 标签
3. 点击"生成"按钮
4. 查看是否有**红色错误信息**

**可能看到的错误**：

##### 错误 A：`API key not configured`
```
POST /api/generate/gemini 500
{"error": "Gemini API key not configured"}
```

**原因**：环境变量没配置  
**解决方案** ⬇️ [跳转到解决方案 1](#解决方案-1-配置环境变量)

##### 错误 B：`Failed to fetch` 或 `Network error`
```
Failed to fetch
TypeError: Failed to fetch
```

**原因**：网络问题或 CORS  
**解决方案** ⬇️ [跳转到解决方案 2](#解决方案-2-网络问题)

##### 错误 C：API 超时
```
Error: Function execution timeout
```

**原因**：Vercel 免费版 10 秒限制  
**解决方案** ⬇️ [跳转到解决方案 3](#解决方案-3-超时问题)

##### 错误 D：没有任何错误信息
**可能原因**：前端 JavaScript 错误  
**解决方案** ⬇️ [跳转到解决方案 4](#解决方案-4-前端错误)

---

#### 第 2 步：检查 Network 标签 🌐

1. 开发者工具中切换到 **Network** 标签
2. 点击"生成"按钮
3. 查找 `/api/generate/gemini` 或 `/api/generate/flux` 请求

**检查项**：
- [ ] 请求是否发送了？（如果没有 = 前端问题）
- [ ] 状态码是多少？
  - `200` = 成功 ✅
  - `400` = 请求参数错误
  - `500` = 服务器错误（通常是环境变量问题）
  - `504` = 超时
- [ ] 点击该请求，查看 **Response** 标签看具体错误

---

#### 第 3 步：检查 Vercel Functions 日志 📊

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 进入你的项目 `creator-ai-toolkit`
3. 点击顶部的 **Functions** 标签
4. 查看最近的日志

**查找**：
- 错误堆栈
- API key 相关错误
- 超时信息

---

## 🔧 解决方案

### 解决方案 1: 配置环境变量

**这是最常见的问题！** 80% 的部署问题都是这个原因。

#### 检查环境变量是否配置：

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 进入项目 `creator-ai-toolkit`
3. 点击 **Settings** → **Environment Variables**
4. 检查是否有以下两个变量：

```
GEMINI_API_KEY
BFL_API_KEY
```

#### 如果没有或配置错误，添加/修改：

**步骤**：

1. 点击 **Add New** → **Environment Variable**

2. 添加第一个变量：
   - **Name**: `GEMINI_API_KEY`
   - **Value**: `AIzaSyDMS5Tf36gqLDzSuGt6OXVE8A5DbM5_AZY`
   - **Environments**: 勾选 **Production**, **Preview**, **Development**（全选）
   - 点击 **Save**

3. 添加第二个变量：
   - **Name**: `BFL_API_KEY`
   - **Value**: `1ffebcbc-a611-44ed-9800-4b9c4ba29c4a`
   - **Environments**: 勾选所有
   - 点击 **Save**

4. **重要**：重新部署！
   - 回到项目首页
   - 点击 **Deployments** 标签
   - 点击最新的部署右侧的 **...** 菜单
   - 选择 **Redeploy**
   - 或者直接推送新代码触发部署

#### 使用 CLI 添加环境变量：

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录
vercel login

# 进入项目目录
cd /Users/a/Desktop/creator_ai_toolkit

# 添加环境变量
vercel env add GEMINI_API_KEY production
# 输入: AIzaSyDMS5Tf36gqLDzSuGt6OXVE8A5DbM5_AZY

vercel env add GEMINI_API_KEY preview
# 输入: AIzaSyDMS5Tf36gqLDzSuGt6OXVE8A5DbM5_AZY

vercel env add BFL_API_KEY production
# 输入: 1ffebcbc-a611-44ed-9800-4b9c4ba29c4a

vercel env add BFL_API_KEY preview
# 输入: 1ffebcbc-a611-44ed-9800-4b9c4ba29c4a

# 重新部署
vercel --prod
```

---

### 解决方案 2: 网络问题

#### 可能原因：
- CORS 问题
- 防火墙阻止
- VPN/代理干扰

#### 解决方法：

1. **检查 next.config.js**（已配置，应该没问题）

2. **尝试其他网络**：
   - 切换到手机热点
   - 关闭 VPN
   - 使用隐身模式

3. **检查 Gemini API 可达性**：
   打开浏览器控制台，运行：
   ```javascript
   fetch('https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyDMS5Tf36gqLDzSuGt6OXVE8A5DbM5_AZY')
     .then(r => r.json())
     .then(d => console.log('API 可访问:', d))
     .catch(e => console.error('API 不可访问:', e))
   ```

---

### 解决方案 3: 超时问题

**Vercel 免费版限制**：函数执行最多 10 秒

#### 症状：
- 使用 Flux 模型时超时
- 错误信息：`Function execution timeout`

#### 解决方法：

**方法 A：使用 Gemini 模型**（推荐）
- Gemini 响应快（2-5 秒）
- 不会超时

**方法 B：优化 Flux 轮询**

编辑 `/app/api/generate/flux/route.ts`，减少轮询次数：

```typescript
// 将这行
const maxAttempts = 60; // 60 attempts * 2 seconds = 2 minutes max

// 改为
const maxAttempts = 4; // 4 attempts * 2 seconds = 8 seconds max
```

**方法 C：升级 Vercel Pro**（60秒限制）

---

### 解决方案 4: 前端错误

#### 检查 React 组件错误：

1. 查看控制台是否有 React 错误
2. 检查是否有未捕获的异常

#### 临时调试代码：

在 `/app/text-to-image/page.tsx` 的 `handleGenerate` 函数开头添加：

```typescript
const handleGenerate = async () => {
  console.log('=== 开始生成 ===');
  console.log('Prompt:', prompt);
  console.log('Model:', model);
  
  if (!prompt.trim()) {
    console.log('❌ 提示词为空');
    setError("请输入描述文本");
    return;
  }
  
  // ... 原有代码
```

重新部署后查看控制台输出。

---

## 🧪 测试 API 直接调用

### 测试 Gemini API

在浏览器控制台运行：

```javascript
// 测试你的 Vercel API 端点
const testAPI = async () => {
  const formData = new FormData();
  formData.append('prompt', 'A cute cat');
  
  try {
    const response = await fetch('/api/generate/gemini', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    console.log('✅ API 响应:', data);
    
    if (data.error) {
      console.error('❌ API 错误:', data.error);
    } else {
      console.log('✅ 成功生成图片数量:', data.images?.length);
    }
  } catch (error) {
    console.error('❌ 请求失败:', error);
  }
};

testAPI();
```

**预期结果**：
- 成功：看到 `✅ 成功生成图片数量: 1`
- 失败：看到具体错误信息

---

## 📋 完整诊断检查清单

### 环境变量检查
- [ ] `GEMINI_API_KEY` 已在 Vercel 配置
- [ ] `BFL_API_KEY` 已在 Vercel 配置
- [ ] 环境变量选择了所有环境（Production, Preview, Development）
- [ ] 配置后已重新部署

### 网络检查
- [ ] 控制台没有 CORS 错误
- [ ] 可以访问 Vercel 网站
- [ ] Network 标签显示请求已发送

### 功能检查
- [ ] 浏览器控制台无 JavaScript 错误
- [ ] 点击按钮有"生成中..."提示
- [ ] Loading 状态正常显示

### 日志检查
- [ ] Vercel Functions 标签无错误日志
- [ ] 部署状态显示成功（绿色勾）

---

## 🚨 最常见的 3 个问题

### 1️⃣ 环境变量未配置（90%）

**症状**：点击按钮后立即显示错误，或无反应  
**检查**：Vercel Settings → Environment Variables  
**解决**：添加两个 API 密钥并重新部署

### 2️⃣ 重新部署未触发（5%）

**症状**：添加环境变量后仍然不工作  
**检查**：Deployments 标签，最新部署时间  
**解决**：手动点击 Redeploy 或推送新代码

### 3️⃣ API 密钥拼写错误（3%）

**症状**：提示 API key invalid  
**检查**：仔细对比密钥是否完全一致  
**解决**：重新复制粘贴，确保没有多余空格

---

## 💡 快速修复方案（30秒）

如果你不想诊断，直接试这个：

```bash
# 1. 确保在项目目录
cd /Users/a/Desktop/creator_ai_toolkit

# 2. 安装 Vercel CLI
npm install -g vercel

# 3. 登录
vercel login

# 4. 查看当前环境变量
vercel env ls

# 5. 如果没有，添加
vercel env add GEMINI_API_KEY production
# 输入: AIzaSyDMS5Tf36gqLDzSuGt6OXVE8A5DbM5_AZY

vercel env add BFL_API_KEY production
# 输入: 1ffebcbc-a611-44ed-9800-4b9c4ba29c4a

# 6. 重新部署
vercel --prod --force
```

---

## 🆘 还是不行？

### 提供以下信息以便诊断：

1. **Vercel 部署 URL**：`https://your-app.vercel.app`
2. **浏览器控制台截图**（按 F12）
3. **选择的模型**：Gemini 还是 Flux？
4. **错误信息**：完整的错误文本
5. **Vercel Functions 日志截图**

### 临时回退方案

如果生产环境有问题，暂时使用本地开发：

```bash
cd /Users/a/Desktop/creator_ai_toolkit
npm run dev
# 访问 http://localhost:3000
```

---

## ✅ 验证修复

修复后，测试以下功能：

1. **文生图**：
   - 输入：`a cute cat`
   - 选择 Gemini 模型
   - 点击生成
   - 应在 5 秒内看到结果

2. **检查控制台**：
   - 无红色错误
   - Network 标签显示 200 状态

3. **下载图片**：
   - 悬停在生成的图片上
   - 点击下载按钮
   - 成功下载

---

**记住**：99% 的问题都是环境变量没配置！先检查这个！🔑

