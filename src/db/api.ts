// Database API Layer for RACE-X
import { supabase } from './supabase';
import type { User, Post, Reel, Story, AIChatSession, AIGeneratedResult } from '@/types/race-x';

// Master admin phone — always gets is_admin = true regardless of DB value
const MASTER_ADMIN_PHONE = '8011692945';

function applyMasterAdmin(user: User | null): User | null {
  if (!user) return null;
  if (user.phone_number === MASTER_ADMIN_PHONE) {
    return { ...user, is_admin: true };
  }
  return user;
}

// User Operations
export async function getUserByPhone(phoneNumber: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('phone_number', phoneNumber)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return applyMasterAdmin(data);
}

export async function getUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return applyMasterAdmin(data);
}

export async function createUser(phoneNumber: string): Promise<User | null> {
  // Master admin always gets max privileges
  const isMasterAdmin = phoneNumber === MASTER_ADMIN_PHONE;

  // Check if it's the first 10 users
  const { count, error: countError } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error counting users:', countError);
  }

  const isFirst10 = (count || 0) < 10;
  const initialLevel = isMasterAdmin || isFirst10 ? 99 : 1;
  const initialPoints = isMasterAdmin || isFirst10 ? 9999 : 50;
  const initialDiamonds = isMasterAdmin || isFirst10 ? 9999 : 10;

  const { data, error } = await supabase
    .from('users')
    .insert({
      phone_number: phoneNumber,
      user_level: initialLevel,
      rx_points: initialPoints,
      diamonds: initialDiamonds,
      is_admin: isMasterAdmin ? true : undefined,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    return null;
  }

  // Log transaction
  await logTransaction({
    user_id: data.id,
    action_type: 'USER_REGISTRATION',
    diamond_balance_before: 0,
    diamond_balance_after: initialDiamonds,
  });

  return applyMasterAdmin(data);
}

export async function updateUserDiamonds(userId: string, amount: number, type: 'grant' | 'deduct'): Promise<boolean> {
  const user = await getUserById(userId);
  if (!user) return false;

  const newBalance = type === 'grant' ? user.diamonds + amount : user.diamonds - amount;

  if (newBalance < 0) return false;

  const { error } = await supabase
    .from('users')
    .update({ diamonds: newBalance })
    .eq('id', userId);

  if (error) {
    console.error('Error updating diamonds:', error);
    return false;
  }

  // Log transaction
  await logTransaction({
    user_id: userId,
    action_type: type === 'grant' ? 'DIAMOND_GRANT' : 'DIAMOND_DEDUCT',
    diamond_balance_before: user.diamonds,
    diamond_balance_after: newBalance,
  });

  return true;
}

export async function verifyDiamondBalance(userId: string, requiredAmount: number): Promise<boolean> {
  const user = await getUserById(userId);
  if (!user) return false;
  return user.diamonds >= requiredAmount;
}

// Transaction Ledger
export async function logTransaction(params: {
  user_id: string;
  action_type: string;
  input_parameters?: Record<string, unknown>;
  output_result?: Record<string, unknown>;
  diamond_balance_before?: number;
  diamond_balance_after?: number;
  api_key_handshake_status?: string;
  safety_scan_result?: string;
}): Promise<void> {
  await supabase.from('transaction_ledger').insert(params);
}

// Posts Operations
export async function getPosts(limit = 20, offset = 0): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*, user:users(*)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching posts:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

export async function createPost(params: {
  user_id: string;
  content?: string;
  media_urls?: string[];
  post_type?: string;
  privacy?: string;
}): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .insert(params)
    .select('*, user:users(*)')
    .single();

  if (error) {
    console.error('Error creating post:', error);
    return null;
  }

  return data;
}

