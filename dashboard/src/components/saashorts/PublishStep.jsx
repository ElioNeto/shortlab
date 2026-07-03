import React from 'react';
import { Sparkles, Download, RefreshCw, Check, Copy, Share2, Loader2, Calendar, AlertCircle } from 'lucide-react';
import { getApiUrl } from '../../config';

export default function PublishStep({
  genResult,
  onCopy,
  copied,
  onNewVideo,
  uploadPostKey,
  publishPlatforms,
  onTogglePlatform,
  isScheduling,
  onToggleSchedule,
  scheduleDate,
  onScheduleDateChange,
  onPublish,
  publishing,
  publishResult,
}) {
  if (!genResult) return null;

  return (
    <div className="animate-[fadeIn_0.3s_ease-out] space-y-6">
      <div className="glass-panel p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="text-yellow-400" size={18} />
          Your SaaS Short is Ready!
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video Player */}
          <div className="aspect-[9/16] max-h-[500px] bg-black rounded-xl overflow-hidden relative">
            <video
              src={getApiUrl(genResult.video_url)}
              controls
              className="w-full h-full object-contain"
              autoPlay
            />
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-zinc-300 mb-1">{genResult.script?.title}</h3>
              <p className="text-xs text-zinc-500">{genResult.duration?.toFixed(1)}s &middot; 9:16 vertical</p>
            </div>

            {/* Cost breakdown */}
            {genResult.cost_estimate && (
              <div className="p-3 bg-white/5 rounded-lg border border-white/10 space-y-1">
                <div className="text-xs font-semibold text-zinc-300 mb-2">Cost Breakdown</div>
                {Object.entries(genResult.cost_estimate).filter(([k]) => k !== 'total').map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-zinc-500">{k.replace(/_/g, ' ')}</span>
                    <span className="text-zinc-400">${v}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-semibold border-t border-white/10 pt-1 mt-1">
                  <span className="text-zinc-300">Total</span>
                  <span className="text-green-400">${genResult.cost_estimate.total}</span>
                </div>
              </div>
            )}

            {/* Caption */}
            {genResult.script?.caption && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-zinc-400">Caption</span>
                  <button
                    onClick={() => onCopy(genResult.script.caption, 'caption')}
                    className="text-xs text-zinc-500 hover:text-white flex items-center gap-1"
                  >
                    {copied === 'caption' ? <Check size={10} /> : <Copy size={10} />}
                    {copied === 'caption' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-zinc-400 bg-white/5 p-2 rounded-lg">{genResult.script.caption}</p>
              </div>
            )}

            {/* Hashtags */}
            {genResult.script?.hashtags && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-zinc-400">Hashtags</span>
                  <button
                    onClick={() => onCopy(genResult.script.hashtags.join(' '), 'hashtags')}
                    className="text-xs text-zinc-500 hover:text-white flex items-center gap-1"
                  >
                    {copied === 'hashtags' ? <Check size={10} /> : <Copy size={10} />}
                    {copied === 'hashtags' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {genResult.script.hashtags.map((tag, i) => (
                    <span key={i} className="text-[10px] bg-violet-500/10 text-violet-300 px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <a
                href={getApiUrl(genResult.video_url)}
                download
                className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
              >
                <Download size={14} /> Download
              </a>
              <button
                onClick={onNewVideo}
                className="btn-secondary px-4 py-2 text-sm flex items-center gap-2"
              >
                <RefreshCw size={14} /> New Video
              </button>
            </div>

            {/* Publish to Social Media */}
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3 mt-2">
              <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <Share2 size={14} /> Publish to Social Media
              </h3>

              {!uploadPostKey ? (
                <p className="text-xs text-zinc-500">Set your Upload-Post API key in Settings to enable publishing.</p>
              ) : (
                <>
                  {/* Platform checkboxes */}
                  <div className="flex gap-4">
                    {[
                      { id: 'tiktok', label: 'TikTok', icon: '🎵' },
                      { id: 'instagram', label: 'Instagram', icon: '📸' },
                      { id: 'youtube', label: 'YouTube', icon: '▶️' },
                    ].map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={publishPlatforms[p.id]}
                          onChange={(e) => onTogglePlatform(p.id, e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-zinc-600 bg-black/50 text-violet-500 focus:ring-violet-500"
                        />
                        <span>{p.icon}</span> {p.label}
                      </label>
                    ))}
                  </div>

                  {/* Schedule toggle */}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isScheduling}
                        onChange={(e) => onToggleSchedule(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-zinc-600 bg-black/50 text-violet-500 focus:ring-violet-500"
                      />
                      <Calendar size={12} /> Schedule
                    </label>
                    {isScheduling && (
                      <input
                        type="datetime-local"
                        value={scheduleDate}
                        onChange={(e) => onScheduleDateChange(e.target.value)}
                        className="input-field text-xs py-1 px-2 w-auto"
                      />
                    )}
                  </div>

                  {/* Publish button */}
                  <button
                    onClick={onPublish}
                    disabled={publishing}
                    className="w-full btn-primary py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {publishing ? (
                      <><Loader2 size={14} className="animate-spin" /> {isScheduling ? 'Scheduling...' : 'Publishing...'}</>
                    ) : (
                      <><Share2 size={14} /> {isScheduling ? 'Schedule Post' : 'Publish Now'}</>
                    )}
                  </button>

                  {publishResult && (
                    <p className={`text-xs ${publishResult.ok ? 'text-green-400' : 'text-red-400'}`}>
                      {publishResult.msg}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
