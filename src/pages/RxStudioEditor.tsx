import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search } from 'lucide-react';
import { RxBadge } from '@/components/common/RxBadge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'motion/react';

// Generate 500 AI tools
const generateTools = () => {
  const categories = [
    { name: 'IMAGE_AI', start: 1, end: 100, icon: '🎨' },
    { name: 'VIDEO_AI', start: 101, end: 200, icon: '🎬' },
    { name: 'AUDIO_AI', start: 201, end: 300, icon: '🎵' },
    { name: 'WRITING_AI', start: 301, end: 400, icon: '✍️' },
    { name: 'ADVANCED_AI', start: 401, end: 500, icon: '🚀' },
  ];

  const tools: Array<{
    id: number;
    name: string;
    category: string;
    requiredLevel: number;
    icon: string;
  }> = [];

  categories.forEach((category) => {
    for (let i = category.start; i <= category.end; i++) {
      tools.push({
        id: i,
        name: `${category.name.replace('_', ' ')} Tool ${i}`,
        category: category.name,
        requiredLevel: Math.floor(i / 10),
        icon: category.icon,
      });
    }
  });

  return tools;
};

export default function RxStudioEditor() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const user = JSON.parse(localStorage.getItem('race-x-user') || '{}');
  const tools = generateTools();

  const categories = ['ALL', 'IMAGE_AI', 'VIDEO_AI', 'AUDIO_AI', 'WRITING_AI', 'ADVANCED_AI'];

  const filteredTools = tools.filter((tool) => {
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const isToolLocked = (requiredLevel: number) => {
    return user.user_level < requiredLevel && !user.is_admin;
  };

  const handleToolClick = (tool: typeof tools[0]) => {
    if (isToolLocked(tool.requiredLevel)) {
      alert(`Unlock at Level ${tool.requiredLevel}`);
      return;
    }

    // Navigate to appropriate creation page based on category
    const typeMap: Record<string, string> = {
      IMAGE_AI: 'image',
      VIDEO_AI: 'video',
      AUDIO_AI: 'music',
      WRITING_AI: 'text',
      ADVANCED_AI: 'cinema',
    };

    const type = typeMap[tool.category] || 'image';
    navigate(`/rx-studio/create/${type}`);
  };

  return (
    <div className="min-h-screen carbon-fiber">
      {/* Header */}
      <div className="glass-strong border-b border-border p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/rx-studio')}
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-2xl font-bold gradient-text">Rx Studio Editor</h1>
            <div className="ml-auto text-sm text-muted-foreground">
              Level: {user.user_level} | Diamonds: {user.diamonds}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tools..."
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 mt-4 overflow-x-auto">
            {categories.map((category) => (
              <Button
                key={category}
                onClick={() => setSelectedCategory(category)}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                className="whitespace-nowrap"
              >
                {category.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="max-w-7xl mx-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTools.map((tool, index) => {
              const locked = isToolLocked(tool.requiredLevel);
              return (
                <motion.div
                  key={tool.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.02, 1) }}
                  className="relative"
                >
                  <RxBadge />
                  <button
                    onClick={() => handleToolClick(tool)}
                    className={`w-full glass-strong rounded-xl p-6 border border-primary/30 text-left transition-all duration-300 hover:scale-105 ${
                      locked ? 'tool-locked' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">{tool.icon}</div>
                      <div className="flex-1">
                        <h3 className="font-bold text-foreground">{tool.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {tool.category.replace('_', ' ')}
                        </p>
                        {locked && (
                          <p className="text-xs text-destructive mt-1">
                            🔒 Unlock at Level {tool.requiredLevel}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>

          {filteredTools.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No tools found matching your search.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
