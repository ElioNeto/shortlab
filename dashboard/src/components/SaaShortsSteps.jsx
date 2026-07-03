// TODO: This is an extract of common step components used in SaaShortsTab.
// As the component gets split, move related sub-components here.

import { Check } from 'lucide-react';

export const STYLE_OPTIONS = [
  { id: 'ugc', label: 'UGC Natural', desc: 'Authentic, talking to camera' },
  { id: 'educational', label: 'Educational', desc: 'Clear explanations' },
  { id: 'shock', label: 'Shock/Discovery', desc: 'Surprising opener' },
  { id: 'story', label: 'Storytelling', desc: 'Mini narrative arc' },
  { id: 'comparison', label: 'Before/After', desc: 'Comparison style' },
];

export const CACHE_KEY = 'saasshorts_cache';
export const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

export function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    if (Date.now() - cache.timestamp > CACHE_MAX_AGE) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return cache;
  } catch { return null; }
}

export function saveCache(url, analysis, webResearch, scripts) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      url, analysis, webResearch, scripts, timestamp: Date.now(),
    }));
  } catch { /* localStorage full */ }
}

/** Reusable wizard progress step indicator */
export function WizardSteps({ steps, currentStep }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2 flex-1">
          {i > 0 && <div className={`flex-1 h-px ${i <= currentStep ? 'bg-violet-500' : 'bg-white/10'}`} />}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            i === currentStep ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' :
            i < currentStep ? 'bg-violet-500/10 text-violet-400' :
            'bg-white/5 text-zinc-600'
          }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              i < currentStep ? 'bg-violet-500 text-white' :
              i === currentStep ? 'bg-violet-500/30 text-violet-300' :
              'bg-white/10 text-zinc-600'
            }`}>
              {i < currentStep ? <Check size={10} /> : i + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
