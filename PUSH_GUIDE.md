# 推送到 GitHub 指南

## 当前状态 ✅

- ✅ Git 仓库已初始化
- ✅ 所有文件已提交（40个文件，6071行代码）
- ✅ 远程仓库已配置：https://github.com/superlion8/creator_ai_toolkit.git
- ⏳ 需要认证后推送

## 推送方式（选择其一）

### 方式 1：使用 Personal Access Token（推荐）⭐

#### 步骤：

1. **生成 Personal Access Token**：
   - 访问：https://github.com/settings/tokens
   - 点击 "Generate new token" → "Generate new token (classic)"
   - 设置名称：`creator_ai_toolkit`
   - 选择权限：勾选 `repo` (完整仓库访问权限)
   - 点击 "Generate token"
   - **复制生成的 token（只显示一次！）**

2. **在终端中推送**：
```bash
cd /Users/a/Desktop/creator_ai_toolkit

# 推送时会要求输入用户名和密码
# Username: superlion8
# Password: 粘贴你的 Personal Access Token（不是 GitHub 密码）
git push -u origin main --force
```

### 方式 2：使用 SSH 密钥

#### 生成并配置 SSH 密钥：

```bash
# 1. 生成 SSH 密钥
ssh-keygen -t ed25519 -C "your_email@example.com"
# 按回车使用默认路径，可以设置密码或直接回车

# 2. 复制公钥
cat ~/.ssh/id_ed25519.pub | pbcopy

# 3. 添加到 GitHub
# 访问：https://github.com/settings/keys
# 点击 "New SSH key"
# 粘贴公钥，保存

# 4. 更改远程仓库为 SSH
cd /Users/a/Desktop/creator_ai_toolkit
git remote set-url origin git@github.com:superlion8/creator_ai_toolkit.git

# 5. 推送
git push -u origin main --force
```

### 方式 3：使用 GitHub CLI

```bash
# 1. 安装 GitHub CLI
brew install gh

# 2. 登录
gh auth login
# 选择 GitHub.com
# 选择 HTTPS
# 按提示完成认证

# 3. 推送
cd /Users/a/Desktop/creator_ai_toolkit
git push -u origin main --force
```

### 方式 4：使用 GitHub Desktop（最简单）🎯

1. 下载安装 [GitHub Desktop](https://desktop.github.com/)
2. 登录你的 GitHub 账号
3. File → Add Local Repository
4. 选择 `/Users/a/Desktop/creator_ai_toolkit`
5. 点击 "Push origin" 按钮

## 推送后验证

推送成功后，访问：https://github.com/superlion8/creator_ai_toolkit

你应该能看到：
- ✅ 40 个文件
- ✅ 完整的项目结构
- ✅ 所有文档（README, QUICKSTART, DEPLOYMENT 等）
- ✅ Next.js 应用代码

## 常见问题

### Q: 为什么要使用 --force？
A: 因为远程仓库可能已有不同的历史记录。使用 --force 会用本地版本覆盖远程版本。

### Q: Personal Access Token 在哪里存储？
A: 推送成功后，macOS 会自动保存到钥匙串中，下次不需要再输入。

### Q: 推送失败怎么办？
A: 确认：
1. Token 权限是否包含 `repo`
2. Token 是否已过期
3. 网络连接是否正常

## 快速命令（已完成的步骤）

```bash
# ✅ 已完成
cd /Users/a/Desktop/creator_ai_toolkit
git init
git add .
git commit -m "Initial commit: Creator AI Toolkit - Next.js 图像/视频生成工具"
git remote add origin https://github.com/superlion8/creator_ai_toolkit.git
git branch -M main

# ⏳ 等待执行（需要认证）
git push -u origin main --force
```

---

**选择最适合你的方式，完成推送！** 🚀

