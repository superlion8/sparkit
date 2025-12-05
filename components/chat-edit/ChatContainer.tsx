"use client";

import { useReducer, useCallback, useRef, useEffect } from "react";
import { 
  ChatState, 
  ChatAction, 
  ChatMessage, 
  ChatInputState,
  InputImage,
  OutputImage,
  MODEL_CONFIG,
  MAX_CONCURRENT_TASKS
} from "@/types/chat-edit";
import { useAuth } from "@/hooks/useAuth";
import { logTaskEvent, generateClientTaskId } from "@/lib/clientTasks";
import ChatInputBar from "./ChatInputBar";
import ChatMessageCard from "./ChatMessageCard";
import { MessageSquarePlus } from "lucide-react";

// 初始输入状态
const initialInputState: ChatInputState = {
  prompt: '',
  inputImages: [],
  model: 'nano-pro',
  numImages: 1,
  aspectRatio: 'default',
  imageSize: '2K',
};

// 初始状态
const initialState: ChatState = {
  messages: [],
  input: initialInputState,
  activeTaskCount: 0,
};

// Reducer
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
        activeTaskCount: action.payload.status === 'generating' 
          ? state.activeTaskCount + 1 
          : state.activeTaskCount,
      };
    
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(msg => 
          msg.id === action.id ? { ...msg, ...action.payload } : msg
        ),
        activeTaskCount: action.payload.status && action.payload.status !== 'generating'
          ? Math.max(0, state.activeTaskCount - 1)
          : state.activeTaskCount,
      };
    
    case 'TOGGLE_FAVORITE':
      return {
        ...state,
        messages: state.messages.map(msg => {
          if (msg.id !== action.messageId) return msg;
          return {
            ...msg,
            outputImages: msg.outputImages.map(img => 
              img.id === action.imageId 
                ? { ...img, isFavorited: !img.isFavorited }
                : img
            ),
          };
        }),
      };
    
    case 'SET_INPUT':
      return {
        ...state,
        input: { ...state.input, ...action.payload },
      };
    
    case 'ADD_INPUT_IMAGE':
      return {
        ...state,
        input: {
          ...state.input,
          inputImages: [...state.input.inputImages, action.payload],
        },
      };
    
    case 'REMOVE_INPUT_IMAGE':
      return {
        ...state,
        input: {
          ...state.input,
          inputImages: state.input.inputImages.filter(img => img.id !== action.id),
        },
      };
    
    case 'CLEAR_INPUT':
      return {
        ...state,
        input: initialInputState,
      };
    
    case 'PREFILL_FROM_MESSAGE':
      return {
        ...state,
        input: {
          prompt: action.message.prompt,
          inputImages: action.message.inputImages.map(img => ({
            ...img,
            id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          })),
          model: action.message.model,
          numImages: action.message.numImages,
          aspectRatio: action.message.aspectRatio,
          imageSize: action.message.imageSize,
        },
      };
    
    default:
      return state;
  }
}

