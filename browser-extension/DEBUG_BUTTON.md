# 按钮调试指南

## 🐛 当前问题
悬停图片时完全看不到 Mimic 按钮

## 🔧 调试步骤

### 1. 重新加载插件（必须！）
```
chrome://extensions/
  ↓
找到 "Sparkit Mimic"
  ↓
点击刷新图标 ⟳
```

### 2. 打开 Pinterest 并打开控制台
```
1. 访问 https://www.pinterest.com/
2. 按 F12 打开开发者工具
3. 切换到 Console 标签
```

### 3. 查看控制台日志
刷新页面后应该看到：
```
[Sparkit Mimic V2] Content script loaded
[Sparkit Mimic V2] Initializing...
[Sparkit Mimic V2] Image observer started
[Sparkit Mimic V2] Initialized successfully
```

滚动页面查看更多图片加载时的日志：
```
[Sparkit Mimic V2] Added button to container: {
  containerTag: "DIV",
  containerClasses: "...",
  imgSrc: "...",
  buttonVisible: "1"
}
```

### 4. 检查按钮是否插入
在控制台运行：
```javascript
document.querySelectorAll('.sparkit-mimic-overlay').length
```

**预期结果**：应该返回一个大于 0 的数字（表示按钮数量）

### 5. 检查按钮样式
在控制台运行：
```javascript
const btn = document.querySelector('.sparkit-mimic-overlay');
if (btn) {
  console.log('Button found:', {
    opacity: btn.style.opacity,
    position: btn.style.position,
    display: window.getComputedStyle(btn).display,
    visibility: window.getComputedStyle(btn).visibility
  });
} else {
  console.log('No button found!');
}
```

### 6. 手动显示按钮（测试）
在控制台运行：
```javascript
document.querySelectorAll('.sparkit-mimic-overlay').forEach(btn => {
  btn.style.opacity = '1';
  btn.style.pointerEvents = 'auto';
});
```

**如果按钮现在出现了**：说明按钮插入成功，问题在 hover 逻辑  
**如果还是看不到**：说明按钮插入或样式有问题

---

## 📊 诊断结果

### 情况 A: 控制台没有任何日志
**问题**：插件未加载  
**解决**：
1. 确认插件已启用
2. 刷新 Pinterest 页面
3. 硬刷新（Cmd+Shift+R 或 Ctrl+Shift+R）

### 情况 B: 有初始化日志，但没有 "Added button" 日志
**问题**：图片未被检测或容器选择失败  
**解决**：检查图片大小限制（当前 >= 150x150）

### 情况 C: 有 "Added button" 日志，但看不到按钮
**问题**：样式或定位问题  
**解决**：
1. 检查 content-script.css 是否加载
2. 运行步骤 6 手动显示按钮
3. 检查是否被其他元素遮挡（z-index）

### 情况 D: 手动设置 opacity:1 后能看到按钮
**问题**：hover 逻辑不生效  
**解决**：需要改进 CSS 选择器或使用 JS 控制 hover

---

## 🔍 临时修改（调试用）

当前代码已临时修改：
```javascript
buttonWrapper.style.cssText = 'position: absolute; bottom: 8px; left: 8px; z-index: 999; opacity: 1;';
// opacity: 1 - 按钮直接可见，不需要 hover
```

**这意味着现在按钮应该始终可见！**

如果现在还看不到，问题在于：
1. 按钮根本没被插入
2. 容器选择错误
3. 样式被覆盖

---

## 💡 可能的解决方案

### 方案 1: 简化实现（推荐）
不用 opacity 动画，直接用 display: none/block：
```css
.sparkit-mimic-overlay {
  display: none;
}

*:hover > .sparkit-mimic-overlay {
  display: block;
}
```

### 方案 2: JS 控制 hover
```javascript
container.addEventListener('mouseenter', () => {
  buttonWrapper.style.opacity = '1';
});
container.addEventListener('mouseleave', () => {
  buttonWrapper.style.opacity = '0';
});
```

### 方案 3: 降级到旧版浮动按钮
如果内联方式无法工作，回退到全局浮动按钮

---

## 🚀 下一步

**请执行步骤 1-6，然后告诉我：**

1. ✅/❌ 控制台有初始化日志吗？
2. ✅/❌ 有 "Added button" 日志吗？有多少条？
3. ✅/❌ `document.querySelectorAll('.sparkit-mimic-overlay').length` 返回什么？
4. ✅/❌ 现在能看到按钮了吗（应该直接可见，不需要 hover）？
5. 📷 如果能看到，截图给我看看按钮位置

根据你的反馈，我会确定问题所在并提供最终修复！

