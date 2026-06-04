/**
 * RACE-X Unified AI Gateway Client
 * All AI requests route through Supabase Edge Functions
 * Providers: Groq (chat) + HuggingFace (image/voice/music/video)
 */
import { supabase } from '@/db/supabase';

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIChatResponse {
  reply: string;
  model: string;
  provider: 'groq';
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface AIImageResponse {
  image_url: string; // base64 data URL
  provider: 'huggingface';
  model: string;
  prompt: string;
  retry_after?: number;
}

export interface AIVoiceResponse {
  audio_url: string; // base64 data URL
  provider: 'huggingface';
  model: string;
  voice_preset: string;
  retry_after?: number;
}

export interface AIMusicResponse {
  audio_url: string; // base64 data URL
  provider: 'huggingface';
  model: string;
  mode: string;
  retry_after?: number;
}

export interface AIVideoResponse {
  video_url: string; // base64 data URL
  provider: 'huggingface';
  model: string;
  num_frames: number;
  retry_after?: number;
}

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  resource_type: string;
  format: string;
  provider: 'cloudinary';
}

// ─── CHAT (Groq LLaMA 3.3 70B) ───────────────────────────────────────────────

export async function aiChat(
  messages: AIChatMessage[],
  systemPrompt?: string
): Promise<AIChatResponse> {
  const { data, error } = await supabase.functions.invoke<AIChatResponse>('ai-chat', {
    body: { messages, systemPrompt },
  });
  if (error) {
    const msg = await error?.context?.text?.();
    throw new Error(msg || error.message);
  }
  if (!data) throw new Error('No response from ai-chat');
  return data;
}

// ─── IMAGE (HuggingFace SDXL) ─────────────────────────────────────────────────

export async function aiGenerateImage(
  prompt: string,
  options?: { negative_prompt?: string; width?: number; height?: number }
): Promise<AIImageResponse> {
  const { data, error } = await supabase.functions.invoke<AIImageResponse>('ai-image', {
    body: { prompt, ...options },
  });
  if (error) {
    const msg = await error?.context?.text?.();
    throw new Error(msg || error.message);
  }
  if (!data) throw new Error('No response from ai-image');
  return data;
}

// ─── VOICE (HuggingFace Bark) ─────────────────────────────────────────────────

export async function aiGenerateVoice(
  text: string,
  voicePreset?: string
): Promise<AIVoiceResponse> {
  const { data, error } = await supabase.functions.invoke<AIVoiceResponse>('ai-voice', {
    body: { text, voice_preset: voicePreset },
  });
  if (error) {
    const msg = await error?.context?.text?.();
    throw new Error(msg || error.message);
  }
  if (!data) throw new Error('No response from ai-voice');
  return data;
}

// ─── MUSIC (HuggingFace MusicGen) ─────────────────────────────────────────────

export async function aiGenerateMusic(
  prompt: string,
  options?: { duration?: number; mode?: 'music' | 'melody' }
): Promise<AIMusicResponse> {
  const { data, error } = await supabase.functions.invoke<AIMusicResponse>('ai-music', {
    body: { prompt, ...options },
  });
  if (error) {
    const msg = await error?.context?.text?.();
    throw new Error(msg || error.message);
  }
  if (!data) throw new Error('No response from ai-music');
  return data;
}

// ─── VIDEO (HuggingFace Zeroscope) ───────────────────────────────────────────

export async function aiGenerateVideo(
  prompt: string,
  options?: { num_frames?: number; fps?: number }
): Promise<AIVideoResponse> {
  const { data, error } = await supabase.functions.invoke<AIVideoResponse>('ai-video', {
    body: { prompt, ...options },
  });
  if (error) {
    const msg = await error?.context?.text?.();
    throw new Error(msg || error.message);
  }
  if (!data) throw new Error('No response from ai-video');
  return data;
}

// ─── CLOUDINARY UPLOAD ────────────────────────────────────────────────────────

export async function uploadToCloudinary(
  file: string, // base64 data URL or remote URL
  options?: { resource_type?: 'image' | 'video' | 'raw' | 'auto'; folder?: string; public_id?: string }
): Promise<CloudinaryUploadResponse> {
  const { data, error } = await supabase.functions.invoke<CloudinaryUploadResponse>(
    'cloudinary-upload',
    { body: { file, ...options } }
  );
  if (error) {
    const msg = await error?.context?.text?.();
    throw new Error(msg || error.message);
  }
  if (!data) throw new Error('No response from cloudinary-upload');
  return data;
}

// ─── SHORT ALIASES (used by studio pages) ────────────────────────────────────
export const aiImage = (prompt: string, style?: string) =>
  aiGenerateImage(prompt, style ? { negative_prompt: `ugly, ${style} opposite` } : undefined);
export const aiVoice = (text: string, preset?: string) => aiGenerateVoice(text, preset);
export const aiMusic = (prompt: string, _mode?: string, _ref?: unknown, duration?: number) =>
  aiGenerateMusic(prompt, { duration, mode: 'music' });

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Map creation type to the correct AI function */
export async function generateByType(
  type: string,
  prompt: string
): Promise<{ url: string; type: 'image' | 'audio' | 'video'; provider: string; model: string }> {
  switch (type) {
    case 'image': {
      const res = await aiGenerateImage(prompt);
      return { url: res.image_url, type: 'image', provider: res.provider, model: res.model };
    }
    case 'voice': {
      const res = await aiGenerateVoice(prompt);
      return { url: res.audio_url, type: 'audio', provider: res.provider, model: res.model };
    }
    case 'music':
    case 'song': {
      const res = await aiGenerateMusic(prompt, { mode: 'music' });
      return { url: res.audio_url, type: 'audio', provider: res.provider, model: res.model };
    }
    case 'melody': {
      const res = await aiGenerateMusic(prompt, { mode: 'melody' });
      return { url: res.audio_url, type: 'audio', provider: res.provider, model: res.model };
    }
    case 'video':
    case 'cinema': {
      const res = await aiGenerateVideo(prompt);
      return { url: res.video_url, type: 'video', provider: res.provider, model: res.model };
    }
    default: {
      const res = await aiGenerateImage(prompt);
      return { url: res.image_url, type: 'image', provider: res.provider, model: res.model };
    }
  }
}