export default function ChatContainer() {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { accessToken, isAuthenticated, promptLogin } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 新消息时滚动
  useEffect(() => {
    scrollToBottom();
  }, [state.messages.length, scrollToBottom]);

  // 上传图片到 Aimovely
  const uploadToAimovely = async (imageUrl: string, accessToken: string): Promise<string> => {
    try {
      // 如果已经是 aimovely URL，直接返回
      if (imageUrl.includes('aimovely')) {
        return imageUrl;
      }

      // 下载图片
      let blob: Blob;
      if (imageUrl.startsWith('data:')) {
        const response = await fetch(imageUrl);
        blob = await response.blob();
      } else {
        const response = await fetch(`/api/download?url=${encodeURIComponent(imageUrl)}`);
        blob = await response.blob();
      }

      // 上传到 Aimovely
      const formData = new FormData();
      formData.append('file', new File([blob], `chat-${Date.now()}.png`, { type: 'image/png' }));

      const uploadResponse = await fetch('/api/upload/to-aimovely', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (uploadResponse.ok) {
        const data = await uploadResponse.json();
        return data.url || imageUrl;
      }
    } catch (error) {
      console.error('Upload to Aimovely failed:', error);
    }
    return imageUrl;
  };

  // 提交生成任务
  const handleSubmit = useCallback(async () => {
    if (!isAuthenticated || !accessToken) {
      promptLogin();
      return;
    }

    if (state.activeTaskCount >= MAX_CONCURRENT_TASKS) {
      return;
    }

    const { input } = state;
    if (!input.prompt.trim() && input.inputImages.length === 0) {
      return;
    }

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const modelConfig = MODEL_CONFIG[input.model];

    // 创建新消息
    const newMessage: ChatMessage = {
      id: messageId,
      timestamp: Date.now(),
      prompt: input.prompt,
      inputImages: [...input.inputImages],
      model: input.model,
      numImages: input.numImages,
      aspectRatio: input.aspectRatio,
      imageSize: input.imageSize,
      status: 'generating',
      outputImages: [],
    };

    // 添加消息并清空输入
    dispatch({ type: 'ADD_MESSAGE', payload: newMessage });
    dispatch({ type: 'CLEAR_INPUT' });

    // 创建 AbortController
    const abortController = new AbortController();
    abortControllersRef.current.set(messageId, abortController);

    try {
      // 先上传输入图片到 Aimovely（用于历史记录）
      let uploadedInputUrls: string[] = [];
      for (const img of newMessage.inputImages) {
        if (img.file) {
          const formData = new FormData();
          formData.append('file', img.file);
          
          try {
            const uploadResponse = await fetch('/api/upload/to-aimovely', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
              body: formData,
            });
            
            if (uploadResponse.ok) {
              const data = await uploadResponse.json();
              uploadedInputUrls.push(data.url);
            }
          } catch (e) {
            console.error('Failed to upload input image:', e);
          }
        } else if (img.url) {
          uploadedInputUrls.push(img.url);
        }
      }

      // 构建 FormData
      const formData = new FormData();
      formData.append('prompt', newMessage.prompt);

      if (newMessage.aspectRatio !== 'default') {
        formData.append('aspectRatio', newMessage.aspectRatio);
      }

      if (modelConfig.supportsImageSize && newMessage.imageSize !== 'default') {
        formData.append('imageSize', newMessage.imageSize);
      }

      // 添加图片
      for (const img of newMessage.inputImages) {
        if (img.file) {
          if (input.model === 'qwen') {
            formData.append('image', img.file);
          } else {
            formData.append('images', img.file);
          }
        }
      }

      // 生成多张图片
      const allOutputImages: OutputImage[] = [];
      const numToGenerate = newMessage.numImages;

      for (let i = 0; i < numToGenerate; i++) {
        if (abortController.signal.aborted) break;

        const response = await fetch(modelConfig.endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `生成失败 (${response.status})`);
        }

        const data = await response.json();
        const images = data.images || data.base64Images || [];

        for (const imgUrl of images) {
          const taskId = generateClientTaskId(`chat_${input.model}`);
          
          // 上传到 Aimovely
          const uploadedUrl = await uploadToAimovely(imgUrl, accessToken);

          const outputImage: OutputImage = {
            id: `out-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            url: uploadedUrl,
            base64: imgUrl.startsWith('data:') ? imgUrl : undefined,
            taskId,
            isFavorited: false,
          };

          allOutputImages.push(outputImage);

          // 记录到历史
          await logTaskEvent(accessToken, {
            taskId,
            taskType: `chat_${input.model}`,
            prompt: newMessage.prompt,
            inputImageUrl: uploadedInputUrls[0] || null,
            outputImageUrl: uploadedUrl,
          });
        }
      }

      // 更新消息状态为完成
      dispatch({
        type: 'UPDATE_MESSAGE',
        id: messageId,
        payload: {
          status: 'completed',
          outputImages: allOutputImages,
        },
      });

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Generation aborted');
        return;
      }

      console.error('Generation error:', error);
      dispatch({
        type: 'UPDATE_MESSAGE',
        id: messageId,
        payload: {
          status: 'error',
          error: error.message || '生成失败',
        },
      });
    } finally {
      abortControllersRef.current.delete(messageId);
    }
  }, [state, accessToken, isAuthenticated, promptLogin]);

  // 再次生成
  const handleRegenerate = useCallback((message: ChatMessage) => {
    dispatch({ type: 'PREFILL_FROM_MESSAGE', message });
    // 滚动到输入框
    setTimeout(() => {
      document.querySelector('textarea')?.focus();
    }, 100);
  }, []);

  // 收藏切换
  const handleToggleFavorite = useCallback(async (messageId: string, imageId: string) => {
    if (!accessToken) return;

    const message = state.messages.find(m => m.id === messageId);
    const image = message?.outputImages.find(i => i.id === imageId);
    if (!image) return;

    dispatch({ type: 'TOGGLE_FAVORITE', messageId, imageId });

    // 调用 API 更新收藏状态
    try {
      const endpoint = image.isFavorited 
        ? '/api/favorites/remove' 
        : '/api/favorites/add';
      
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ taskId: image.taskId }),
      });
    } catch (error) {
      console.error('Toggle favorite error:', error);
      // 回滚状态
      dispatch({ type: 'TOGGLE_FAVORITE', messageId, imageId });
    }
  }, [accessToken, state.messages]);

  // 下载图片
  const handleDownload = useCallback(async (image: OutputImage) => {
    try {
      const response = await fetch(`/api/download?url=${encodeURIComponent(image.url)}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sparkit-${image.taskId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    }
  }, []);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {state.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <MessageSquarePlus className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">开始创作</p>
            <p className="text-sm mt-1">上传图片或输入描述，让 AI 帮你生成</p>
          </div>
        ) : (
          state.messages.map((message) => (
            <ChatMessageCard
              key={message.id}
              message={message}
              onRegenerate={handleRegenerate}
              onToggleFavorite={handleToggleFavorite}
              onDownload={handleDownload}
              accessToken={accessToken}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入栏 - 固定高度 */}
      <div className="flex-shrink-0">
        <ChatInputBar
          input={state.input}
          onInputChange={(payload) => dispatch({ type: 'SET_INPUT', payload })}
          onAddImage={(image) => dispatch({ type: 'ADD_INPUT_IMAGE', payload: image })}
          onRemoveImage={(id) => dispatch({ type: 'REMOVE_INPUT_IMAGE', id })}
          onSubmit={handleSubmit}
          isGenerating={state.activeTaskCount > 0}
          activeTaskCount={state.activeTaskCount}
        />
      </div>
    </div>
  );
}

