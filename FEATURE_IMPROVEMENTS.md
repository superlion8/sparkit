# 角色资源功能改进

## ✅ 已完成

### 1. 生成2张图都单独保存
**文件**: `/Users/a/sparkit/app/api/generate/mimic/route.ts`
**修改**: 第 328-350 行
- 改为循环插入，每张图片创建一条独立记录
- 不再使用 JSON.stringify 合并多张图

### 2. 创建删除资源 API
**文件**: `/Users/a/sparkit/app/api/characters/[id]/resources/[taskId]/route.ts`
- 新增 DELETE 接口
- 验证用户权限
- 删除数据库记录

## 📋 待实现（前端改动）

### 3. 添加删除按钮到资源卡片

**文件**: `/Users/a/sparkit/app/characters/[id]/page.tsx`

**需要修改的地方**:
- 在渲染资源卡片时，添加删除按钮
- 添加删除确认对话框
- 调用 DELETE API

**示例代码**:
```tsx
// 添加删除函数
const handleDeleteAsset = async (task_id: string) => {
  if (!confirm('确定要删除这个资源吗？')) return;
  
  try {
    const response = await fetch(`/api/characters/${characterId}/resources/${task_id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (response.ok) {
      // 刷新资源列表
      fetchAssets();
    }
  } catch (error) {
    console.error('Delete failed:', error);
  }
};

// 在卡片上添加删除按钮
<button onClick={() => handleDeleteAsset(asset.task_id)}>
  <Trash2 className="w-4 h-4" />
</button>
```

### 4. 添加 Prompt 复制按钮

**文件**: `/Users/a/sparkit/app/characters/[id]/page.tsx`

**需要修改的地方**:
- 在每个资源卡片显示 prompt
- 添加复制按钮
- 使用 Clipboard API

**示例代码**:
```tsx
// 添加复制函数
const handleCopyPrompt = (prompt: string) => {
  navigator.clipboard.writeText(prompt);
  // 显示成功提示
};

// 在卡片上显示 prompt 和复制按钮
{asset.prompt && (
  <div className="prompt-section">
    <p className="text-sm">{asset.prompt}</p>
    <button onClick={() => handleCopyPrompt(asset.prompt)}>
      <Copy className="w-4 h-4" />
    </button>
  </div>
)}
```

### 5. 添加"参考"Tab 存储 Reference 图

**需要的改动**:

#### A. 修改 Mimic API 保存 reference 图
**文件**: `/Users/a/sparkit/app/api/generate/mimic/route.ts`

添加保存 reference 图的逻辑:
```typescript
// 在保存任务后，额外保存 reference 图
if (uploadedReferenceImageUrl) {
  await supabaseAdminClient
    .from("character_references")
    .insert({
      character_id: characterId,
      reference_image_url: uploadedReferenceImageUrl,
      created_at: new Date().toISOString(),
    });
}
```

#### B. 创建新表（数据库）
需要在 Supabase 创建表 `character_references`:
```sql
CREATE TABLE character_references (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  reference_image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (character_id) REFERENCES characters(id)
);

CREATE INDEX idx_character_references_character_id ON character_references(character_id);
```

#### C. 创建 API 获取 references
**文件**: `/Users/a/sparkit/app/api/characters/[id]/references/route.ts`
```typescript
// GET: 获取角色的所有 reference 图
// DELETE: 删除某个 reference
```

#### D. 修改前端页面
**文件**: `/Users/a/sparkit/app/characters/[id]/page.tsx`

修改 activeTab 状态:
```tsx
const [activeTab, setActiveTab] = useState<"assets" | "favorites" | "references">("assets");
const [references, setReferences] = useState<Reference[]>([]);
```

添加 references tab:
```tsx
<button
  className={activeTab === "references" ? "active" : ""}
  onClick={() => setActiveTab("references")}
>
  <ImageIcon className="w-5 h-5" />
  <span>参考</span>
</button>
```

## 🎯 实施顺序

1. ✅ **后端**: Mimic API 改为单独保存每张图 (已完成)
2. ✅ **后端**: 创建删除资源 API (已完成)
3. 🔄 **数据库**: 创建 `character_references` 表
4. 🔄 **后端**: 修改 Mimic API 保存 reference 图
5. 🔄 **后端**: 创建 references API
6. 🔄 **前端**: 添加删除按钮
7. 🔄 **前端**: 添加复制 prompt 按钮
8. 🔄 **前端**: 添加 references tab

## 📝 注意事项

- 删除资源时需要考虑是否同时删除 Aimovely 上的文件
- 复制功能需要处理 Clipboard API 权限
- References tab 需要支持删除功能
- 所有 API 都需要验证用户权限

