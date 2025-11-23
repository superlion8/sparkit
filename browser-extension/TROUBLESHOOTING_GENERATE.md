# 生成卡住问题排查指南

## 🐛 问题现象
点击生成后显示：
```
[Sparkit Mimic] Sending generate request to background...
```
然后卡住，没有后续响应。

---

## 🔍 排查步骤

### 步骤 1: 查看 Service Worker 日志（必须！）

**这是最重要的步骤！**

1. **打开新标签页**，输入：
   ```
   chrome://extensions/
   ```

2. **找到 "Sparkit Mimic" 插件**

3. **点击蓝色的 "service worker" 文字**
   - 会打开一个新的 DevTools 窗口
   - 这是 background script 的日志

4. **查看日志**，应该看到：
   ```
   [Sparkit Mimic BG] ========== GENERATE START ==========
   [Sparkit Mimic BG] Starting Mimic generation...
   [Sparkit Mimic BG] Fetching character info...
   [Sparkit Mimic BG] Character info: ...
   [Sparkit Mimic BG] Downloading reference image...
   [Sparkit Mimic BG] Reference image file created: 123456
   [Sparkit Mimic BG] Downloading character image from: ...
   [Sparkit Mimic BG] Character image file created: 234567
   [Sparkit Mimic BG] Calling Mimic API: https://sparkiai.com/api/generate/mimic
   [Sparkit Mimic BG] Mimic API response status: 200
   [Sparkit Mimic BG] Processed results: 2 images
   ```

5. **找到最后一条日志**，看卡在哪一步：
   - 如果卡在 "Calling Mimic API" → API 调用中
   - 如果卡在 "Downloading character image" → 图片下载失败
   - 如果有红色错误 → 查看错误信息

---

## 🚨 常见问题

### 问题 1: Service Worker 是 "inactive"（灰色）
**现象**：插件页面显示 "service worker (inactive)"  
**原因**：Service Worker 被 Chrome 挂起  
**解决**：
1. 刷新插件（chrome://extensions/ → 点刷新图标）
2. 或者点击 "service worker" 文字激活它

### 问题 2: 卡在 "Calling Mimic API"
**现象**：日志停在这一行，没有 "response status"  
**原因**：API 调用超时（生成需要 30-60 秒）  
**解决**：等待更长时间，或检查网络

### 问题 3: 显示 "Failed to fetch" 错误
**现象**：红色错误 "TypeError: Failed to fetch"  
**原因**：CORS 或网络问题  
**解决**：
1. 检查是否登录 sparkiai.com
2. 检查网络连接
3. 查看 Network 标签页的请求详情

### 问题 4: "Character image URL is null"
**现象**：错误提示角色图片缺失  
**原因**：角色没有设置全身照或头像  
**解决**：在 Sparkit 网站给角色上传图片

---

## 🧪 测试脚本

### 在 Pinterest 控制台运行：

```javascript
// 测试 Service Worker 通信
chrome.runtime.sendMessage(
  { action: 'getCharacters' },
  (response) => {
    console.log('Characters:', response);
  }
);
```

**预期结果**：
```javascript
{
  success: true,
  characters: [...]
}
```

如果返回 `undefined` → Service Worker 没有正确响应

---

## 📊 正常的完整日志示例

### Content Script（Pinterest 控制台）：
```
[Sparkit Mimic V2] Button clicked
[Sparkit Mimic V2] Opening modal...
[Sparkit Mimic] Converting image to blob
[Sparkit Mimic] Fetched blob, size: 45678
[Sparkit Mimic] Converted to base64, length: 61234
[Sparkit Mimic] Sending generate request to background...
[Sparkit Mimic] Received response from background: {success: true, ...}
[Sparkit Mimic] Generation successful
```

### Service Worker（chrome://extensions/ → service worker）：
```
[Sparkit Mimic BG] ========== GENERATE START ==========
[Sparkit Mimic BG] Starting Mimic generation...
[Sparkit Mimic BG] Access token found
[Sparkit Mimic BG] Fetching character info...
[Sparkit Mimic BG] Character info: {id: "...", char_name: "Fiya", ...}
[Sparkit Mimic BG] Preparing form data...
[Sparkit Mimic BG] Reference image file created: 45678
[Sparkit Mimic BG] Downloading character image from: https://...
[Sparkit Mimic BG] Character image file created: 234567
[Sparkit Mimic BG] Calling Mimic API: https://sparkiai.com/api/generate/mimic
[Sparkit Mimic BG] Mimic API response status: 200
[Sparkit Mimic BG] Processed results: 2 images
```

---

## 🔧 解决方案

### 如果 Service Worker 日志正常但没有响应：

1. **检查 Chrome 版本**：需要 Chrome 88+
2. **检查插件权限**：manifest.json 中的 host_permissions
3. **重新加载插件**：chrome://extensions/ → 刷新

### 如果 API 调用超时：

1. **检查 Vercel 部署**：https://vercel.com/dashboard
2. **检查 API 是否正常**：直接访问 https://sparkiai.com
3. **查看 Network 标签页**：是否有 pending 请求

---

## 💡 快速修复

### 方法 1: 刷新所有内容

```bash
# 1. 刷新插件
chrome://extensions/ → 点击刷新图标 ⟳

# 2. 刷新 Pinterest 页面
Cmd/Ctrl + Shift + R（硬刷新）

# 3. 重新生成
悬停图片 → 点击 Mimic → 选择角色 → 生成
```

### 方法 2: 清除缓存

```bash
# 清除插件存储
chrome://extensions/ → Sparkit Mimic → 详细信息 → 清除数据
```

---

## 📞 需要帮助？

提供以下信息：
1. ✅ Service Worker 完整日志（截图）
2. ✅ Pinterest 控制台日志（截图）
3. ✅ 卡住时的截图
4. ✅ Chrome 版本

这样可以快速定位问题！

