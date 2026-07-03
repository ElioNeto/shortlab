import React from 'react';
import { Globe, Sparkles, Loader2, AlertCircle, Target, MessageSquare, Film } from 'lucide-react';

const STYLE_OPTIONS = [
  { id: 'ugc', label: 'UGC Natural', desc: 'Authentic, talking to camera' },
  { id: 'educational', label: 'Educational', desc: 'Clear explanations' },
  { id: 'shock', label: 'Shock/Discovery', desc: 'Surprising opener' },
  { id: 'story', label: 'Storytelling', desc: 'Mini narrative arc' },
  { id: 'comparison', label: 'Before/After', desc: 'Comparison style' },
];

export default function AnalysisStep({
  onAnalyze,
  isAnalyzing,
  error,
  url,
  onUrlChange,
  description,
  onDescriptionChange,
  language,
  onLanguageChange,
  actorGender,
  onActorGenderChange,
  style,
  onStyleChange,
  videoMode,
  onVideoModeChange,
  numScripts,
  onNumScriptsChange,
}) {
  return (
    <div className="animate-[fadeIn_0.3s_ease-out] space-y-6">
      <div className="glass-panel p-8 space-y-6">
        {/* Video Mode Selector */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-3">Video Mode</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onVideoModeChange('lowcost')}
              className={`p-4 rounded-xl border text-left transition-all ${
                videoMode === 'lowcost'
                  ? 'border-green-500/50 bg-green-500/10 ring-1 ring-green-500/30'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-semibold ${videoMode === 'lowcost' ? 'text-green-300' : 'text-zinc-300'}`}>Low Cost</span>
                <span className="text-xs font-mono text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">~$0.80</span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">Hailuo 2.3 img2video + VEED Lipsync. Good movement + lip-sync. Recommended.</p>
            </button>
            <button
              onClick={() => onVideoModeChange('premium')}
              className={`p-4 rounded-xl border text-left transition-all ${
                videoMode === 'premium'
                  ? 'border-violet-500/50 bg-violet-500/10 ring-1 ring-violet-500/30'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-semibold ${videoMode === 'premium' ? 'text-violet-300' : 'text-zinc-300'}`}>Premium</span>
                <span className="text-xs font-mono text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">~$2.00</span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">Kling Avatar v2 Standard. Full integrated movement. Best quality.</p>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Website URL <span className="text-zinc-600">(optional)</span></label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="url"
                value={url}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder="https://your-website.com"
                className="input-field pl-10"
                onKeyDown={(e) => e.key === 'Enter' && onAnalyze()}
              />
            </div>
          </div>
          <p className="text-[10px] text-zinc-600 mt-1">If provided, we'll scrape and research your site automatically</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            {url.trim() ? 'Extra context' : 'Describe your product/business'} <span className="text-zinc-600">{url.trim() ? '(optional)' : '(required if no URL)'}</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={2}
            className="input-field resize-none text-sm"
            placeholder="e.g. Pizzería artesanal en Madrid, Coach de productividad, Tienda de ropa deportiva, App de meditación..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-3">Language</label>
          <div className="flex gap-2 mb-6">
            {[
              { id: 'en', label: 'English', flag: '🇺🇸' },
              { id: 'es', label: 'Español', flag: '🇪🇸' },
            ].map((l) => (
              <button
                key={l.id}
                onClick={() => onLanguageChange(l.id)}
                className={`flex-1 p-3 rounded-xl border text-center transition-all ${
                  language === l.id
                    ? 'border-violet-500/50 bg-violet-500/10 text-violet-300'
                    : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
                }`}
              >
                <span className="text-lg">{l.flag}</span>
                <div className="text-xs font-medium mt-1">{l.label}</div>
              </button>
            ))}
          </div>

          <label className="block text-sm font-medium text-zinc-300 mb-3">Actor</label>
          <div className="flex gap-2 mb-6">
            {[
              { id: 'female', label: 'Woman', icon: '👩' },
              { id: 'male', label: 'Man', icon: '👨' },
            ].map((g) => (
              <button
                key={g.id}
                onClick={() => onActorGenderChange(g.id)}
                className={`flex-1 p-3 rounded-xl border text-center transition-all ${
                  actorGender === g.id
                    ? 'border-violet-500/50 bg-violet-500/10 text-violet-300'
                    : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
                }`}
              >
                <span className="text-lg">{g.icon}</span>
                <div className="text-xs font-medium mt-1">{g.label}</div>
              </button>
            ))}
          </div>

          <label className="block text-sm font-medium text-zinc-300 mb-3">Video Style</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {STYLE_OPTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => onStyleChange(s.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  style === s.id
                    ? 'border-violet-500/50 bg-violet-500/10 text-violet-300'
                    : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
                }`}
              >
                <div className="text-xs font-medium">{s.label}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Number of Scripts</label>
          <div className="flex gap-2">
            {[1, 2, 3, 5].map((n) => (
              <button
                key={n}
                onClick={() => onNumScriptsChange(n)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  numScripts === n
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : 'bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <button
          onClick={onAnalyze}
          disabled={isAnalyzing || (!url.trim() && !description.trim())}
          className="btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {url.trim() ? 'Scraping + Researching web + Generating scripts... (45-90s)' : 'Generating scripts... (20-40s)'}
            </>
          ) : (
            <>
              <Sparkles size={16} />
              {url.trim() ? 'Research & Generate Scripts' : 'Generate Scripts'}
            </>
          )}
        </button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-4">
          <Target size={16} className="text-violet-400 mb-2" />
          <h3 className="text-sm font-medium text-zinc-300">Deep Research</h3>
          <p className="text-xs text-zinc-500 mt-1">AI analyzes your product via URL scraping + web research, or generates directly from your description.</p>
        </div>
        <div className="glass-panel p-4">
          <MessageSquare size={16} className="text-violet-400 mb-2" />
          <h3 className="text-sm font-medium text-zinc-300">Pain Point Scripts</h3>
          <p className="text-xs text-zinc-500 mt-1">Generates hook-problem-solution scripts targeting your audience&apos;s real pain points.</p>
        </div>
        <div className="glass-panel p-4">
          <Film size={16} className="text-violet-400 mb-2" />
          <h3 className="text-sm font-medium text-zinc-300">AI Actor Videos</h3>
          <p className="text-xs text-zinc-500 mt-1">Realistic AI-generated actors with lip-sync, b-roll, and viral subtitles. From ~$0.50/video.</p>
        </div>
      </div>
    </div>
  );
}
