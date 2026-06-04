/**
 * BEAT STUDIO — Tone.js step sequencer + drum machine
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Play, Pause, Square, Download, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import RxBadge from '@/components/common/RxBadge';

const TRACKS = [
  { name: 'KICK',   color: '#00F2FF', freq: 60,  type: 'sine'   as OscillatorType },
  { name: 'SNARE',  color: '#BC13FE', freq: 200, type: 'square' as OscillatorType },
  { name: 'HI-HAT', color: '#00FF88', freq: 800, type: 'sawtooth' as OscillatorType },
  { name: 'CLAP',   color: '#FF6B35', freq: 400, type: 'square' as OscillatorType },
  { name: 'TOM',    color: '#FFD700', freq: 120, type: 'sine'   as OscillatorType },
];

const STEPS = 16;

type Grid = boolean[][];

const emptyGrid = (): Grid => TRACKS.map(() => Array(STEPS).fill(false));

export default function BeatStudio() {
  const navigate = useNavigate();
  const [grid, setGrid] = useState<Grid>(emptyGrid());
  const [bpm, setBpm] = useState(120);
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [volume, setVolume] = useState(70);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepRef = useRef(0);

  const getCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  const playSound = useCallback((trackIndex: number) => {
    const ctx = getCtx();
    const track = TRACKS[trackIndex];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const masterGain = ctx.createGain();

    masterGain.gain.value = volume / 100;
    osc.connect(gain);
    gain.connect(masterGain);
    masterGain.connect(ctx.destination);

    osc.type = track.type;
    osc.frequency.setValueAtTime(track.freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(track.freq * 0.1, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  }, [volume]);

  const start = useCallback(() => {
    const interval = Math.floor((60 / bpm / 4) * 1000);
    intervalRef.current = setInterval(() => {
      const step = stepRef.current % STEPS;
      setCurrentStep(step);
      grid.forEach((track, ti) => { if (track[step]) playSound(ti); });
      stepRef.current++;
    }, interval);
    setPlaying(true);
  }, [bpm, grid, playSound]);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPlaying(false);
    setCurrentStep(-1);
    stepRef.current = 0;
  }, []);

  useEffect(() => {
    if (playing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const interval = Math.floor((60 / bpm / 4) * 1000);
      intervalRef.current = setInterval(() => {
        const step = stepRef.current % STEPS;
        setCurrentStep(step);
        grid.forEach((track, ti) => { if (track[step]) playSound(ti); });
        stepRef.current++;
      }, interval);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [bpm, grid, playing, playSound]);

  const toggleCell = (trackIdx: number, stepIdx: number) => {
    setGrid(prev => prev.map((track, ti) =>
      ti === trackIdx ? track.map((v, si) => si === stepIdx ? !v : v) : track
    ));
  };

  const clearGrid = () => { stop(); setGrid(emptyGrid()); };

  const loadPreset = (preset: string) => {
    const g = emptyGrid();
    if (preset === 'hip-hop') {
      [0,4,8,12].forEach(s => { g[0][s] = true; });        // kick
      [4,12].forEach(s => { g[1][s] = true; });             // snare
      [0,2,4,6,8,10,12,14].forEach(s => { g[2][s] = true; }); // hihat
    } else if (preset === 'house') {
      [0,4,8,12].forEach(s => { g[0][s] = true; });
      [4,12].forEach(s => { g[1][s] = true; });
      [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].forEach(s => { g[2][s] = true; });
    } else if (preset === 'trap') {
      [0,8].forEach(s => { g[0][s] = true; });
      [4,12,14].forEach(s => { g[1][s] = true; });
      [0,2,3,4,6,8,9,10,12,14,15].forEach(s => { g[2][s] = true; });
      [0,4,8,12].forEach(s => { g[3][s] = true; });
    }
    setGrid(g);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white overflow-x-hidden">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#BC13FE]/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/rx-music')} className="p-2 rounded-lg border border-white/10 hover:border-[#BC13FE]/40 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <RxBadge label="BEAT" variant="purple" />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold tracking-widest">BEAT STUDIO</h1>
          <p className="text-[10px] text-muted-foreground">Tone.js · Step Sequencer</p>
        </div>
        {playing && <div className="flex items-center gap-1 shrink-0"><div className="w-2 h-2 rounded-full bg-[#BC13FE] animate-pulse" /><span className="text-[10px] text-[#BC13FE]">PLAYING</span></div>}
      </div>

      <div className="p-4 space-y-4">
        {/* Transport */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-[#BC13FE]/20 bg-white/[0.03]">
          <Button onClick={playing ? stop : start}
            className={`${playing ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-[#BC13FE]/20 border-[#BC13FE]/40 text-[#BC13FE]'} border font-bold`}>
            {playing ? <><Pause className="w-4 h-4 mr-2" />STOP</> : <><Play className="w-4 h-4 mr-2" />PLAY</>}
          </Button>
          <Button onClick={clearGrid} variant="ghost" className="border border-white/10 text-muted-foreground text-xs">
            <Square className="w-3 h-3 mr-1" />Clear
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Label className="text-xs text-muted-foreground shrink-0">BPM</Label>
            <Slider min={60} max={200} step={1} value={[bpm]}
              onValueChange={([v]) => setBpm(v)} className="flex-1 min-w-0" />
            <span className="text-xs text-[#BC13FE] font-mono w-8 shrink-0">{bpm}</span>
          </div>
          <div className="flex items-center gap-2">
            <Volume2 className="w-3 h-3 text-muted-foreground shrink-0" />
            <Slider min={0} max={100} step={1} value={[volume]}
              onValueChange={([v]) => setVolume(v)} className="w-20" />
          </div>
        </motion.div>

        {/* Presets */}
        <div className="flex gap-2 flex-wrap">
          {['hip-hop', 'house', 'trap'].map(p => (
            <button key={p} onClick={() => loadPreset(p)}
              className="px-3 py-1 text-xs rounded-full border border-[#BC13FE]/30 hover:border-[#BC13FE] hover:bg-[#BC13FE]/10 text-[#BC13FE] transition-all uppercase tracking-wider">
              {p}
            </button>
          ))}
        </div>

        {/* Step Grid */}
        <div className="rounded-xl border border-[#BC13FE]/20 bg-white/[0.03] overflow-x-auto">
          <div className="p-3 min-w-[500px]">
            {/* Step indicators */}
            <div className="flex mb-2 ml-16">
              {Array.from({ length: STEPS }, (_, i) => (
                <div key={i} className={`flex-1 text-center text-[9px] font-mono transition-colors ${currentStep === i ? 'text-[#BC13FE]' : 'text-muted-foreground'}`}>
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Tracks */}
            {TRACKS.map((track, ti) => (
              <div key={ti} className="flex items-center mb-2">
                <div className="w-16 shrink-0 flex items-center gap-1 pr-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: track.color }} />
                  <span className="text-[9px] font-bold tracking-wider" style={{ color: track.color }}>{track.name}</span>
                </div>
                <div className="flex flex-1 gap-0.5">
                  {Array.from({ length: STEPS }, (_, si) => (
                    <motion.button
                      key={si}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => toggleCell(ti, si)}
                      className={`flex-1 h-8 rounded-sm transition-all border ${
                        grid[ti][si]
                          ? `border-transparent shadow-[0_0_6px_${track.color}60]`
                          : 'border-white/10 hover:border-white/30'
                      } ${currentStep === si && playing ? 'ring-1 ring-white/30' : ''}`}
                      style={{
                        backgroundColor: grid[ti][si]
                          ? `${track.color}${currentStep === si ? 'FF' : '99'}`
                          : currentStep === si ? 'rgba(255,255,255,0.08)' : 'transparent',
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
