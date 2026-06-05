/**
 * RACE-X · CreatePostModal — Facebook-style composer
 */
import { useState, useRef } from 'react';
import { Image, Video, Smile, MapPin, X, Globe, Users, Lock, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  currentUser: { id?: string; username?: string; avatar_url?: string };
  onPostCreated: () => void;
}

const MOOD_EMOJIS = ['😊', '😎', '🔥', '🎵', '🎬', '💎', '⚡', '🌙', '❤️', '🚀'];

export default function CreatePostModal({ open, onClose, currentUser, onPostCreated }: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'only_me'>('public');
  const [selectedMood, setSelectedMood] = useState('');
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePost = async () => {
    if (!content.trim()) { toast.error('Write something first!'); return; }
    if (!currentUser.id) { toast.error('Please log in first.'); return; }

    setPosting(true);
    const text = selectedMood ? `${selectedMood} ${content}` : content;

    const { error } = await supabase.from('posts').insert({
      user_id: currentUser.id,
      content: text,
      post_type: 'text',
      privacy,
      likes_count: 0,
      comments_count: 0,
      shares_count: 0,
    });

    if (error) {
      toast.error('Failed to post. Try again.');
    } else {
      toast.success('Posted! 🚀');
      setContent('');
      setSelectedMood('');
      onPostCreated();
      onClose();
    }
    setPosting(false);
  };

  const privacyIcon = privacy === 'public' ? <Globe className="w-3 h-3" /> :
    privacy === 'friends' ? <Users className="w-3 h-3" /> : <Lock className="w-3 h-3" />;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-[#1C1C27] border-white/10 p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white font-bold">Create Post</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-muted-foreground">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="px-4 py-3">
          {/* User row */}
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="w-9 h-9">
              <AvatarImage src={currentUser.avatar_url ?? ''} />
              <AvatarFallback className="bg-gradient-to-br from-[#00F2FF]/30 to-[#BC13FE]/30 text-white font-bold text-sm">
                {(currentUser.username ?? 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-white">{currentUser.username ?? 'You'}</p>
              <Select value={privacy} onValueChange={(v) => setPrivacy(v as typeof privacy)}>
                <SelectTrigger className="h-6 text-[10px] bg-white/10 border-white/10 text-white w-24 px-2 rounded-full">
                  <div className="flex items-center gap-1">
                    {privacyIcon}
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-[#1C1C27] border-white/10">
                  <SelectItem value="public" className="text-white text-xs">Public</SelectItem>
                  <SelectItem value="friends" className="text-white text-xs">Friends</SelectItem>
                  <SelectItem value="only_me" className="text-white text-xs">Only Me</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Text area */}
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={`What's on your mind, ${currentUser.username?.split(' ')[0] ?? 'Malik'}?`}
            className="bg-transparent border-none resize-none text-white placeholder:text-white/30 text-base px-0 focus-visible:ring-0 min-h-[100px]"
            maxLength={2000}
          />

          {/* Mood emoji picker */}
          <div className="flex gap-2 mt-1 flex-wrap">
            {MOOD_EMOJIS.map(e => (
              <button
                key={e}
                onClick={() => setSelectedMood(selectedMood === e ? '' : e)}
                className={`text-xl transition-transform hover:scale-110 ${selectedMood === e ? 'scale-125 drop-shadow-[0_0_6px_rgba(0,242,255,0.8)]' : ''}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Action row */}
        <div className="flex items-center gap-1 px-4 py-3 border-t border-white/5">
          <p className="text-xs text-muted-foreground font-medium mr-2">Add to post:</p>
          <Button variant="ghost" size="icon" onClick={() => fileRef.current?.click()} className="h-8 w-8 text-green-400 hover:bg-green-400/10">
            <Image className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => {}} className="h-8 w-8 text-[#BC13FE] hover:bg-[#BC13FE]/10">
            <Video className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => {}} className="h-8 w-8 text-yellow-400 hover:bg-yellow-400/10">
            <Smile className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => {}} className="h-8 w-8 text-red-400 hover:bg-red-400/10">
            <MapPin className="w-4 h-4" />
          </Button>
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" />

          <Button
            onClick={handlePost}
            disabled={posting || !content.trim()}
            className="ml-auto bg-[#00F2FF]/20 border border-[#00F2FF]/40 text-[#00F2FF] font-bold hover:bg-[#00F2FF]/30 px-6"
          >
            {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
