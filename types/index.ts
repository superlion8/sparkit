// Model types
export type AIModel = "gemini" | "flux";

// Aspect ratio types
export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

// Generation status
export type GenerationStatus = "idle" | "loading" | "success" | "error";

// API Response types
export interface GenerationResponse {
  images: string[];
  requestId?: string;
  error?: string;
}

// Video generation response
export interface VideoGenerationResponse {
  taskId: string;
  status: string;
  completed: boolean;
  videoUrl?: string | null; // 向后兼容，第一个视频
  videoUrls?: string[]; // 所有视频URL数组
  error?: string | null;
}

// Video template
export interface VideoTemplate {
  id: string;
  name: string;
  description: string;
  duration: string;
  preview: string;
}

// Generation history (for future Supabase integration)
export interface GenerationHistory {
  id: string;
  userId?: string;
  type: "text-to-image" | "image-to-image" | "outfit-change" | "background-replace" | "video-generation" | "video-subject-replace";
  prompt: string;
  model: AIModel;
  resultUrls: string[];
  createdAt: Date;
}

// User quota (for future Supabase integration)
export interface UserQuota {
  userId: string;
  remainingCredits: number;
  totalGenerated: number;
  updatedAt: Date;
}

