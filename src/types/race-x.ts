// RACE-X Core Types

export interface User {
  id: string;
  phone_number: string;
  username?: string;
  avatar_url?: string;
  cover_photo_url?: string;
  bio?: string;
  website?: string;
  user_level: number;
  rx_points: number;
  diamonds: number;
  is_admin: boolean;
  referral_code?: string;
  referred_by?: string;
  successful_referrals: number;
  created_at: string;
  updated_at: string;
}

export interface TransactionLedger {
  id: string;
  user_id: string;
  action_type: string;
  input_parameters?: Record<string, unknown>;
  output_result?: Record<string, unknown>;
  diamond_balance_before?: number;
  diamond_balance_after?: number;
  transaction_category?: 'earned' | 'spent' | 'gifted' | 'received' | 'referral';
  recipient_user_id?: string;
  api_key_handshake_status?: string;
  safety_scan_result?: string;
  created_at: string;
}

export interface KycSubmission {
  id: string;
  user_id: string;
  full_name: string;
  date_of_birth?: string;
  address?: string;
  id_type?: string;
  id_number?: string;
  id_front_url?: string;
  id_back_url?: string;
  selfie_url?: string;
  status: 'pending' | 'verified' | 'rejected';
  review_notes?: string;
  submitted_at: string;
  reviewed_at?: string;
}

export interface MarketplaceListing {
  id: string;
  creator_id: string;
  asset_type: 'image' | 'music' | 'character' | 'template' | 'preset' | 'video';
  title: string;
  description?: string;
  price_diamonds: number;
  asset_url?: string;
  thumbnail_url?: string;
  tags?: string[];
  sales_count: number;
  is_active: boolean;
  created_at: string;
}

export interface CreatorStats {
  id: string;
  user_id: string;
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_earnings_diamonds: number;
  ranking_score: number;
  ranking_badge: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
  updated_at: string;
}

export interface VaultFile {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  file_size: number;
  folder_path: string;
  cloudinary_public_id?: string;
  created_at: string;
}

export interface RenderJob {
  id: string;
  user_id: string;
  project_name: string;
  job_type: 'video' | 'image' | 'audio' | 'export';
  status: 'queued' | 'rendering' | 'completed' | 'failed';
  progress_percentage: number;
  output_url?: string;
  error_message?: string;
  priority: number;
  submitted_at: string;
  completed_at?: string;
}

export interface FestivalThemeConfig {
  id: string;
  theme_name: string;
  display_name: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  overlay_type?: string;
  is_active: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  content: string;
  category: 'ai_complete' | 'social' | 'system';
  read_status: boolean;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  content?: string;
  media_urls?: string[];
  post_type: 'text' | 'photo' | 'video' | 'link' | 'carousel';
  privacy: 'public' | 'friends' | 'close_friends' | 'only_me';
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface Reel {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url?: string;
  caption?: string;
  audio_url?: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  created_at: string;
  user?: User;
}

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'photo' | 'video';
  viewers: string[];
  expires_at: string;
  created_at: string;
  user?: User;
}

export interface Comment {
  id: string;
  user_id: string;
  post_id?: string;
  reel_id?: string;
  content: string;
  likes_count: number;
  created_at: string;
  user?: User;
}

export interface Like {
  id: string;
  user_id: string;
  post_id?: string;
  reel_id?: string;
  comment_id?: string;
  created_at: string;
}

export interface Follower {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content?: string;
  media_url?: string;
  is_read: boolean;
  created_at: string;
  sender?: User;
  receiver?: User;
}

export interface AIChatSession {
  id: string;
  user_id: string;
  creation_type: 'image' | 'voice' | 'cinema' | 'melody' | 'music' | 'video' | 'song';
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AIGeneratedResult {
  id: string;
  user_id: string;
  session_id: string;
  result_type: string;
  result_url: string;
  metadata?: Record<string, unknown>;
  is_saved: boolean;
  is_published: boolean;
  created_at: string;
}

export interface CastCharacter {
  id: string;
  user_id: string;
  character_name?: string;
  reference_photo_url: string;
  character_clone_url?: string;
  character_type: 'lead' | 'secondary';
  created_at: string;
}

export interface VocalClip {
  id: string;
  user_id: string;
  clip_name?: string;
  script: string;
  audio_url: string;
  duration?: number;
  created_at: string;
}

export interface CinemaProject {
  id: string;
  user_id: string;
  project_name?: string;
  characters: string[];
  vocals: string[];
  music: string[];
  final_video_url?: string;
  status: 'draft' | 'processing' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface APIConfiguration {
  id: string;
  api_name: string;
  api_key: string;
  api_endpoint?: string;
  api_type?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  content: string;
  is_read: boolean;
  related_user_id?: string;
  related_post_id?: string;
  created_at: string;
}

export interface AITool {
  id: number;
  name: string;
  description: string;
  category: 'IMAGE_AI' | 'VIDEO_AI' | 'AUDIO_AI' | 'WRITING_AI' | 'ADVANCED_AI';
  required_level: number;
  diamond_cost: number;
  icon: string;
}

export interface RailwayAPIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DiamondTransaction {
  user_id: string;
  amount: number;
  type: 'grant' | 'deduct';
  reason: string;
}

export interface SafetyScanResult {
  is_safe: boolean;
  violations: string[];
  confidence: number;
}

export const CREATION_TYPES = {
  IMAGE: 'image',
  VOICE: 'voice',
  CINEMA: 'cinema',
  MELODY: 'melody',
  MUSIC: 'music',
  VIDEO: 'video',
  SONG: 'song',
} as const;

export const AI_TOOL_CATEGORIES = {
  IMAGE_AI: 'IMAGE_AI',
  VIDEO_AI: 'VIDEO_AI',
  AUDIO_AI: 'AUDIO_AI',
  WRITING_AI: 'WRITING_AI',
  ADVANCED_AI: 'ADVANCED_AI',
} as const;
