import React from 'react';
import { Eye, TrendingUp, Globe, Sparkles, ChevronLeft, ChevronRight, Check, RefreshCw } from 'lucide-react';

export default function ScriptStep({
  scripts,
  selectedScript,
  onSelectScript,
  analysis,
  webResearch,
  fromCache,
  onBack,
  onNext,
  onReAnalyze,
}) {
  if (!analysis) return null;

  return (
    <div className="animate-[fadeIn_0.3s_ease-out] space-y-6">
      {/* Analysis Summary */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Eye size={18} className="text-violet-400" />
            {analysis.product_name || 'Analysis'}
          </h2>
          <div className="flex items-center gap-2">
            {fromCache && (
              <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                Cached
                <button onClick={onReAnalyze} className="hover:text-white ml-1" title="Re-analyze">
                  <RefreshCw size={9} />
                </button>
              </span>
            )}
            <span className="text-xs bg-violet-500/10 text-violet-400 px-2 py-1 rounded-full border border-violet-500/20">
              {analysis.industry}
            </span>
          </div>
        </div>
        <p className="text-sm text-zinc-400 mb-4">{analysis.one_liner}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Pain Points</h3>
            <div className="space-y-1.5">
              {(analysis.pain_points || []).map((pp, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                    pp.intensity === 'high' ? 'bg-red-400' : pp.intensity === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                  }`} />
                  <div>
                    <span className="text-zinc-300">{pp.pain}</span>
                    {pp.source && pp.source !== 'website' && (
                      <span className="ml-1.5 text-[9px] bg-blue-500/10 text-blue-400 px-1 py-0.5 rounded">{pp.source}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Emotional Hooks</h3>
            <div className="space-y-1.5">
              {(analysis.emotional_hooks || []).map((h, i) => (
                <div key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                  <TrendingUp size={12} className="text-violet-400 mt-1 shrink-0" />
                  {h}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Web Research Results */}
      {webResearch && (
        <div className="glass-panel p-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
            <Globe size={14} className="text-blue-400" />
            Web Research (Google Search)
            {webResearch.grounding_sources && (
              <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full ml-auto">
                {webResearch.grounding_sources.length} sources
              </span>
            )}
          </h3>

          {/* Real user reviews */}
          {webResearch.real_reviews && webResearch.real_reviews.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Real User Reviews</h4>
              <div className="space-y-2">
                {webResearch.real_reviews.slice(0, 5).map((review, i) => (
                  <div key={i} className="text-xs bg-white/5 rounded-lg p-2.5 border border-white/5">
                    <p className="text-zinc-300 italic">&quot;{review.quote}&quot;</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-zinc-600">{review.source}</span>
                      <span className={`px-1 py-0.5 rounded text-[9px] ${
                        review.sentiment === 'positive' ? 'bg-green-500/10 text-green-400' :
                        review.sentiment === 'negative' ? 'bg-red-500/10 text-red-400' :
                        'bg-zinc-500/10 text-zinc-400'
                      }`}>{review.sentiment}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Competitors */}
          {webResearch.competitors && webResearch.competitors.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Competitors</h4>
              <div className="flex flex-wrap gap-2">
                {webResearch.competitors.map((c, i) => (
                  <span key={i} className="text-xs bg-white/5 px-2 py-1 rounded-lg text-zinc-400 border border-white/5" title={c.comparison}>
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sources */}
          {webResearch.grounding_sources && webResearch.grounding_sources.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Sources</h4>
              <div className="flex flex-wrap gap-1.5">
                {webResearch.grounding_sources.slice(0, 8).map((src, i) => (
                  <a
                    key={i}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-400 hover:text-blue-300 bg-blue-500/5 px-2 py-0.5 rounded-full border border-blue-500/10 hover:border-blue-500/30 transition-colors truncate max-w-[200px]"
                    title={src.title}
                  >
                    {src.title || (() => { try { return new URL(src.url).hostname; } catch { return src.url; } })()}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scripts */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles size={18} className="text-yellow-400" />
          Generated Scripts
          <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full ml-auto">{scripts.length} scripts</span>
        </h2>

        <div className="grid grid-cols-1 gap-4">
          {scripts.map((script, i) => (
            <div
              key={i}
              onClick={() => onSelectScript(i)}
              className={`glass-panel p-5 cursor-pointer transition-all ${
                selectedScript === i
                  ? 'border-violet-500/50 bg-violet-500/5 ring-1 ring-violet-500/20'
                  : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    selectedScript === i ? 'bg-violet-500 text-white' : 'bg-white/10 text-zinc-400'
                  }`}>
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">{script.title}</h3>
                    <span className="text-[10px] text-zinc-500">{script.duration_seconds}s &middot; {script.style} &middot; {script.target_platform}</span>
                  </div>
                </div>
                {selectedScript === i && (
                  <span className="text-[10px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">Selected</span>
                )}
              </div>

              {/* Segments preview */}
              <div className="flex gap-1 mb-3">
                {(script.segments || []).map((seg, j) => (
                  <div
                    key={j}
                    className={`h-1.5 rounded-full ${
                      seg.type === 'hook' ? 'bg-red-400' :
                      seg.type === 'problem' ? 'bg-yellow-400' :
                      seg.type === 'solution' ? 'bg-green-400' :
                      'bg-blue-400'
                    }`}
                    style={{ flex: (seg.end - seg.start) }}
                    title={`${seg.type}: ${seg.start}s-${seg.end}s`}
                  />
                ))}
              </div>

              <div className="space-y-2">
                {(script.segments || []).map((seg, j) => (
                  <div key={j} className="flex gap-3 text-xs">
                    <span className={`shrink-0 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider ${
                      seg.type === 'hook' ? 'bg-red-500/20 text-red-300' :
                      seg.type === 'problem' ? 'bg-yellow-500/20 text-yellow-300' :
                      seg.type === 'solution' ? 'bg-green-500/20 text-green-300' :
                      'bg-blue-500/20 text-blue-300'
                    }`}>
                      {seg.type}
                    </span>
                    <span className="text-zinc-400 leading-relaxed">{seg.narration}</span>
                  </div>
                ))}
              </div>

              {/* Hook text & hashtags */}
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-3 flex-wrap">
                <span className="text-[10px] bg-red-500/10 text-red-300 px-2 py-0.5 rounded-full">
                  Hook: &quot;{script.hook_text}&quot;
                </span>
                {(script.hashtags || []).slice(0, 4).map((tag, j) => (
                  <span key={j} className="text-[10px] text-zinc-500">{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="btn-secondary px-4 py-2 text-sm flex items-center gap-2">
          <ChevronLeft size={14} /> Back
        </button>
        <button onClick={onNext} className="btn-primary px-6 py-2 text-sm flex items-center gap-2">
          Configure Video <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
