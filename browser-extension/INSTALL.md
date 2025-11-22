# Sparkit Mimic 浏览器插件安装指南

## 快速开始

### 1. 准备文件

确保 `browser-extension` 文件夹包含以下文件：
- `manifest.json`
- `content/content.js`
- `content/content.css`
- `popup/popup.html`
- `popup/popup.js`
- `background/background.js`

### 2. 添加图标（可选）

在 `assets/` 文件夹中添加以下尺寸的图标：
- `icon16.png` (16x16 像素)
- `icon48.png` (48x48 像素)
- `icon128.png` (128x128 像素)

如果没有图标，插件仍然可以工作，只是没有图标显示。

### 3. 安装插件

#### Chrome/Edge 浏览器

1. 打开浏览器，进入扩展程序页面：
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`

2. 开启"开发者模式"（右上角开关）

3. 点击"加载已解压的扩展程序"

4. 选择 `browser-extension` 文件夹

5. 插件安装完成！

### 4. 配置 Access Token

1. 在浏览器中打开 [Sparkit](https://sparkiai.com)
2. 登录你的账号
3. 打开浏览器开发者工具（按 F12）
4. 进入 **Application** > **Local Storage** > `https://sparkiai.com`
5. 找到 `accessToken` 的值并复制
6. 点击浏览器工具栏中的插件图标
7. 在弹出窗口中粘贴 Access Token
8. 点击"保存"

### 5. 开始使用

1. 访问 [Pinterest](https://pinterest.com) 或 [Instagram](https://instagram.com)
2. 将鼠标悬停在任意图片上
3. 图片右下角会出现 "Mimic" 按钮
4. 点击按钮，选择角色和设置
5. 点击 "Generate" 开始生成
6. 生成完成后，结果会自动保存到角色的资源中

## 功能说明

### 角色记忆功能

插件会记住你上次选择的角色。下次使用时会自动选择上次的角色，你可以点击下拉菜单切换角色。

### 生成设置

- **保留背景图**：如果勾选，会先去除参考图中的人物，生成纯背景图，然后将角色合成到背景中
- **不保留背景图**：AI 会根据场景描述自由生成背景

### 生成结果

- 默认生成 2 张图片
- 结果自动保存到角色的资源中
- 可以在 Sparkit 网站的角色详情页查看

## 故障排除

### Mimic 按钮不显示

1. 检查是否已设置 Access Token
2. 检查是否已创建角色
3. 打开浏览器控制台（F12），查看是否有错误信息

### 生成失败

1. 检查 Access Token 是否有效
2. 检查网络连接
3. 查看浏览器控制台的错误信息

### 结果未保存

1. 检查角色 ID 是否正确
2. 确认数据库配置正确（generation_tasks 表需要有 character_id 字段）

## 技术细节

### 支持的网站

- Pinterest (`pinterest.com`, `*.pinterest.com`)
- Instagram (`instagram.com`, `*.instagram.com`)

### API 端点

- 角色列表：`GET /api/characters`
- Mimic 生成：`POST /api/generate/mimic`
- 图片下载代理：`GET /api/download?url=...`

### 数据存储

- Access Token：存储在 `chrome.storage.local`
- 上次选择的角色：存储在 `chrome.storage.local`

## 开发

### 修改 API 地址

在 `content/content.js` 中修改：

```javascript
const API_BASE_URL = 'https://sparkiai.com'; // 修改为你的 API 地址
```

### 调试

1. 打开浏览器开发者工具（F12）
2. 在 Console 中查看日志（前缀：`[Sparkit Mimic]`）
3. 检查 Network 标签查看 API 请求

## 注意事项

1. **Access Token 安全**：Access Token 存储在本地，不要分享给他人
2. **网络要求**：需要能够访问 Sparkit API
3. **CORS**：图片下载使用 Sparkit 的代理 API 避免 CORS 问题
4. **角色要求**：使用前需要在 Sparkit 中创建至少一个角色

