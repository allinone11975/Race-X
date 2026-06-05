import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Send, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createAIChatSession, updateAIChatSession, saveAIResult, publishAIResult, verifyDiamondBalance, updateUserDiamonds, logTransaction } from '@/db/api';
import { generateByType, aiChat } from '@/services/aiGateway';
import { RxBadge } from '@/components/common/RxBadge';
import { motion } from 'motion/react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface GeneratedResult {
  id: number;
  url: string;
  type: string | 'image' | 'audio' | 'video';
}

export default function AICreationPage() {
  const navigate = useNavigate();
  const { type } = useParams<{ type: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedResult[]>([]);
  const [sessionId, setSessionId] = useState<string>('');

  const user = JSON.parse(localStorage.getItem('race-x-user') || '{}');

  const creationTypes: Record<string, { title: string; engine: string; diamondCost: number }> = {
    image: { title: 'CREATE IMAGE', engine: 'HuggingFace RealVisXL (SDXL)', diamondCost: 5 },
    voice: { title: 'CREATE VOICE', engine: 'HuggingFace Bark Voice Synthesis', diamondCost: 5 },
    cinema: { title: 'CREATE CINEMA', engine: 'HuggingFace CogVideo HD', diamondCost: 10 },
    melody: { title: 'CREATE MELODY', engine: 'HuggingFace MusicGen Melody', diamondCost: 5 },
    music: { title: 'CREATE MUSIC', engine: 'HuggingFace MusicGen Full Track', diamondCost: 5 },
    video: { title: 'CREATE VIDEO', engine: 'HuggingFace Zeroscope Short Clips', diamondCost: 5 },
    song: { title: 'CREATE SONG', engine: 'HuggingFace MusicGen + Bark Vocals', diamondCost: 10 },
  };

  const currentType = creationTypes[type || 'image'];

  useEffect(() => {
    // Create AI chat session
    const initSession = async () => {
      const session = await createAIChatSession(user.id, type || 'image');
      if (session) {
        setSessionId(session.id);
      }
    };
    initSession();
  }, [type, user.id]);

  const handleGenerate = async () => {
    if (!input.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);

    try {
      // Diamond balance check
      const hasBalance = user.is_admin || (await verifyDiamondBalance(user.id, currentType.diamondCost));
      if (!hasBalance) {
        toast.error(`Insufficient diamonds. Required: ${currentType.diamondCost}`);
        setIsGenerating(false);
        return;
      }

      const userMessage: ChatMessage = {
        role: 'user',
        content: input,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      const prompt = input;
      setInput('');

      // 1. Get a contextual reply from Groq
      const chatHistory = [...messages, userMessage].map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
      let replyText = `Generating your ${type} creation from: "${prompt}"…`;
      try {
        const chatRes = await aiChat(chatHistory, `You are RX, the AI creative engine for RACE-X. The user wants to create a ${type}. Respond with a brief, exciting 1-2 sentence description of what you're generating.`);
        replyText = chatRes.reply;
      } catch {
        // non-fatal — continue to generation
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // 2. Call the real AI generation gateway
      toast.loading('Generating with HuggingFace AI…', { id: 'gen-toast' });
      const generated = await generateByType(type || 'image', prompt);
      toast.dismiss('gen-toast');

      // 3. Deduct diamonds
      if (!user.is_admin) {
        await updateUserDiamonds(user.id, currentType.diamondCost, 'deduct');
      }

      // 4. Show result
      setResults([{ id: 1, url: generated.url, type: generated.type }]);

      // 5. Update session + log
      await updateAIChatSession(sessionId, [...messages, userMessage, assistantMessage]);
      await logTransaction({
        user_id: user.id,
        action_type: 'AI_GENERATION',
        input_parameters: { type, prompt, provider: generated.provider, model: generated.model },
        output_result: { result_type: generated.type },
        diamond_balance_before: user.diamonds,
        diamond_balance_after: user.is_admin ? user.diamonds : user.diamonds - currentType.diamondCost,
      });

      toast.success(`${type?.toUpperCase()} generated via ${generated.provider}!`);
    } catch (error) {
      toast.dismiss('gen-toast');
      const message = error instanceof Error ? error.message : 'Generation failed';
      // Handle model warm-up
      if (message.includes('warming up') || message.includes('retry')) {
        toast.error('AI model is warming up. Please try again in 30 seconds.', { duration: 6000 });
      } else {
        toast.error(message);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async (resultUrl: string) => {
    const result = await saveAIResult({
      user_id: user.id,
      session_id: sessionId,
      result_type: type || 'image',
      result_url: resultUrl,
    });

    if (result) {
      toast.success('Result saved!');
    } else {
      toast.error('Failed to save result.');
    }
  };

  const handlePublish = async (resultUrl: string) => {
    // Save and publish
    const result = await saveAIResult({
      user_id: user.id,
      session_id: sessionId,
      result_type: type || 'image',
      result_url: resultUrl,
    });

    if (result) {
      await publishAIResult(result.id);
      toast.success('Result published to Rx Social!');
    } else {
      toast.error('Failed to publish result.');
    }
  };

  const handleEdit = (resultUrl: string) => {
    // Navigate to editor with pre-loaded content
    navigate('/rx-studio/editor', { state: { preloadedContent: resultUrl } });
  };

  const handleReset = () => {
    setMessages([]);
    setResults([]);
    setInput('');
    toast.success('Conversation reset');
  };

  return (
    <div className="min-h-screen carbon-fiber flex flex-col">
      {/* Header */}
      <div className="glass-strong border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/rx-studio')}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-primary">{currentType.title}</h1>
            <p className="text-sm text-muted-foreground">{currentType.engine}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
      </div>

      {/* Chat Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'glass border border-border'
                }`}
              >
                {message.content}
              </div>
            </motion.div>
          ))}

          {/* Results Display */}
          {results.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              {results.map((result) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative glass-strong rounded-xl p-4 border border-primary/30"
                >
                  <RxBadge />
                  <div className="mb-4">
                    {result.type === 'image' ? (
                      <img
                        src={result.url}
                        alt="AI Generated"
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                    ) : result.type === 'audio' ? (
                      <div className="aspect-square bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex flex-col items-center justify-center gap-3 p-4">
                        <div className="text-4xl">🎵</div>
                        <audio controls className="w-full" src={result.url}>
                          <track kind="captions" />
                        </audio>
                      </div>
                    ) : result.type === 'video' ? (
                      <video
                        controls
                        className="w-full aspect-square object-cover rounded-lg"
                        src={result.url}
                      />
                    ) : (
                      <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleSave(result.url)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={() => handlePublish(result.url)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      Publish
                    </Button>
                    <Button
                      onClick={() => handleEdit(result.url)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      Edit in Studio
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="glass-strong border-t border-border p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleGenerate()}
            placeholder="Describe what you want to create..."
            className="flex-1"
            disabled={isGenerating}
          />
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="pill-button"
          >
            {isGenerating ? 'Generating...' : <Send className="w-5 h-5" />}
          </Button>
        </div>
        <p className="text-xs text-center text-muted-foreground mt-2">
          Diamond Cost: {currentType.diamondCost} | Your Balance: {user.is_admin ? '∞ Unlimited' : (user.diamonds || 0)}
        </p>
      </div>
    </div>
  );
}
