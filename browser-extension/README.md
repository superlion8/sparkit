# Sparkit Mimic 浏览器插件

将任何网页上的图片用 Sparkit 的 Mimic 功能进行 AI 角色替换。

## 功能特点

- 🖼️ **智能图片检测**: 自动识别网页上的图片，悬停显示 Mimic 按钮
- 👤 **角色管理**: 选择你在 Sparkit 创建的角色进行替换
- 🎨 **背景选项**: 可选择保留或不保留原图背景
- 💾 **记忆功能**: 自动记住上次选择的角色
- 📦 **批量生成**: 一次生成 2 张图片
- 🔗 **深度集成**: 与 Sparkit 平台无缝对接

## 支持的网站

- Pinterest
- Instagram
- 小红书
- Twitter/X
- 以及其他任何包含图片的网站

## 安装方法

### Chrome / Edge

1. 下载或克隆本项目
2. 打开浏览器，进入扩展程序页面 (`chrome://extensions/`)
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `browser-extension` 文件夹
6. 安装完成！

### Firefox

1. 打开浏览器，进入附加组件页面 (`about:debugging#/runtime/this-firefox`)
2. 点击"临时加载附加组件"
3. 选择 `browser-extension/manifest.json` 文件
4. 安装完成！

## 使用方法

1. **首次使用**: 点击插件图标，打开 Sparkit 网站并登录
2. **创建角色**: 在 Sparkit 网站的"角色管理"中创建你的角色
3. **浏览图片**: 在 Pinterest、Instagram 等网站浏览图片
4. **启动 Mimic**: 鼠标悬停在图片上，点击右下角的"Mimic"按钮
5. **选择角色**: 在弹出的模态框中选择角色和设置
6. **生成图片**: 点击"生成"按钮，等待结果
7. **查看结果**: 生成的图片会保存在角色的资源中

## 配置

### API 地址配置

编辑以下文件，修改 `SPARKIT_API_URL`:

- `background/background.js`
- `popup/popup.js`

```javascript
// 生产环境
const SPARKIT_API_URL = 'https://sparkiai.com';

// 本地开发
// const SPARKIT_API_URL = 'http://localhost:3000';
```

### 图标

将你的插件图标文件放在 `icons/` 目录下:

- `icon-16.png` (16x16)
- `icon-32.png` (32x32)
- `icon-48.png` (48x48)
- `icon-128.png` (128x128)

## 工作流程

1. **图片检测**: Content Script 监听页面上的图片元素
2. **按钮显示**: 鼠标悬停时在图片右下角显示 Mimic 按钮
3. **角色选择**: 点击按钮打开模态框，选择角色和设置
4. **API 调用**: 
   - Step 1: 反推参考图的提示词（Gemini 3 Pro）
   - Step 2: 去除参考图中的人物（Gemini 3 Pro Image）
   - Step 3: 生成最终图片（Gemini 3 Pro Image）
5. **结果保存**: 生成的图片自动保存到角色资源中

## API 端点

插件调用以下 Sparkit API:

- `GET /api/characters` - 获取角色列表
- `GET /api/characters/:id` - 获取角色详情
- `POST /api/generate/mimic` - 执行 Mimic 生成
- `GET /api/auth/verify` - 验证登录状态

## 权限说明

- `storage`: 保存用户设置和选择的角色
- `activeTab`: 访问当前标签页
- `scripting`: 注入脚本到网页
- `host_permissions`: 访问目标网站和 Sparkit API

## 开发

### 项目结构

```
browser-extension/
├── manifest.json              # 插件配置
├── background/
│   └── background.js          # 后台服务 Worker
├── content/
│   ├── content-script.js      # 内容脚本
│   └── content-script.css     # 样式
├── popup/
│   ├── popup.html             # 弹窗页面
│   └── popup.js               # 弹窗脚本
├── icons/                     # 图标资源
└── README.md                  # 说明文档
```

### 调试

1. 在浏览器扩展程序页面点击"重新加载"
2. 打开开发者工具查看 Console 日志
3. Background Service Worker 的日志在扩展程序页面查看

## 常见问题

### 插件无法连接到 Sparkit

- 检查 API 地址配置是否正确
- 确认 Sparkit 网站正常运行
- 检查浏览器的网络连接

### 提示"未登录"

- 打开 Sparkit 网站并登录
- 刷新插件或重新加载扩展

### 按钮不显示

- 确认图片尺寸足够大（> 100px）
- 检查网站是否在支持列表中
- 查看 Console 是否有错误日志

### 生成失败

- 检查角色是否有有效的图片
- 确认 Gemini API 配额充足
- 查看错误提示了解具体原因

## 更新日志

### v1.0.0 (2024-01-01)

- ✨ 首次发布
- 🖼️ 支持主流社交媒体平台
- 👤 角色选择和管理
- 🎨 背景保留选项
- 💾 角色记忆功能

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 联系方式

- 网站: https://sparkiai.com
- 问题反馈: GitHub Issues

---

Made with ❤️ by Sparkit Team

