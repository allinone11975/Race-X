import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Search, Home, PlusCircle, Film, MessageCircle, User, Heart, MessageSquare, Share2, Bookmark } from 'lucide-react';
import { RxBadge } from '@/components/common/RxBadge';
import { getPosts, toggleLike } from '@/db/api';
import type { Post } from '@/types/race-x';
import { motion } from 'motion/react';

export default function RxSocialHome() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem('race-x-user') || '{}');

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    const fetchedPosts = await getPosts(20, 0);
    setPosts(fetchedPosts);
    setLoading(false);
  };

  const handleLike = async (postId: string) => {
    await toggleLike(user.id, postId);
    // Refresh posts
    loadPosts();
  };

  return (
    <div className="min-h-screen carbon-fiber flex flex-col">
      {/* Top Navigation */}
      <div className="glass-strong border-b border-border p-4 flex items-center justify-between sticky top-0 z-50">
        <h1 className="text-2xl font-bold gradient-text">RACE-X</h1>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/rx-social/notifications')}
          >
            <Bell className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/rx-social/search')}
          >
            <Search className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Stories Row */}
      <div className="glass border-b border-border p-4">
        <ScrollArea className="w-full">
          <div className="flex gap-4">
            <Button
              onClick={() => navigate('/rx-studio/editor')}
              className="flex-shrink-0 w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center"
            >
              <PlusCircle className="w-8 h-8" />
            </Button>
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 border-2 border-primary"
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Feed */}
      <ScrollArea className="flex-1">
        <div className="max-w-2xl mx-auto p-4 space-y-6">
          {/* What's on your mind */}
          <div className="glass-strong rounded-xl p-4 border border-border">
            <Button
              onClick={() => navigate('/rx-studio/editor')}
              variant="outline"
              className="w-full justify-start text-muted-foreground"
            >
              What's on your mind?
            </Button>
          </div>

          {/* Posts */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading posts...</div>
          ) : posts.length > 0 ? (
            posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="relative glass-strong rounded-xl p-6 border border-border"
              >
                <RxBadge />

                {/* Post Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                    {post.user?.username?.[0] || 'U'}
                  </div>
                  <div>
                    <h3 className="font-semibold">{post.user?.username || 'User'}</h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(post.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Post Content */}
                {post.content && <p className="mb-4">{post.content}</p>}

                {/* Post Media */}
                {post.media_urls && post.media_urls.length > 0 && (
                  <div className="mb-4 rounded-lg overflow-hidden bg-muted aspect-video flex items-center justify-center">
                    <span className="text-muted-foreground">Media Content</span>
                  </div>
                )}

                {/* Post Actions */}
                <div className="flex items-center gap-6 pt-4 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(post.id)}
                    className="gap-2"
                  >
                    <Heart className="w-5 h-5" />
                    {post.likes_count}
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-2" onClick={() => {}}>
                    <MessageSquare className="w-5 h-5" />
                    {post.comments_count}
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-2" onClick={() => {}}>
                    <Share2 className="w-5 h-5" />
                    {post.shares_count}
                  </Button>
                  <Button variant="ghost" size="sm" className="ml-auto" onClick={() => {}}>
                    <Bookmark className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No posts yet. Be the first to create!
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Bottom Navigation */}
      <div className="glass-strong border-t border-border p-4 flex justify-around sticky bottom-0">
        <Button variant="ghost" size="icon" onClick={() => navigate('/rx-social')}>
          <Home className="w-6 h-6 text-primary" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => navigate('/rx-studio/editor')}>
          <PlusCircle className="w-6 h-6" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => navigate('/rx-social/reels')}>
          <Film className="w-6 h-6" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => navigate('/rx-social/messages')}>
          <MessageCircle className="w-6 h-6" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => navigate('/rx-social/profile')}>
          <User className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
