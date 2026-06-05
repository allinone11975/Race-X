/**
 * COLOR GRADING LAB — CSS filter controls + cinematic presets
 */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Palette, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import RxBadge from '@/components/common/RxBadge';

interface Filters {
  brightness: number; contrast: number; saturation: number;
  hue: number; sepia: number; blur: number;
}

const PRESETS: Record<string, Filters> = {
  Default:    { brightness: 100, contrast: 100, saturation: 100, hue: 0,   sepia: 0,  blur: 0 },
  Cinematic:  { brightness: 95,  contrast: 120, saturation: 80,  hue: 10,  sepia: 10, blur: 0 },
  Vintage:    { brightness: 110, contrast: 90,  saturation: 70,  hue: 30,  sepia: 40, blur: 0 },
  Noir:       { brightness: 90,  contrast: 150, saturation: 0,   hue: 0,   sepia: 0,  blur: 0 },
  Vibrant:    { brightness: 105, contrast: 110, saturation: 160, hue: 0,   sepia: 0,  blur: 0 },
  Cold:       { brightness: 100, contrast: 105, saturation: 90,  hue: -20, sepia: 0,  blur: 0 },
  Warm:       { brightness: 105, contrast: 100, saturation: 110, hue: 20,  sepia: 20, blur: 0 },
  Dreamy:     { brightness: 110, contrast: 85,  saturation: 90,  hue: 15,  sepia: 5,  blur: 1 },
};

const FILTER_CONFIG = [
  { key: 'brightness' as keyof Filters, label: 'Brightness', min: 0, max: 200, unit: '%' },
  { key: 'contrast'   as keyof Filters, label: 'Contrast',   min: 0, max: 200, unit: '%' },
  { key: 'saturation' as keyof Filters, label: 'Saturation', min: 0, max: 200, unit: '%' },
  { key: 'hue'        as keyof Filters, label: 'Hue Rotate', min: -180, max: 180, unit: 'deg' },
  { key: 'sepia'      as keyof Filters, label: 'Sepia',       min: 0, max: 100, unit: '%' },
  { key: 'blur'       as keyof Filters, label: 'Blur',        min: 0, max: 10, unit: 'px' },
];

export default function ColorGradingLab() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Filters>(PRESETS.Default);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const cssFilter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) hue-rotate(${filters.hue}deg) sepia(${filters.sepia}%) blur(${filters.blur}px)`;

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImageSrc(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const applyPreset = (name: string) => setFilters(PRESETS[name]);

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#BC13FE]/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/rx-studio/tools')} className="p-2 rounded-lg border border-white/10 hover:border-[#BC13FE]/40 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <RxBadge label="COLOR" variant="purple" />
        <div>
          <h1 className="text-sm font-bold tracking-widest">COLOR GRADING LAB</h1>
          <p className="text-[10px] text-muted-foreground">Cinematic Color Tools</p>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {/* Preview */}
        <div className="aspect-video rounded-xl border border-[#BC13FE]/20 overflow-hidden bg-black/40 flex items-center justify-center">
          {imageSrc ? (
            <img src={imageSrc} alt="Preview" className="w-full h-full object-cover" style={{ filter: cssFilter }} />
          ) : (
            <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-2 text-muted-foreground hover:text-white transition-colors">
              <Upload className="w-8 h-8" />
              <p className="text-sm">Upload image to grade</p>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-2">
          {Object.keys(PRESETS).map(p => (
            <button key={p} onClick={() => applyPreset(p)}
              className="px-3 py-1 rounded-full text-xs border border-[#BC13FE]/30 hover:border-[#BC13FE] hover:bg-[#BC13FE]/10 text-[#BC13FE] transition-all">
              {p}
            </button>
          ))}
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FILTER_CONFIG.map(f => (
            <div key={f.key} className="space-y-1">
              <div className="flex justify-between">
                <Label className="text-xs text-muted-foreground">{f.label}</Label>
                <span className="text-xs text-[#BC13FE]">{filters[f.key]}{f.unit}</span>
              </div>
              <Slider
                min={f.min} max={f.max} step={1}
                value={[filters[f.key]]}
                onValueChange={([v]) => setFilters(prev => ({ ...prev, [f.key]: v }))}
                className="[&>[data-slot=slider-thumb]]:border-[#BC13FE]"
              />
            </div>
          ))}
        </div>

        {imageSrc && (
          <Button onClick={() => fileRef.current?.click()} variant="ghost" className="w-full border border-white/10 hover:border-[#BC13FE]/40 text-xs">
            <Upload className="w-3 h-3 mr-2" />Change Image
          </Button>
        )}
      </div>
    </div>
  );
}
