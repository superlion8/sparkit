// Chat Edit 类型定义

export type ChatModel = 'nano' | 'nano-pro' | 'qwen';

export type MessageStatus = 'generating' | 'completed' | 'error';

export interface InputImage {
  id: string;
  file?: File;
  url: string;
  preview: string;
}

export interface OutputImage {
  id: string;
  url: string;
  base64?: string;
  taskId: string;
  isFavorited: boolean;
}

export interface ChatMessage {
  id: string;
  timestamp: number;
  
  // 输入信息
  prompt: string;
  inputImages: InputImage[];
  
  // 生成配置
  model: ChatModel;
  numImages: number;
  aspectRatio: string;
  imageSize: string;  // nano-pro 专用
  
  // 任务状态
  status: MessageStatus;
  
  // 结果
  outputImages: OutputImage[];
  error?: string;
}

export interface ChatInputState {
  prompt: string;
  inputImages: InputImage[];
  model: ChatModel;
  numImages: number;
  aspectRatio: string;
  imageSize: string;
}

export type ChatAction =
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'UPDATE_MESSAGE'; id: string; payload: Partial<ChatMessage> }
  | { type: 'TOGGLE_FAVORITE'; messageId: string; imageId: string }
  | { type: 'SET_INPUT'; payload: Partial<ChatInputState> }
  | { type: 'ADD_INPUT_IMAGE'; payload: InputImage }
  | { type: 'REMOVE_INPUT_IMAGE'; id: string }
  | { type: 'CLEAR_INPUT' }
  | { type: 'PREFILL_FROM_MESSAGE'; message: ChatMessage };

export interface ChatState {
  messages: ChatMessage[];
  input: ChatInputState;
  activeTaskCount: number;
}

// 常量
export const MAX_CONCURRENT_TASKS = 10;

export const MODEL_CONFIG: Record<ChatModel, {
  name: string;
  endpoint: string;
  supportsImageSize: boolean;
  supportsMultipleImages: boolean;
  maxImages: number;
}> = {
  'nano': {
    name: 'nano',
    endpoint: '/api/generate/gemini-flash-image',
    supportsImageSize: false,
    supportsMultipleImages: false,
    maxImages: 1,
  },
  'nano-pro': {
    name: 'nano pro',
    endpoint: '/api/generate/gemini',
    supportsImageSize: true,
    supportsMultipleImages: true,
    maxImages: 10,
  },
  'qwen': {
    name: 'qwen (Hot)',
    endpoint: '/api/generate/qwen',
    supportsImageSize: false,
    supportsMultipleImages: false,
    maxImages: 1,
  },
};

export const ASPECT_RATIOS = [
  { value: 'default', label: '默认' },
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
];

export const IMAGE_SIZES = [
  { value: 'default', label: '默认' },
  { value: '1K', label: '1K' },
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
];

export const NUM_IMAGES_OPTIONS = [1, 2, 3, 4];

