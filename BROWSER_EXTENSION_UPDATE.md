# 浏览器插件更新 - 角色记忆功能

## 📦 版本信息

**更新时间:** 2025/11/24  
**Commit:** `63fac3f`  
**ZIP 文件:** `public/sparkit-browser-extension.zip`

---

## ✨ 新功能：角色记忆

### **问题**
- 用户每次打开 Mimic 弹窗时，角色选择总是跳到列表的第一个角色
- 需要重复选择常用角色，体验不佳

### **修复后**
- ✅ 插件会记住您上次选择的角色
- ✅ 下次打开 Mimic 时，自动选中该角色
- ✅ 即使关闭浏览器，依然记住选择
- ✅ 如果角色被删除，自动回退到第一个角色

---

## 🔧 技术实现

### **数据存储**
```javascript
// 保存角色选择
chrome.storage.local.set({ 
  lastSelectedCharacterId: "角色ID"
});

// 读取上次选择
const result = await chrome.storage.local.get(['lastSelectedCharacterId']);
```

### **工作流程**

1. **用户选择角色时：**
   - 保存角色 ID 到 `chrome.storage.local`
   - 控制台输出：`Character selection saved: 角色名`

2. **打开 Mimic 弹窗时：**
   - 尝试读取 `lastSelectedCharacterId`
   - 如果找到对应角色，自动选中
   - 控制台输出：`Restoring last selected character: 角色名`
   - 如果找不到，使用第一个角色
   - 控制台输出：`Using first character: 角色名`

---

## 📥 如何更新插件

### **方法 1：重新下载安装（推荐）**

1. **下载最新版本：**
   - 访问 https://sparkiai.com/tutorials/browser-extension
   - 点击绿色按钮「下载浏览器插件」
   - 或直接访问：https://sparkiai.com/sparkit-browser-extension.zip

2. **卸载旧版本：**
   - Chrome → 扩展程序 → 管理扩展程序
   - 找到「Sparkit Mimic」
   - 点击「移除」

3. **安装新版本：**
   - 解压 ZIP 文件
   - 开启「开发者模式」
   - 点击「加载已解压的扩展程序」
   - 选择解压后的文件夹

### **方法 2：直接覆盖（快速）**

1. **下载最新 ZIP 文件**
2. **解压到原来的插件文件夹**（覆盖旧文件）
3. **重新加载插件：**
   - Chrome → 扩展程序 → 管理扩展程序
   - 找到「Sparkit Mimic」
   - 点击「刷新」图标 🔄

---

## 🧪 测试步骤

### **1. 验证角色记忆功能**

1. **首次使用：**
   - 在 Pinterest 找一张图片，hover 显示 Mimic 按钮
   - 点击 Mimic 按钮
   - 弹窗应该显示第一个角色（默认行为）

2. **切换角色：**
   - 点击角色卡片，打开角色选择器
   - 选择另一个角色（比如第 3 个角色）
   - 关闭弹窗

3. **再次打开：**
   - 找另一张图片，点击 Mimic 按钮
   - **弹窗应该自动显示您刚才选的第 3 个角色** ✅
   - 不需要重新选择

4. **持久化测试：**
   - 关闭浏览器
   - 重新打开浏览器
   - 打开 Mimic 弹窗
   - **依然显示您上次选的角色** ✅

### **2. 调试模式（可选）**

打开浏览器控制台（F12 → Console），查看日志：

```
[Sparkit Mimic] Restoring last selected character: Fiya
[Sparkit Mimic] Character selection saved: Emma
```

---

## 📊 兼容性

### **支持的浏览器**
- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Brave
- ✅ Opera
- ❌ Firefox（Manifest V3 支持有限）
- ❌ Safari（不支持 Chrome 扩展）

### **支持的网站**
- ✅ Pinterest
- ✅ Instagram
- ✅ 其他图片网站
- ❌ sparkiai.com（插件会自动禁用，避免冲突）

---

## 🐛 常见问题

### **Q1: 更新后角色记忆功能不工作？**

**可能原因：**
- 使用的是旧版本插件

**解决方法：**
1. 检查插件版本：
   ```javascript
   // 在控制台执行
   chrome.runtime.getManifest().version
   ```
2. 如果不是最新版本，重新下载安装

### **Q2: 控制台报错 "chrome.storage is undefined"？**

**可能原因：**
- 浏览器不支持 `chrome.storage` API

**解决方法：**
- 使用 Chrome 88+ 或 Edge 88+

### **Q3: 每次还是跳到第一个角色？**

**调试步骤：**

1. **检查存储权限：**
   ```javascript
   // 在控制台执行
   chrome.storage.local.get(['lastSelectedCharacterId'], (result) => {
     console.log('Stored character ID:', result.lastSelectedCharacterId);
   });
   ```

2. **手动保存测试：**
   ```javascript
   // 在控制台执行
   chrome.storage.local.set({ lastSelectedCharacterId: 'test-id' }, () => {
     console.log('Saved!');
   });
   ```

3. **如果以上都失败：**
   - 卸载插件
   - 清除浏览器缓存
   - 重新安装最新版本

### **Q4: 切换角色后立即关闭弹窗，再打开还是旧角色？**

**这是正常的！**
- 角色选择会立即保存到 `chrome.storage`
- 无需等待生成完成

### **Q5: 我删除了一个角色，插件会怎样？**

**自动回退：**
- 如果上次选择的角色被删除
- 插件会自动选择第一个可用角色
- 控制台会输出：`Could not restore last character, using first`

---

## 📝 更新日志

### **v1.1.0 (2025/11/24)**
- ✨ 新增：角色记忆功能
- 🐛 修复：每次打开弹窗都跳到第一个角色的问题
- 🔧 优化：使用 `chrome.storage.local` 持久化存储

### **v1.0.0**
- 🎉 初始版本
- ✨ Mimic 功能
- ✨ 角色选择
- ✨ 图片上传
- ✨ 一键生成

---

## 🚀 下一步

插件会继续改进，计划中的功能：
- 🔜 批量生成（一次生成多个角色）
- 🔜 预设模板（保存常用设置）
- 🔜 生成历史（查看之前生成的图片）
- 🔜 快捷键支持（Ctrl+Shift+M 打开 Mimic）

---

**有问题或建议？欢迎反馈！** 💬