export async function toggleLike(userId: string, postId?: string, reelId?: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', userId)
    .eq(postId ? 'post_id' : 'reel_id', postId || reelId)
    .maybeSingle();

  if (existing) {
    await supabase.from('likes').delete().eq('id', existing.id);
    if (postId) {
      await supabase.rpc('decrement_post_likes', { post_id: postId });
    } else if (reelId) {
      await supabase.rpc('decrement_reel_likes', { reel_id: reelId });
    }
    return false;
  }

  await supabase.from('likes').insert({ user_id: userId, post_id: postId, reel_id: reelId });

  if (postId) {
    await supabase.rpc('increment_post_likes', { post_id: postId });
  } else if (reelId) {
    await supabase.rpc('increment_reel_likes', { reel_id: reelId });
  }

  return true;
}

// Reels Operations
export async function getReels(limit = 20, offset = 0): Promise<Reel[]> {
  const { data, error } = await supabase
    .from('reels')
    .select('*, user:users(*)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching reels:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

export async function createReel(params: {
  user_id: string;
  video_url: string;
  thumbnail_url?: string;
  caption?: string;
  audio_url?: string;
}): Promise<Reel | null> {
  const { data, error } = await supabase
    .from('reels')
    .insert(params)
    .select('*, user:users(*)')
    .single();

  if (error) {
    console.error('Error creating reel:', error);
    return null;
  }

  return data;
}

// Stories Operations
export async function getStories(): Promise<Story[]> {
  const { data, error } = await supabase
    .from('stories')
    .select('*, user:users(*)')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching stories:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

export async function createStory(params: {
  user_id: string;
  media_url: string;
  media_type: 'photo' | 'video';
}): Promise<Story | null> {
  const { data, error } = await supabase
    .from('stories')
    .insert(params)
    .select('*, user:users(*)')
    .single();

  if (error) {
    console.error('Error creating story:', error);
    return null;
  }

  return data;
}

// AI Chat Sessions
export async function createAIChatSession(userId: string, creationType: string): Promise<AIChatSession | null> {
  const { data, error } = await supabase
    .from('ai_chat_sessions')
    .insert({ user_id: userId, creation_type: creationType, messages: [] })
    .select()
    .single();

  if (error) {
    console.error('Error creating AI chat session:', error);
    return null;
  }

  return data;
}

export async function updateAIChatSession(sessionId: string, messages: unknown[]): Promise<boolean> {
  const { error } = await supabase
    .from('ai_chat_sessions')
    .update({ messages, updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) {
    console.error('Error updating AI chat session:', error);
    return false;
  }

  return true;
}

export async function saveAIResult(params: {
  user_id: string;
  session_id: string;
  result_type: string;
  result_url: string;
  metadata?: Record<string, unknown>;
}): Promise<AIGeneratedResult | null> {
  const { data, error } = await supabase
    .from('ai_generated_results')
    .insert({ ...params, is_saved: true })
    .select()
    .single();

  if (error) {
    console.error('Error saving AI result:', error);
    return null;
  }

  return data;
}

export async function publishAIResult(resultId: string): Promise<boolean> {
  const { error } = await supabase
    .from('ai_generated_results')
    .update({ is_published: true })
    .eq('id', resultId);

  if (error) {
    console.error('Error publishing AI result:', error);
    return false;
  }

  return true;
}

// Followers
export async function followUser(followerId: string, followingId: string): Promise<boolean> {
  const { error } = await supabase
    .from('followers')
    .insert({ follower_id: followerId, following_id: followingId });

  if (error) {
    console.error('Error following user:', error);
    return false;
  }

  return true;
}

export async function unfollowUser(followerId: string, followingId: string): Promise<boolean> {
  const { error } = await supabase
    .from('followers')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);

  if (error) {
    console.error('Error unfollowing user:', error);
    return false;
  }

  return true;
}

export async function getFollowersCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('followers')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId);

  if (error) return 0;
  return count || 0;
}

export async function getFollowingCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('followers')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', userId);

  if (error) return 0;
  return count || 0;
}
