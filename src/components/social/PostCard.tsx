/**
 * RACE-X · PostCard — Facebook-style post with reactions
 */
import { useState, useRef } from 'react';
import React from 'react';
import { MessageSquare, Share2, Bookmark, MoreHorizontal, Globe, Users, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import RxBadge from '@/components/common/RxBadge';
import { toast } from 'sonner';
import { toggleLike } from '@/db/api';
import type { Post } from '@/types/race-x';

const REACTIONS = [
  { key: 'like',  label: 'Like',  emoji: '👍', color: 'text-blue-400' },
  { key: 'love',  label: 'Love',  emoji: '❤️', color: 'text-red-400' },
  { key: 'haha',  label: 'Haha',  emoji: '😂', color: 'text-yellow-400' },
  { key: 'wow',   label: 'Wow',   emoji: '😮', color: 'text-yellow-300' },
  { key: 'sad',   label: 'Sad',   emoji: '😢', color: 'text-blue-300' },
  { key: 'angry', label: 'Angry', emoji: '😡', color: 'text-orange-500' },
];

const PRIVACY_ICON: Record<string, React.ReactNode> = {
  public:        <Globe className="w-3 h-3" />,
  friends:       <Users className="w-3 h-3" />,
  only_me:       <Lock className="w-3 h-3" />,
  close_friends: <Users className="w-3 h-3" />,
};

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  onLikeChanged?: (postId: string, newCount: number) => void;
}

export default function PostCard({ post, currentUserId, onLikeChanged }: PostCardProps) {
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(post.likes_count ?? 0);
  const [showReactions, setShowReactions] = useState(false);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [saved, setSaved] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleReaction = async (key: string) => {
    setShowReactions(false);
    const prev = myReaction;
    const isRemoving = prev === key;
    setMyReaction(isRemoving ? null : key);
    const delta = isRemoving ? -1 : prev ? 0 : 1;
    const newCount = likeCount + delta;
    setLikeCount(Math.max(0, newCount));
    if (currentUserId) {
      await toggleLike(currentUserId, post.id);
      onLikeChanged?.(post.id, Math.max(0, newCount));
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.origin + '/post/' + post.id)
      .then(() => toast.success('Link copied to clipboard!'))
      .catch(() => toast.info('Share: ' + post.id));
  };

  const activeReaction = REACTIONS.find(r => r.key === myReaction);

  return (
    <div className="bg-[#1C1C27] rounded-2xl border border-white/8 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="w-10 h-10 ring-2 ring-[#00F2FF]/40">
              <AvatarImage src={post.user?.avatar_url ?? ''} />
              <AvatarFallback className="bg-gradient-to-br from-[#00F2FF]/30 to-[#BC13FE]/30 text-white font-bold text-sm">
                {(post.user?.username ?? 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5">
              <RxBadge label="RX" className="text-[7px] px-1 py-0" />
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">
              {post.user?.username ?? 'Anonymous'}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span>{new Date(post.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              <span>·</span>
              {PRIVACY_ICON[post.privacy] ?? <Globe className="w-3 h-3" />}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => {}}>
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      {post.content && (
        <p className="px-4 pb-3 text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
      )}

      {/* Media */}
      {Array.isArray(post.media_urls) && post.media_urls.length > 0 && (
        <div className={`grid gap-0.5 ${post.media_urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {post.media_urls.slice(0, 4).map((url, i) => (
            <div key={i} className="relative">
              <img
                src={url}
                alt="post media"
                className="w-full object-cover aspect-square bg-white/5"
              />
              {i === 3 && post.media_urls!.length > 4 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">+{post.media_urls!.length - 4}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reaction + comment count */}
      {(likeCount > 0 || post.comments_count > 0) && (
        <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground">
          {likeCount > 0 && (
            <span className="flex items-center gap-1">
              <span>👍❤️</span> {likeCount}
            </span>
          )}
          {post.comments_count > 0 && (
            <span className="ml-auto">{post.comments_count} comments</span>
          )}
        </div>
      )}

      <Separator className="bg-white/5" />

      {/* Action Buttons */}
      <div className="flex items-center px-2 py-1">
        {/* Like / Reaction */}
        <div
          className="relative flex-1"
          onMouseEnter={() => { hoverTimer.current = setTimeout(() => setShowReactions(true), 500); }}
          onMouseLeave={() => { if (hoverTimer.current) clearTimeout(hoverTimer.current); setShowReactions(false); }}
        >
          {/* Reaction picker */}
          {showReactions && (
            <div className="absolute bottom-full left-0 mb-2 flex gap-1 bg-[#0A0A0F] border border-white/10 rounded-full px-2 py-1 shadow-xl z-20">
              {REACTIONS.map(r => (
                <button
                  key={r.key}
                  onClick={() => handleReaction(r.key)}
                  title={r.label}
                  className="text-xl hover:scale-125 transition-transform duration-150 select-none"
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleReaction('like')}
            className={`w-full gap-1.5 text-xs font-medium ${activeReaction ? activeReaction.color : 'text-muted-foreground'}`}
          >
            <span className="text-base">{activeReaction ? activeReaction.emoji : '👍'}</span>
            {activeReaction ? activeReaction.label : 'Like'}
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCommentBox(v => !v)}
          className="flex-1 gap-1.5 text-xs font-medium text-muted-foreground"
        >
          <MessageSquare className="w-4 h-4" /> Comment
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleShare}
          className="flex-1 gap-1.5 text-xs font-medium text-muted-foreground"
        >
          <Share2 className="w-4 h-4" /> Share
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => { setSaved(v => !v); toast.success(saved ? 'Unsaved' : 'Saved to collection'); }}
          className={`h-8 w-8 shrink-0 ${saved ? 'text-[#00F2FF]' : 'text-muted-foreground'}`}
        >
          <Bookmark className={`w-4 h-4 ${saved ? 'fill-[#00F2FF]' : ''}`} />
        </Button>
      </div>

      {/* Comment Box */}
      {showCommentBox && (
        <div className="px-4 pb-3">
          <Separator className="bg-white/5 mb-3" />
          <div className="flex gap-2">
            <Avatar className="w-7 h-7 shrink-0">
              <AvatarFallback className="bg-[#00F2FF]/20 text-[#00F2FF] text-xs">U</AvatarFallback>
            </Avatar>
            <input
              type="text"
              placeholder="Write a comment…"
              className="flex-1 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs text-white placeholder:text-muted-foreground outline-none focus:border-[#00F2FF]/40"
            />
          </div>
        </div>
      )}
    </div>
  );
}
