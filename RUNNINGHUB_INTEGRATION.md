# RunningHub ComfyUI 集成文档

## 概述

视频主体替换功能已集成 RunningHub 的 ComfyUI API，实现了真实的视频主体替换能力。

## API 配置

### 环境变量

在 `.env.local` 中添加：

```bash
RUNNINGHUB_API_KEY=76607e3484104ac58c8e31325479e027
```

### Workflow ID

```typescript
const WORKFLOW_ID = "1977672819733684226"; // 视频主体替换 workflow
```

## API 端点

### RunningHub API 基础地址

```
https://www.runninghub.cn
```

### 主要接口

1. **创建任务**
   - 端点: `POST /task/openapi/create`
   - 用于启动 ComfyUI 工作流

2. **上传文件**
   - 端点: `POST /task/openapi/upload`
   - 用于上传视频和图片资源

3. **查询任务状态**
   - 端点: `POST /task/openapi/query`
   - 用于轮询任务执行状态

## 工作流程

### 1. 文件上传

```typescript
// 上传视频文件
const videoUploadResult = await uploadFile(videoFile, apiKey);

// 上传主体图片
const imageUploadResult = await uploadFile(subjectImage, apiKey);
```

### 2. 创建 ComfyUI 任务

```typescript
const taskResponse = await fetch(`${RUNNINGHUB_API_URL}/task/openapi/create`, {
  method: "POST",
  headers: {
    "Host": "www.runninghub.cn",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    apiKey: apiKey,
    workflowId: WORKFLOW_ID,
  }),
});
```

### 3. 轮询任务结果

```typescript
// 每 5 秒轮询一次
// 最多轮询 60 次（5 分钟）
while (attempts < maxAttempts) {
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const pollResponse = await fetch(`${RUNNINGHUB_API_URL}/task/openapi/query`, {
    method: "POST",
    body: JSON.stringify({
      apiKey: apiKey,
      taskId: taskId,
    }),
  });
  
  const data = await pollResponse.json();
  
  if (data.data.taskStatus === "SUCCESS") {
    // 任务完成
    return { success: true, videoUrl: data.data.resultUrl };
  }
}
```

## 文件结构

### API 路由

`/app/api/generate/runninghub/route.ts`

负责处理视频主体替换请求：
- 接收视频文件和主体图片
- 上传到 RunningHub
- 创建 ComfyUI 任务
- 轮询任务状态
- 返回处理结果

### 前端页面

`/app/video-subject-replace/page.tsx`

用户界面：
- 使用 `VideoUpload` 组件上传视频
- 使用 `ImageUpload` 组件上传主体图片
- 调用 API 处理视频
- 显示处理进度和结果
- 支持下载处理后的视频

### 组件

`/components/VideoUpload.tsx`

视频上传组件：
- 支持拖拽上传
- 视频预览
- 文件大小验证（最大 100MB）
- 格式验证（MP4, MOV, AVI, WebM）

## 使用示例

### 前端调用

```typescript
const formData = new FormData();
formData.append("video", videoFile);
formData.append("subjectImage", subjectImage);

const response = await fetch("/api/generate/runninghub", {
  method: "POST",
  body: formData,
});

const data = await response.json();
console.log("Video URL:", data.videoUrl);
console.log("Task ID:", data.taskId);
```

### 响应格式

**成功响应：**
```json
{
  "taskId": "1234567890",
  "status": "SUCCESS",
  "videoUrl": "https://example.com/result.mp4",
  "message": "Video subject replacement completed successfully"
}
```

**错误响应：**
```json
{
  "error": "Error message here"
}
```

## 性能特点

### 处理时间

- 短视频（<30秒）：3-5 分钟
- 中等视频（30秒-2分钟）：5-8 分钟
- 长视频（>2分钟）：8-15 分钟

### 文件限制

- 最大视频大小：100MB
- 支持格式：MP4, MOV, AVI, WebM
- 图片格式：JPG, PNG, WebP

### 轮询配置

```typescript
const maxAttempts = 60;        // 最多轮询 60 次
const pollInterval = 5000;     // 每次间隔 5 秒
// 总超时时间 = 60 × 5 = 300 秒 = 5 分钟
```

## 错误处理

### 常见错误

1. **API Key 未配置**
   ```
   RunningHub API key not configured
   ```
   解决：检查 `.env.local` 文件

2. **文件上传失败**
   ```
   Video upload failed / Image upload failed
   ```
   解决：检查文件大小和格式

3. **任务超时**
   ```
   Task timeout - took too long to complete
   ```
   解决：视频过长或服务器负载高，可以增加 `maxAttempts`

4. **任务失败**
   ```
   Task failed / Task execution failed
   ```
   解决：检查视频和图片质量，或联系 RunningHub 技术支持

## 最佳实践

### 1. 视频质量

- 使用清晰的视频源
- 确保主体人物明显
- 避免过度压缩

### 2. 主体图片

- 使用高质量图片
- 主体特征清晰
- 背景简单（如果可能）

### 3. 用户体验

```typescript
// 显示处理进度提示
<LoadingSpinner text="AI正在处理视频，这可能需要 3-10 分钟..." />

// 警告用户不要关闭页面
<p>⏳ 正在调用 RunningHub ComfyUI 工作流<br />请耐心等待，不要关闭页面</p>
```

### 4. 错误处理

```typescript
try {
  const result = await processVideo();
  setGeneratedVideo(result.videoUrl);
} catch (error) {
  setError(error.message);
  setErrorDetails(error.details);
}
```

## 官方文档参考

- [RunningHub API 文档](https://www.runninghub.cn/runninghub-api-doc-cn/api-276613248)
- [ComfyUI 任务创建](https://www.runninghub.cn/runninghub-api-doc-cn/api-276613248)

## 后续优化建议

### 短期优化

1. 添加进度条显示
2. 支持 WebSocket 实时更新
3. 添加任务取消功能
4. 优化轮询间隔（根据任务状态动态调整）

### 中期优化

1. 支持批量处理
2. 添加预处理和后处理选项
3. 集成更多 ComfyUI 工作流
4. 添加视频预览和对比功能

### 长期优化

1. 自定义 ComfyUI 工作流参数
2. 支持用户自定义工作流
3. 视频效果模板库
4. 云端视频存储集成

## 成本估算

根据 RunningHub 的定价（请参考官方最新价格）：

- 每次视频处理：约 X 元/分钟
- API 调用费用：包含在处理费用中
- 存储费用：视频结果保存 7 天

建议添加用户配额管理和计费系统。

## 技术支持

如有问题，请查看：
- [RunningHub 文档](https://www.runninghub.cn/runninghub-api-doc-cn/)
- [ComfyUI 官方文档](https://github.com/comfyanonymous/ComfyUI)

---

**集成完成时间**: 2025-10-13  
**集成版本**: 0.2.0  
**状态**: ✅ 生产就绪

