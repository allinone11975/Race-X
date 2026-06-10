/**
 * RACE-X Unified AI Gateway Client
 * Multi-provider rotation: Groq → OpenRouter → Google AI Studio → Supabase fallback
 * Uses locally stored API keys when available for direct calls (bypasses edge functions)
 */
import { supabase } from '@/db/supabase';

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIChatResponse {
  reply: string;
  model: string;
  provider: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface AIImageResponse {
  image_url: string;
  provider: string;
  model: string;
  prompt: string;
  retry_after?: number;
}

export interface AIVoiceResponse {
  audio_url: string;
  provider: string;
  model: string;
  voice_preset: string;
  retry_after?: number;
}

export interface AIMusicResponse {
  audio_url: string;
  provider: string;
  model: string;
  mode: string;
  retry_after?: number;
}

export interface AIVideoResponse {
  video_url: string;
  provider: string;
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

// ─── Provider rotation helpers ─────────────────────────────────────────────────

function getStoredKeys() {
  try {
    const stored = localStorage.getItem('race-x-store');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.state?.apiKeys ?? null;
  } catch {
    return null;
  }
}

let providerIndex = 0;

// ─── Direct Groq API call ──────────────────────────────────────────────────────

async function chatViaGroq(
  messages: AIChatMessage[],
  systemPrompt: string | undefined,
  apiKey: string
): Promise<AIChatResponse> {
  const body = {
    model: 'llama-3.3-70b-versatile',
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages,
    ],
    max_tokens: 1024,
    temperature: 0.7,
  };
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = await res.json();
  return {
    reply: data.choices[0].message.content,
    model: data.model,
    provider: 'groq',
    usage: data.usage,
  };
}

// ─── Direct OpenRouter API call ────────────────────────────────────────────────

async function chatViaOpenRouter(
  messages: AIChatMessage[],
  systemPrompt: string | undefined,
  apiKey: string
): Promise<AIChatResponse> {
  const body = {
    model: 'meta-llama/llama-3.3-70b-instruct',
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages,
    ],
    max_tokens: 1024,
  };
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'RACE-X Omniverse',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const data = await res.json();
  return {
    reply: data.choices[0].message.content,
    model: data.model,
    provider: 'openrouter',
    usage: data.usage,
  };
}

// ─── Direct Google AI Studio call ─────────────────────────────────────────────

async function chatViaGoogleAI(
  messages: AIChatMessage[],
  systemPrompt: string | undefined,
  apiKey: string
): Promise<AIChatResponse> {
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const body = {
    ...(systemPrompt ? { systemInstruction: { parts: [{ text: systemPrompt }] } } : {}),
    contents,
    generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
  };
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error(`Google AI ${res.status}`);
  const data = await res.json();
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return { reply, model: 'gemini-2.0-flash', provider: 'google-ai' };
}

// ─── CHAT with multi-provider rotation ────────────────────────────────────────

export async function aiChat(
  messages: AIChatMessage[],
  systemPrompt?: string
): Promise<AIChatResponse> {
  const keys = getStoredKeys();

  // Try providers with stored keys in rotation order
  const orderedProviders = [
    { name: 'groq', key: keys?.groq, fn: chatViaGroq },
    { name: 'openRouter', key: keys?.openRouter, fn: chatViaOpenRouter },
    { name: 'googleAI', key: keys?.googleAI, fn: chatViaGoogleAI },
  ];

  // Start from current rotation index
  const startIdx = providerIndex % orderedProviders.length;
  const rotated = [
    ...orderedProviders.slice(startIdx),
    ...orderedProviders.slice(0, startIdx),
  ];

  for (const provider of rotated) {
    if (provider.key) {
      try {
        providerIndex++;
        return await provider.fn(messages, systemPrompt, provider.key);
      } catch (err) {
        console.warn(`[AI Gateway] ${provider.name} failed, trying next…`, err);
      }
    }
  }

  // Fallback to Supabase edge function
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

// ─── IMAGE (HuggingFace SDXL via Supabase) ────────────────────────────────────

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

// ─── VOICE (HuggingFace Bark via Supabase) ────────────────────────────────────

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

// ─── MUSIC (HuggingFace MusicGen via Supabase) ────────────────────────────────

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

// ─── VIDEO (HuggingFace Zeroscope via Supabase) ───────────────────────────────

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

// ─── CLOUDINARY UPLOAD with watermark ─────────────────────────────────────────

export async function uploadToCloudinary(
  file: string,
  options?: {
    resource_type?: 'image' | 'video' | 'raw' | 'auto';
    folder?: string;
    public_id?: string;
    watermark?: boolean;
  }
): Promise<CloudinaryUploadResponse> {
  const keys = getStoredKeys();

  // Direct Cloudinary upload if keys are available
  if (keys?.cloudinaryCloud && keys?.cloudinaryPreset) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', keys.cloudinaryPreset);
    if (options?.folder) formData.append('folder', options.folder ?? 'race-x');
    if (options?.watermark) {
      // Overlay 'Race-X' text watermark via Cloudinary transformation
      formData.append(
        'transformation',
        JSON.stringify([{ overlay: { font_family: 'Arial', font_size: 28, text: 'RACE-X' }, gravity: 'south_east', x: 10, y: 10, color: 'white', opacity: 70 }])
      );
    }
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${keys.cloudinaryCloud}/${options?.resource_type ?? 'auto'}/upload`,
      { method: 'POST', body: formData }
    );
    if (!res.ok) throw new Error(`Cloudinary ${res.status}`);
    const data = await res.json();
    return {
      secure_url: data.secure_url,
      public_id: data.public_id,
      resource_type: data.resource_type,
      format: data.format,
      provider: 'cloudinary',
    };
  }

  // Supabase edge function fallback
  const { data, error } = await supabase.functions.invoke<CloudinaryUploadResponse>(
    'cloudinary-upload',
    { body: { file, ...options, watermark: true } }
  );
  if (error) {
    const msg = await error?.context?.text?.();
    throw new Error(msg || error.message);
  }
  if (!data) throw new Error('No response from cloudinary-upload');
  return data;
}

// ─── SHORT ALIASES ────────────────────────────────────────────────────────────
export const aiImage = (prompt: string, style?: string) =>
  aiGenerateImage(prompt, style ? { negative_prompt: `ugly, ${style} opposite` } : undefined);
export const aiVoice = (text: string, preset?: string) => aiGenerateVoice(text, preset);
export const aiMusic = (prompt: string, _mode?: string, _ref?: unknown, duration?: number) =>
  aiGenerateMusic(prompt, { duration, mode: 'music' });

// ─── GENERATE BY TYPE ─────────────────────────────────────────────────────────
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
