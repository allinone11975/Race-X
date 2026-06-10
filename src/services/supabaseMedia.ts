/**
 * RACE-X Supabase Media Integration
 * Links media-generation functions to tools_config table
 * Checks user diamond balance before every 'Create' action
 */
import { supabase } from '@/db/supabase';
import { uploadAudio, uploadVideo, uploadImage } from './cloudinary';
import type { CloudinaryResult } from './cloudinary';

export interface ToolConfig {
  tool_name: string;
  diamond_cost: number;
  is_enabled: boolean;
  required_level: number;
  config_data?: Record<string, unknown>;
}

export interface CreateMediaParams {
  userId: string;
  toolName: string;
  prompt: string;
  mediaUrl: string;
  mediaType: 'audio' | 'video' | 'image';
  metadata?: Record<string, unknown>;
}

// ─── Fetch tool config from Supabase ──────────────────────────────────────────

export async function getToolConfig(toolName: string): Promise<ToolConfig | null> {
  try {
    const { data, error } = await supabase
      .from('tools_config')
      .select('tool_name, diamond_cost, is_enabled, required_level, config_data')
      .eq('tool_name', toolName)
      .maybeSingle();

    if (error || !data) return null;
    return data as ToolConfig;
  } catch {
    return null;
  }
}

// ─── Diamond balance check ─────────────────────────────────────────────────────

export interface DiamondCheckResult {
  allowed: boolean;
  currentBalance: number;
  requiredBalance: number;
  shortfall: number;
}

export async function checkDiamondBalance(
  userId: string,
  toolName: string
): Promise<DiamondCheckResult> {
  // Fetch tool cost
  const toolConfig = await getToolConfig(toolName);
  const required = toolConfig?.diamond_cost ?? 0;

  // Fetch user balance
  const { data: userData } = await supabase
    .from('users')
    .select('diamonds')
    .eq('id', userId)
    .maybeSingle();

  const current = userData?.diamonds ?? 0;

  return {
    allowed: current >= required,
    currentBalance: current,
    requiredBalance: required,
    shortfall: Math.max(0, required - current),
  };
}

// ─── Deduct diamonds for a tool use ───────────────────────────────────────────

export async function deductDiamondsForTool(
  userId: string,
  toolName: string
): Promise<{ success: boolean; newBalance: number; amountDeducted: number }> {
  const toolConfig = await getToolConfig(toolName);
  const cost = toolConfig?.diamond_cost ?? 0;

  if (cost === 0) return { success: true, newBalance: 0, amountDeducted: 0 };

  const { data: userData } = await supabase
    .from('users')
    .select('diamonds')
    .eq('id', userId)
    .maybeSingle();

  const current = userData?.diamonds ?? 0;
  if (current < cost) return { success: false, newBalance: current, amountDeducted: 0 };

  const newBalance = current - cost;

  const { error } = await supabase
    .from('users')
    .update({ diamonds: newBalance })
    .eq('id', userId);

  if (error) return { success: false, newBalance: current, amountDeducted: 0 };

  // Log transaction
  await supabase.from('transaction_ledger').insert({
    user_id: userId,
    action_type: `TOOL_USE:${toolName}`,
    diamond_balance_before: current,
    diamond_balance_after: newBalance,
    transaction_category: 'spent',
    input_parameters: { tool: toolName },
  });

  // Update tools_config usage stats
  try {
    await supabase.from('tools_config').upsert({
      tool_name: toolName,
      config_data: { last_used_by: userId, last_used_at: new Date().toISOString() },
    }, { onConflict: 'tool_name' });
  } catch { /* optional stat update */ }

  return { success: true, newBalance, amountDeducted: cost };
}

// ─── Main: Create media with diamond check + Cloudinary watermark ─────────────

export async function createMedia(params: CreateMediaParams): Promise<{
  success: boolean;
  cloudinaryResult?: CloudinaryResult;
  error?: string;
  diamondsUsed: number;
}> {
  const { userId, toolName, prompt, mediaUrl, mediaType, metadata } = params;

  // 1. Check tool is enabled + diamond gate
  const check = await checkDiamondBalance(userId, toolName);
  if (!check.allowed) {
    return {
      success: false,
      error: `Insufficient diamonds. Need ${check.requiredBalance} 💎, have ${check.currentBalance} 💎.`,
      diamondsUsed: 0,
    };
  }

  // 2. Deduct diamonds
  const deduction = await deductDiamondsForTool(userId, toolName);
  if (!deduction.success) {
    return { success: false, error: 'Diamond deduction failed.', diamondsUsed: 0 };
  }

  // 3. Upload to Cloudinary with watermark
  let cloudinaryResult: CloudinaryResult | undefined;
  try {
    if (mediaType === 'audio') {
      cloudinaryResult = await uploadAudio(mediaUrl);
    } else if (mediaType === 'video') {
      cloudinaryResult = await uploadVideo(mediaUrl);
    } else {
      cloudinaryResult = await uploadImage(mediaUrl);
    }
  } catch (err) {
    // Cloudinary failed — still log the creation but use original URL
    console.warn('[createMedia] Cloudinary upload failed:', err);
  }

  // 4. Save to ai_generated_results
  try {
    await supabase.from('ai_generated_results').insert({
      user_id: userId,
      session_id: `${toolName}-${Date.now()}`,
      result_type: mediaType,
      result_url: cloudinaryResult?.secure_url ?? mediaUrl,
      is_saved: true,
      is_published: false,
      metadata: {
        tool: toolName,
        prompt: prompt.slice(0, 200),
        cloudinary_public_id: cloudinaryResult?.public_id,
        watermarked: cloudinaryResult?.watermarked ?? false,
        ...metadata,
      },
    });
  } catch { /* optional result logging */ }

  return {
    success: true,
    cloudinaryResult,
    diamondsUsed: deduction.amountDeducted,
  };
}

// ─── Seed tools_config with defaults ──────────────────────────────────────────
// Call once to populate Supabase with default tool costs

export async function seedToolsConfig(): Promise<void> {
  const defaults: Omit<ToolConfig, 'config_data'>[] = [
    { tool_name: 'ai-lyrics',        diamond_cost: 1,  is_enabled: true, required_level: 1  },
    { tool_name: 'ai-music-preview', diamond_cost: 3,  is_enabled: true, required_level: 1  },
    { tool_name: 'ai-music-hifi',    diamond_cost: 8,  is_enabled: true, required_level: 3  },
    { tool_name: 'ai-voice',         diamond_cost: 5,  is_enabled: true, required_level: 2  },
    { tool_name: 'ai-image-preview', diamond_cost: 0,  is_enabled: true, required_level: 1  },
    { tool_name: 'ai-image-hifi',    diamond_cost: 5,  is_enabled: true, required_level: 2  },
    { tool_name: 'ai-video',         diamond_cost: 15, is_enabled: true, required_level: 5  },
    { tool_name: 'ai-storyboard',    diamond_cost: 10, is_enabled: true, required_level: 4  },
    { tool_name: 'export-mp3',       diamond_cost: 2,  is_enabled: true, required_level: 1  },
    { tool_name: 'export-mp4',       diamond_cost: 5,  is_enabled: true, required_level: 2  },
    { tool_name: 'media-factory',    diamond_cost: 20, is_enabled: true, required_level: 5  },
  ];

  for (const tool of defaults) {
    try {
      await supabase.from('tools_config').upsert(tool, { onConflict: 'tool_name' });
    } catch { /* seed is optional */ }
  }
}
