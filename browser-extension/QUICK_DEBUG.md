# 🔍 快速诊断：按钮不出现

## 问题
Hover 到图片上，Higgsfield 的按钮出现了，但我们的 Mimic 按钮没有出现。

---

## 🚨 立即诊断步骤

### 步骤 1: 检查脚本是否加载

**打开 Pinterest 控制台**（F12 → Console），应该看到：

```javascript
[Sparkit Mimic V2] Content script loaded
[Sparkit Mimic V2] Initializing...
[Sparkit Mimic V2] Global button created
[Sparkit Mimic V2] Mimic modal created
```

**如果看不到这些日志**：
- ❌ 脚本没有加载
- 🔧 解决方案：重新加载插件 (`chrome://extensions/` → 刷新)

---

### 步骤 2: 检查图片是否被处理

**等待 3 秒**，应该看到：

```javascript
[Sparkit Mimic V2] 📊 Initial scan complete. Total images processed: 20
```

**如果显示 0**：
```javascript
⚠️ No images processed! This may indicate a problem.
```

**可能的原因**：
1. 图片尺寸太小（< 150x150px）
2. 图片还没加载完成
3. MutationObserver 没有正确工作

**解决方案**：
- 滚动页面，加载更多图片
- 刷新页面
- 检查是否在正确的网站（Pinterest）

---

### 步骤 3: 手动触发测试

**在控制台运行以下命令**：

```javascript
// 查找所有图片
const images = Array.from(document.querySelectorAll('img')).filter(img => {
  const rect = img.getBoundingClientRect();
  return rect.width >= 150 && rect.height >= 150;
});

console.log('找到', images.length, '张符合条件的图片');

// 手动触发第一张图片的 mouseover
if (images[0]) {
  images[0].dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  console.log('手动触发了第一张图片的 mouseover 事件');
}
```

**预期**：
- 应该看到 Mimic 按钮出现在第一张图片上

**如果仍然没有按钮**：
- 检查下一步

---

### 步骤 4: 检查按钮元素是否存在

**在控制台运行**：

```javascript
// 检查按钮是否存在
const button = document.querySelector('.sparkit-mimic-btn');
console.log('按钮元素:', button);
console.log('按钮样式:', button ? getComputedStyle(button) : 'null');
console.log('按钮 opacity:', button?.style.opacity);
console.log('按钮 display:', button ? getComputedStyle(button).display : 'null');
```

**预期结果**：
```javascript
按钮元素: <div class="sparkit-mimic-btn">...</div>
按钮 opacity: "0"  // 隐藏状态
按钮 display: "block"
```

**如果按钮为 null**：
- ❌ 按钮没有被创建
- 🔧 检查是否有 JavaScript 错误（Console 的红色错误）

---

### 步骤 5: 手动显示按钮

**在控制台运行**：

```javascript
// 手动显示按钮
const button = document.querySelector('.sparkit-mimic-btn');
if (button) {
  button.style.opacity = '1';
  button.style.pointerEvents = 'auto';
  button.style.top = '100px';
  button.style.left = '100px';
  console.log('✅ 按钮已手动显示在 (100, 100)');
} else {
  console.error('❌ 按钮元素不存在');
}
```

**预期**：
- 应该在页面左上角看到 Mimic 按钮

**如果看到按钮了**：
- ✅ 按钮本身没问题
- ❌ 问题是 hover 事件没有触发

---

## 🐛 常见问题

### 问题 1: 脚本有语法错误

**症状**：
```javascript
Uncaught SyntaxError: Unexpected token
```

**解决**：
- 检查 `content-script.js` 是否有语法错误
- 确保所有括号、引号都闭合

---

### 问题 2: 图片太小

**症状**：
```javascript
📊 Initial scan complete. Total images processed: 0
```

**原因**：
- 图片尺寸 < 150x150px 被过滤了

**解决**：
```javascript
// 在控制台检查图片尺寸
const images = document.querySelectorAll('img');
images.forEach(img => {
  const rect = img.getBoundingClientRect();
  console.log('图片尺寸:', rect.width, 'x', rect.height);
});
```

---

### 问题 3: MutationObserver 没有触发

**症状**：
- 刷新页面时能看到按钮
- 滚动加载新图片时按钮不出现

**解决**：
- 这是正常现象，MutationObserver 可能有延迟
- 重新 hover 一次图片

---

### 问题 4: 事件监听器冲突

**症状**：
- Higgsfield 按钮出现
- 我们的按钮不出现

**可能原因**：
- Pinterest 或其他插件阻止了事件冒泡
- 需要使用 capture 模式

**临时解决方案**：
```javascript
// 在控制台运行，查看事件监听器
const img = document.querySelector('img');
if (img) {
  console.log('图片的事件监听器:', getEventListeners(img));
}
```

---

## 🔧 快速修复方案

### 方案 A: 重新加载一切

```bash
1. chrome://extensions/ → 刷新 Sparkit Mimic
2. Pinterest 页面 → Cmd/Ctrl + Shift + R (硬刷新)
3. 等待 3 秒
4. Hover 图片
```

### 方案 B: 清除缓存

```bash
1. F12 → Network 标签页
2. 勾选 "Disable cache"
3. 刷新页面
```

### 方案 C: 禁用其他插件

```bash
1. chrome://extensions/
2. 暂时禁用 Higgsfield 和其他图片相关插件
3. 只保留 Sparkit Mimic
4. 测试是否能看到按钮
```

---

## 📊 正常工作时的日志

**完整的正常日志应该是**：

```javascript
// 页面加载时
[Sparkit Mimic V2] Content script loaded
[Sparkit Mimic V2] Initializing...
[Sparkit Mimic V2] Global button created
[Sparkit Mimic V2] Mimic modal created
[Sparkit Mimic V2] MutationObserver setup complete
[Sparkit Mimic V2] Processing existing images...

// 图片处理
[Sparkit Mimic V2] ✅ Added hover listeners to image: {
  imgSrc: "https://i.pinimg.com/...",
  imgSize: "300x400",
  hasParent: true,
  parentTag: "DIV"
}
[Sparkit Mimic V2] ✅ Added hover listeners to image: ...
... (重复 N 次)

// 3 秒后
[Sparkit Mimic V2] 📊 Initial scan complete. Total images processed: 20

// Hover 图片时
[Sparkit Mimic V2] Image area mouseover
[Sparkit Mimic V2] Showing button for image: https://...
[Sparkit Mimic V2] Stored direct reference and backup to image element
[Sparkit Mimic V2] Assigned new ID to image on-the-fly: sparkit-img-...

// 点击按钮时
[Sparkit Mimic V2] ✅ Using direct image reference (Strategy 0)
[Sparkit Mimic V2] Final targetImage: ✅ found (0-direct-reference)
[Sparkit Mimic V2] ✅ Opening modal with valid image: https://...
```

---

## 🆘 如果所有方法都失败

**请提供以下信息**：

1. **控制台完整日志**（截图或复制）
2. **是否有红色错误**
3. **手动触发测试的结果**
4. **按钮元素检查的结果**
5. **Chrome 版本**：`chrome://version/`
6. **操作系统**

---

## 💡 临时 Workaround

如果实在不行，可以先禁用自动 hover，改用**右键菜单**触发：

```javascript
// 在 background.js 添加右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'sparkit-mimic',
    title: 'Mimic this image',
    contexts: ['image']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'sparkit-mimic') {
    // 触发 Mimic 流程
  }
});
```

这样就能像 Higgsfield 一样，通过右键菜单触发了。

