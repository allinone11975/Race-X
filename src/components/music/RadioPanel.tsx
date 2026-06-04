/**
 * RACE-X  ·  Radio Panel Component
 * 4 mood cards · global toggle · streaming status · diamond counter
 */
import { useState, useEffect } from 'react';
import { Radio, Zap, Square, Wifi } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { RADIO_MOODS, startRadio, stopRadio, setRadioVolume, getActiveRadioSession, type RadioMood } from '@/lib/radioEngine';

interface RadioPanelProps {
  userId: string;
  chargeRadio: () => Promise<boolean>;
  diamondBalance: number;
}

export default function RadioPanel({ userId, chargeRadio, diamondBalance }: RadioPanelProps) {
  const [isOn, setIsOn] = useState(false);
  const [activeMood, setActiveMood] = useState<RadioMood>('Focus');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [volume, setVolume] = useState(85);
  const [minutesElapsed, setMinutesElapsed] = useState(0);
  const [diamondsSpent, setDiamondsSpent] = useState(0);

  // Restore active session on mount
  useEffect(() => {
    getActiveRadioSession(userId).then(session => {
      if (session) {
        setIsOn(true);
        setActiveMood(session.mood as RadioMood);
        setSessionId(session.id as string);
      }
    });
  }, [userId]);

  // Track elapsed time
  useEffect(() => {
    if (!isOn) { setMinutesElapsed(0); return; }
    const tick = setInterval(() => setMinutesElapsed(m => m + 1), 60_000);
    return () => clearInterval(tick);
  }, [isOn]);

  const handleAutoStop = () => {
    setIsOn(false);
    setSessionId(null);
  };

  const handleToggle = async (on: boolean) => {
    if (on) {
      if (diamondBalance < 1) {
        toast.error('Need at least 1 💎 to start Radio!');
        return;
      }
      // Charge first diamond immediately
      const ok = await chargeRadio();
      if (!ok) return;
      setDiamondsSpent(1);

      const result = await startRadio(
        userId,
        activeMood,
        async () => {
          const ok2 = await chargeRadio();
          if (ok2) setDiamondsSpent(d => d + 1);
          return ok2;
        },
        handleAutoStop,
      );

      if (!result) {
        toast.error('Failed to start radio stream. Please retry.');
        return;
      }
      setSessionId(result.session_id);
      setIsOn(true);
      toast.success(`📻 ${activeMood} Radio started!`, { description: '1 💎 per 30 minutes' });
    } else {
      if (sessionId) await stopRadio(userId, sessionId);
      setIsOn(false);
      setSessionId(null);
      setMinutesElapsed(0);
      toast.info('📻 Radio stopped — stream killed to save battery.');
    }
  };

  const handleMoodSelect = async (mood: RadioMood) => {
    if (isOn) {
      // Stop current session, restart with new mood
      if (sessionId) await stopRadio(userId, sessionId);
      setIsOn(false);
      setSessionId(null);
      setActiveMood(mood);
      setTimeout(() => handleToggle(true), 300);
    } else {
      setActiveMood(mood);
    }
  };

  const handleVolumeChange = (val: number[]) => {
    setVolume(val[0]);
    setRadioVolume(val[0] / 100);
  };

  return (
    <div className="space-y-4">
      {/* Global Toggle */}
      <div className="glass-strong rounded-2xl border border-[#BC13FE]/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#BC13FE]" />
            <div>
              <p className="text-sm font-bold text-white">Live Radio</p>
              <p className="text-[10px] text-muted-foreground">1 💎 / 30 minutes</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isOn && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#00FF88] rounded-full animate-pulse" />
                <span className="text-[10px] text-[#00FF88] font-medium">LIVE</span>
              </div>
            )}
            <Switch
              checked={isOn}
              onCheckedChange={handleToggle}
              className="data-[state=checked]:bg-[#BC13FE]"
            />
          </div>
        </div>

        {/* Stats bar */}
        {isOn && (
          <div className="flex gap-3 p-2 rounded-xl bg-white/5 text-[11px]">
            <div className="flex items-center gap-1 text-[#00FF88]">
              <Wifi className="w-3 h-3" />
              <span>{minutesElapsed}m elapsed</span>
            </div>
            <div className="flex items-center gap-1 text-[#BC13FE]">
              <Zap className="w-3 h-3" />
              <span>{diamondsSpent} 💎 spent</span>
            </div>
            <div className="ml-auto flex items-center gap-1 text-[#00F2FF]">
              <span className="capitalize">{activeMood}</span>
              <Square className="w-2 h-2 fill-[#00F2FF]" />
            </div>
          </div>
        )}

        {/* Volume */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <Label className="text-[10px] text-muted-foreground">Volume</Label>
            <span className="text-[10px] text-muted-foreground">{volume}%</span>
          </div>
          <Slider
            value={[volume]}
            onValueChange={handleVolumeChange}
            max={100}
            step={1}
            disabled={!isOn}
          />
        </div>
      </div>

      {/* Mood Cards */}
      <div className="grid grid-cols-2 gap-3">
        {RADIO_MOODS.map(config => {
          const selected = activeMood === config.mood;
          const active = isOn && selected;
          return (
            <button
              key={config.mood}
              onClick={() => handleMoodSelect(config.mood)}
              className={`
                relative rounded-2xl p-3 border text-left transition-all duration-200
                bg-gradient-to-br ${config.gradient}
                ${selected
                  ? 'border-[#00F2FF]/60 shadow-[0_0_20px_rgba(0,242,255,0.2)]'
                  : 'border-white/10 hover:border-white/20'}
              `}
            >
              {active && (
                <div className="absolute top-2 right-2">
                  <span className="w-2 h-2 bg-[#00FF88] rounded-full animate-pulse block" />
                </div>
              )}
              <span className="text-2xl block mb-1">{config.icon}</span>
              <p className="text-xs font-bold text-white">{config.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{config.description}</p>
              <Badge className="mt-2 text-[9px] px-1.5 py-0 bg-white/10 text-white/60 border-white/10">
                {config.bpm_range}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Disclaimer */}
      <p className="text-center text-[10px] text-muted-foreground px-4">
        📋 Personal Use Only · All streams via Mubert API · Rx Music Engine v1.0
      </p>
    </div>
  );
}
