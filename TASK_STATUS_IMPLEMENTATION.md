# 任务状态同步功能实现指南

## 📋 已完成

### 1. ✅ 数据库改动
- **文件**: `database/add_task_status.sql`
- **改动**:
  - 添加 `status` 字段 (pending/processing/completed/failed)
  - 添加 `started_at` 字段（任务开始时间）
  - 添加 `completed_at` 字段（任务完成时间）
  - 添加 `error_message` 字段（失败原因）
  - 创建索引优化查询性能

### 2. ✅ 后端 API
- **文件**: `app/api/characters/[id]/tasks/pending/route.ts`
- **功能**: 获取角色的进行中任务（pending + processing）

### 3. ✅ 前端展示
- **文件**: `app/characters/[id]/page.tsx`
- **改动**:
  - 添加 `pendingTasks` 状态
  - 添加 `fetchPendingTasks` 函数
  - 每 5 秒轮询一次进行中的任务
  - 在资源列表顶部显示 Loading 卡片

---

## 🔧 待实现

### 1. ⏳ 修改 Mimic API 创建 Pending 任务

需要在 `app/api/generate/mimic/route.ts` 中添加：

#### Step 1: 开始生成前创建 pending 任务

```typescript
// 在 Mimic API 开始处理前（第40行左右）
if (characterId && user) {
  // 创建 numImages 个 pending 任务
  const baseTaskId = `mimic-${Date.now()}`;
  const pendingTasksToInsert = [];
  
  for (let i = 0; i < numImages; i++) {
    pendingTasksToInsert.push({
      task_id: `${baseTaskId}-${i}-${Math.random().toString(36).substr(2, 9)}`,
      task_type: "mimic",
      email: user.email,
      username: user.user_metadata?.full_name || user.email,
      prompt: customCaptionPrompt || "等待反推提示词...",
      character_id: characterId,
      status: "pending",
      started_at: new Date().toISOString(),
      task_time: new Date().toISOString(),
    });
  }
  
  if (pendingTasksToInsert.length > 0) {
    const { data: createdTasks } = await supabaseAdminClient
      .from("generation_tasks")
      .insert(pendingTasksToInsert)
      .select();
    
    console.log(`[Mimic API] Created ${createdTasks?.length} pending tasks`);
  }
}
```

#### Step 2: 生成完成后更新为 completed

```typescript
// 在现有的保存逻辑处（第318-356行）
// 修改为更新已存在的 pending 任务，而不是创建新任务

if (character) {
  const tasksToUpdate = [];
  
  for (let i = 0; i < uploadedFinalImageUrls.length; i++) {
    if (uploadedFinalImageUrls[i]) {
      tasksToUpdate.push({
        task_id: `${baseTaskId}-${i}-...`, // 使用之前创建的 task_id
        output_image_url: uploadedFinalImageUrls[i],
        prompt: captionPrompt,
        status: "completed",
        completed_at: new Date().toISOString(),
      });
    }
  }
  
  // 批量更新
  for (const task of tasksToUpdate) {
    await supabaseAdminClient
      .from("generation_tasks")
      .update({
        output_image_url: task.output_image_url,
        prompt: task.prompt,
        status: task.status,
        completed_at: task.completed_at,
      })
      .eq("task_id", task.task_id);
  }
}
```

#### Step 3: 失败时更新为 failed

```typescript
// 在 catch 块中（第430行左右）
catch (error: any) {
  console.error("[Mimic API] Generation failed:", error);
  
  // 更新所有 pending 任务为 failed
  if (characterId && baseTaskId) {
    await supabaseAdminClient
      .from("generation_tasks")
      .update({
        status: "failed",
        error_message: error.message || "生成失败",
        completed_at: new Date().toISOString(),
      })
      .like("task_id", `${baseTaskId}%`)
      .eq("status", "pending");
  }
  
  return NextResponse.json({ error: error.message }, { status: 500 });
}
```

---

## 🧪 测试步骤

### 1. 执行数据库迁移
```sql
-- 在 Supabase SQL Editor 中执行
-- 文件: database/add_task_status.sql
```

### 2. 测试 API
```bash
# 1. 在 Pinterest 点击 Mimic
# 2. 立即访问角色管理页面 https://sparkiai.com/characters/[id]
# 3. 应该看到 Loading 卡片
# 4. 等待 5-30 秒，卡片变为完成的图片
```

### 3. 验证轮询
```javascript
// 控制台应该每 5 秒看到请求
GET /api/characters/[id]/tasks/pending
```

---

## 🎨 UI 效果

### Loading 卡片
```
┌────────────────────────┐
│                        │
│     ⏳ 生成中...       │ ← 渐变背景 + 旋转动画
│       等待中           │
│                        │
└────────────────────────┘
│ Prompt 文本 (如有)     │
│ 🔵 mimic    14:23     │ ← 蓝点动画
└────────────────────────┘
```

### 完成后自动替换为实际图片
```
┌────────────────────────┐
│                        │
│    实际生成的图片       │
│                        │
└────────────────────────┘
│ 完整的 Prompt          │
│ mimic    14:23        │
└────────────────────────┘
```

---

## 📊 状态流转

```
用户点击 Mimic
     ↓
创建 pending 任务 (前端立即显示 Loading)
     ↓
更新为 processing (开始调用 Gemini)
     ↓
生成成功 → completed (前端显示实际图片)
生成失败 → failed (前端显示错误信息)
```

---

## 🔍 故障排除

### 问题 1: Loading 卡片不显示
**检查**:
1. 是否执行了数据库迁移？
2. Pending API 是否返回数据？
3. 前端轮询是否工作？

### 问题 2: 卡片一直 Loading
**检查**:
1. Mimic API 是否更新了任务状态？
2. 是否有错误日志？
3. 轮询间隔是否太长？

### 问题 3: 任务重复显示
**检查**:
1. 是否正确过滤了 completed 状态？
2. 是否有任务 ID 冲突？

---

## 🚀 后续优化

1. **WebSocket 实时推送**：替代轮询，降低服务器负载
2. **进度百分比**：显示 10% → 50% → 100%
3. **取消任务**：允许用户取消进行中的任务
4. **失败重试**：点击失败的卡片重新生成
5. **批量操作**：一次生成多个角色

---

**✨ 功能已基本完成！只需执行数据库迁移和修改 Mimic API 即可！**

