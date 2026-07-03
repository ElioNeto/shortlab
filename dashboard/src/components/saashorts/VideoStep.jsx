import React from 'react';
import { Film, Check, Loader2, Terminal, ChevronDown, AlertCircle, ChevronLeft, RefreshCw } from 'lucide-react';

export default function VideoStep({
  genStatus,
  genLogs,
  logsExpanded,
  onToggleLogs,
  onRetry,
  onBackToSettings,
  generating,
}) {
  return (
    <div className="animate-[fadeIn_0.3s_ease-out] space-y-6">
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Film size={18} className={genStatus === 'processing' ? 'text-violet-400 animate-pulse' : genStatus === 'completed' ? 'text-green-400' : 'text-red-400'} />
            Video Generation
          </h2>
          <span className={`text-xs px-2 py-1 rounded-full border ${
            genStatus === 'processing' ? 'bg-violet-500/10 border-violet-500/20 text-violet-300' :
            genStatus === 'completed' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
            'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {genStatus.toUpperCase()}
          </span>
        </div>

        {/* Progress steps */}
        <div className="space-y-2 mb-4">
          {[
            'Generating actor image + voiceover',
            'Creating talking head video (2-5 min)',
            'Generating b-roll clips',
            'Compositing final video',
          ].map((label, i) => {
            const logStr = genLogs.join(' ').toLowerCase();
            const stepDone =
              i === 0 ? logStr.includes('[2/6]') || logStr.includes('[3/6]') :
              i === 1 ? logStr.includes('[3/6]') && (logStr.includes('[4/6]') || logStr.includes('talking head ready')) :
              i === 2 ? logStr.includes('[5/6]') || logStr.includes('[6/6]') :
              genStatus === 'completed';
            const stepActive =
              i === 0 ? logStr.includes('[1/6]') && !stepDone :
              i === 1 ? (logStr.includes('[3/6]') && !logStr.includes('[4/6]')) :
              i === 2 ? (logStr.includes('[4/6]') && !logStr.includes('[5/6]') && !logStr.includes('[6/6]')) :
              logStr.includes('[6/6]') && genStatus !== 'completed';

            return (
              <div key={i} className="flex items-center gap-3 text-sm">
                {stepDone ? (
                  <Check size={14} className="text-green-400" />
                ) : stepActive ? (
                  <Loader2 size={14} className="text-violet-400 animate-spin" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-white/20" />
                )}
                <span className={stepDone ? 'text-zinc-400' : stepActive ? 'text-white' : 'text-zinc-600'}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Logs Terminal */}
        <div className="bg-[#0c0c0e] rounded-xl border border-white/10 overflow-hidden">
          <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between bg-white/5">
            <span className="text-xs font-mono text-zinc-400 flex items-center gap-2">
              <Terminal size={12} /> Generation Logs
            </span>
            <button onClick={onToggleLogs} className="text-zinc-500 hover:text-white transition-colors">
              <ChevronDown size={14} className={logsExpanded ? '' : 'rotate-180'} />
            </button>
          </div>
          {logsExpanded && (
            <div className="p-4 max-h-64 overflow-y-auto font-mono text-xs space-y-1 custom-scrollbar">
              {genLogs.map((log, i) => (
                <div key={i} className={`${log.toLowerCase().includes('error') ? 'text-red-400' : log.includes('✅') ? 'text-green-400' : 'text-zinc-400'}`}>
                  {log}
                </div>
              ))}
              {genStatus === 'processing' && (
                <div className="animate-pulse text-violet-400/70">_</div>
              )}
            </div>
          )}
        </div>

        {/* Retry button when failed */}
        {genStatus === 'failed' && (
          <div className="mt-4 p-4 bg-red-500/5 border border-red-500/20 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-red-400 shrink-0" />
              <span className="text-sm text-red-300">Generation failed. You can retry or go back to change settings.</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onBackToSettings}
                className="btn-secondary px-4 py-2 text-sm flex items-center gap-2"
              >
                <ChevronLeft size={14} /> Change Voice/Settings
              </button>
              <button
                onClick={onRetry}
                disabled={generating}
                className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
              >
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
