# Sparkit Mimic 浏览器插件

## 功能说明

这是一个浏览器插件，允许用户在 Pinterest、Instagram 等平台上直接使用 Mimic 功能。

### 主要功能

1. **图片 Hover 检测**：在 Pinterest、Instagram 等平台 hover 到图片时，图片右下角会显示 "Mimic" 按钮
2. **角色选择**：点击 Mimic 按钮后，可以选择角色和是否保留背景
3. **一键生成**：点击 Generate 后，自动执行 Mimic 工作流
4. **结果保存**：生成的结果自动保存到角色的资源中
5. **角色记忆**：记住上次选择的角色，下次使用时自动选择

## 安装步骤

### 1. 开发模式安装

1. 打开 Chrome/Edge 浏览器
2. 进入 `chrome://extensions/` 或 `edge://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `browser-extension` 文件夹

### 2. 配置 Access Token

1. 在浏览器中打开 [Sparkit](https://sparkiai.com)
2. 登录账号
3. 打开浏览器开发者工具（F12）
4. 进入 Application > Local Storage
5. 找到 `accessToken` 的值并复制
6. 点击插件图标，在弹出窗口中粘贴 Access Token
7. 点击"保存"

## 使用方法

1. **访问支持的网站**：打开 Pinterest 或 Instagram
2. **Hover 图片**：将鼠标悬停在图片上
3. **点击 Mimic 按钮**：图片右下角会出现 "Mimic" 按钮
4. **选择角色和设置**：
   - 选择要使用的角色
   - 选择是否保留背景图
5. **生成**：点击 "Generate" 按钮
6. **查看结果**：生成完成后，结果会自动保存到角色的资源中，可以在 Sparkit 网站的角色详情页查看

## 工作流程

1. **反推提示词**：使用 Gemini 3 Pro 模型反推参考图的提示词
2. **生成背景图**（如果选择保留背景）：使用 Gemini 3 Pro Image Preview 模型去除人物，生成纯背景图
3. **生成最终图片**：使用 Gemini 3 Pro Image Preview 模型，结合角色图片、背景图和提示词，生成最终图片
4. **保存结果**：将生成的图片保存到角色的资源中

## 技术架构

- **Manifest V3**：使用最新的 Chrome Extension API
- **Content Script**：注入到页面中，检测图片并显示按钮
- **Popup**：设置界面，用于配置 Access Token
- **Background Service Worker**：处理后台任务

## 文件结构

```
browser-extension/
├── manifest.json          # 插件配置文件
├── content/
│   ├── content.js         # 内容脚本（检测图片、显示按钮）
│   └── content.css        # 样式文件
├── popup/
│   ├── popup.html         # 弹出窗口 HTML
│   └── popup.js           # 弹出窗口脚本
├── background/
│   └── background.js      # 后台服务脚本
└── assets/
    └── icon*.png          # 插件图标（需要添加）
```

## 开发说明

### 修改 API 地址

在 `content/content.js` 中修改 `API_BASE_URL`：

```javascript
const API_BASE_URL = 'https://sparkiai.com'; // 修改为你的 API 地址
```

### 添加图标

在 `assets/` 文件夹中添加以下尺寸的图标：
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

### 调试

1. 打开浏览器开发者工具
2. 在 Console 中查看日志（前缀：`[Sparkit Mimic]`）
3. 检查 Network 标签查看 API 请求

## 注意事项

1. **Access Token 安全**：Access Token 存储在本地，不要分享给他人
2. **网络要求**：需要能够访问 Sparkit API
3. **CORS**：图片下载使用 Sparkit 的代理 API 避免 CORS 问题
4. **角色要求**：使用前需要在 Sparkit 中创建至少一个角色

## 故障排除

### Mimic 按钮不显示

- 检查是否已设置 Access Token
- 检查是否已创建角色
- 查看浏览器控制台的错误信息

### 生成失败

- 检查 Access Token 是否有效
- 检查网络连接
- 查看浏览器控制台的错误信息

### 结果未保存

- 检查角色 ID 是否正确
- 查看服务器日志
- 确认数据库配置正确

