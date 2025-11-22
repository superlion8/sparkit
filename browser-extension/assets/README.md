# 图标文件说明

## 问题

如果遇到 "Could not load icon" 错误，说明缺少图标文件。

## 解决方案

### 方案 1：使用在线工具创建（推荐）

1. 访问 https://www.favicon-generator.org/ 或类似工具
2. 上传一个图片或使用文字生成图标
3. 下载不同尺寸的图标（16x16, 48x48, 128x128）
4. 将文件重命名为：
   - `icon16.png`
   - `icon48.png`
   - `icon128.png`
5. 放入 `assets/` 文件夹

### 方案 2：使用浏览器创建

1. 打开 `create_icons.html`（在 assets 文件夹中）
2. 浏览器会自动下载三个图标文件
3. 将下载的文件放入 `assets/` 文件夹

### 方案 3：使用 ImageMagick（如果已安装）

```bash
cd assets
./create_icons.sh
```

### 方案 4：手动创建（最简单）

使用任何图片编辑软件（如 Photoshop、GIMP、甚至在线编辑器）创建：
- 16x16 像素的 PNG 图片 → `icon16.png`
- 48x48 像素的 PNG 图片 → `icon48.png`
- 128x128 像素的 PNG 图片 → `icon128.png`

建议使用紫色背景（#667eea）和白色字母 "M"。

### 方案 5：临时跳过（不推荐）

如果暂时不想创建图标，可以修改 `manifest.json`，移除图标相关配置。但这样插件在浏览器工具栏中不会有图标显示。

## 图标要求

- 格式：PNG
- 尺寸：
  - icon16.png: 16x16 像素
  - icon48.png: 48x48 像素
  - icon128.png: 128x128 像素
- 建议：使用品牌色（#667eea）作为背景，白色字母 "M" 作为标识

