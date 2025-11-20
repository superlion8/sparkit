# Gemini 图像生成工具使用指南

## 快速开始

### 方法 1: 使用服务账号 JSON 文件（推荐，最简单）

1. **创建服务账号并下载密钥**：
   - 访问 [Google Cloud Console](https://console.cloud.google.com/)
   - 进入项目 `composite-silo-470413-r9`
   - 导航到 "IAM & Admin" > "Service Accounts"
   - 创建新服务账号或使用现有账号
   - 授予 "Vertex AI User" 角色
   - 创建并下载 JSON 密钥文件

2. **设置环境变量**：
   ```bash
   # 将路径替换为你的 JSON 文件实际路径
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
   ```

3. **启动应用**：
   ```bash
   npm run dev
   ```

4. **访问页面**：
   打开浏览器访问 `http://localhost:3000/gemini-image`

### 方法 2: 安装 gcloud CLI

#### 选项 A: 使用官方安装脚本（推荐）

```bash
# 下载并安装 gcloud SDK
curl https://sdk.cloud.google.com | bash

# 重启终端或运行
exec -l $SHELL

# 初始化 gcloud
gcloud init

# 登录并设置应用默认凭据
gcloud auth application-default login

# 设置项目
gcloud config set project composite-silo-470413-r9
```

#### 选项 B: 手动下载安装包

1. 访问：https://cloud.google.com/sdk/docs/install-sdk#mac
2. 下载 macOS 安装包
3. 运行安装程序
4. 在终端运行上述 `gcloud init` 和 `gcloud auth` 命令

### 方法 3: 在 .env.local 中设置（临时测试）

如果你已经有访问令牌，可以在 `.env.local` 中设置（但这种方式需要定期更新令牌，不推荐用于生产环境）。

## 环境变量配置

项目 ID 已在代码中默认设置为 `composite-silo-470413-r9`，通常不需要修改。

如果需要自定义，创建 `.env.local` 文件：

```bash
# Google Cloud Platform (for Gemini Image)
GOOGLE_CLOUD_PROJECT_ID=composite-silo-470413-r9
GOOGLE_CLOUD_LOCATION=global
GEMINI_IMAGE_MODEL_ID=gemini-3-pro-image-preview
```

## 使用界面

1. 打开 `/gemini-image` 页面
2. 输入图像描述（支持中英文）
3. 选择宽高比：1:1、16:9 或 9:16
4. 选择图像大小：1K 或 2K
5. 点击"生成图像"按钮
6. 等待生成完成

## 示例提示词

```
Generate a hyper-realistic infographic of a gourmet cheeseburger, deconstructed to show the texture of the toasted brioche bun, the seared crust of the patty, and the glistening melt of the cheese.
```

## 故障排除

### 错误：无法获取 Google Cloud 访问令牌

**解决方案**：
- 确保已设置 `GOOGLE_APPLICATION_CREDENTIALS` 环境变量
- 或运行 `gcloud auth application-default login`
- 检查服务账号是否有正确的权限

### 错误：项目 ID 未找到

**解决方案**：
- 检查 `.env.local` 中的 `GOOGLE_CLOUD_PROJECT_ID` 设置
- 或确认代码中的默认值 `composite-silo-470413-r9` 是否正确

### 错误：权限不足

**解决方案**：
- 确保服务账号或用户账号有 "Vertex AI User" 角色
- 在 Google Cloud Console 中检查 IAM 权限

## 注意事项

- SDK 会自动使用以下认证方式（按优先级）：
  1. `GOOGLE_APPLICATION_CREDENTIALS` 环境变量（服务账号 JSON）
  2. Application Default Credentials（gcloud auth）
  3. GCE/Cloud Run metadata service（如果在 GCP 上运行）

- 图像生成可能需要 30-120 秒，请耐心等待

- 生成的图像会以 base64 格式返回，可以直接在浏览器中显示

