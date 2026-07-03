import React, { useState, useRef } from 'react';
import { Scissors, Trash2, ArrowUp, ArrowDown, Play, Pause, Save, Pipette, Columns, Maximize2, Clock } from 'lucide-react';
import { getApiUrl } from '../config';

const POSITIONS = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
];

export default function VideoEditor({ clips, jobId, onUpdate }) {
  const [segments, setSegments] = useState(clips.map((c, i) => ({
    id: i,
    path: c.video_url,
    start: c.start || 0,
    end: c.end || 30,
    originalIndex: i,
  })));
  const [selectedId, setSelectedId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('trim'); // trim, pip, split
  const [pipConfig, setPipConfig] = useState({
    overlayVideo: '',
    position: 'bottom-right',
    overlaySize: 0.3,
    startSec: null,
    endSec: null,
  });
  const [splitConfig, setSplitConfig] = useState({
    rightVideo: '',
    layout: 'horizontal',
  });
  const videoRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);

  const selected = segments.find(s => s.id === selectedId);

  const handleTrim = async () => {
    if (!selected) return;
    setIsProcessing(true);
    try {
      const res = await fetch(getApiUrl('/api/edit/manual/trim'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_path: selected.path,
          start_sec: selected.start,
          end_sec: selected.end,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ type: 'trim', path: data.path, duration: data.duration });
        if (onUpdate) onUpdate({ type: 'trim', ...data });
      }
    } catch (e) {
      console.error('Trim failed:', e);
    }
    setIsProcessing(false);
  };

  const handleConcat = async () => {
    if (segments.length < 2) return;
    setIsProcessing(true);
    try {
      const res = await fetch(getApiUrl('/api/edit/manual/concat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segments: segments.map(s => ({ path: s.path })) }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ type: 'concat', path: data.path });
        if (onUpdate) onUpdate({ type: 'concat', ...data });
      }
    } catch (e) {
      console.error('Concat failed:', e);
    }
    setIsProcessing(false);
  };

  const handlePip = async () => {
    if (!selected) return;
    setIsProcessing(true);
    try {
      const res = await fetch(getApiUrl('/api/edit/manual/pip'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          main_video: selected.path,
          overlay_video: pipConfig.overlayVideo,
          position: pipConfig.position,
          overlay_size: pipConfig.overlaySize,
          start_sec: pipConfig.startSec,
          end_sec: pipConfig.endSec,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ type: 'pip', path: data.path });
        if (onUpdate) onUpdate({ type: 'pip', ...data });
      }
    } catch (e) {
      console.error('PiP failed:', e);
    }
    setIsProcessing(false);
  };

  const handleSplit = async () => {
    if (!selected) return;
    setIsProcessing(true);
    try {
      const res = await fetch(getApiUrl('/api/edit/manual/split-screen'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          left_video: selected.path,
          right_video: splitConfig.rightVideo,
          layout: splitConfig.layout,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ type: 'split', path: data.path });
        if (onUpdate) onUpdate({ type: 'split', ...data });
      }
    } catch (e) {
      console.error('Split screen failed:', e);
    }
    setIsProcessing(false);
  };

  const moveSegment = (id, direction) => {
    const idx = segments.findIndex(s => s.id === id);
    if (idx === -1) return;
    const newSegments = [...segments];
    const target = idx + direction;
    if (target < 0 || target >= newSegments.length) return;
    [newSegments[idx], newSegments[target]] = [newSegments[target], newSegments[idx]];
    setSegments(newSegments);
  };

  const removeSegment = (id) => {
    setSegments(segments.filter(s => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        {['trim', 'pip', 'split'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab ? 'bg-primary/20 text-primary' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {tab === 'trim' && <Scissors size={14} />}
            {tab === 'pip' && <Pipette size={14} />}
            {tab === 'split' && <Columns size={14} />}
            {tab === 'trim' ? 'Trim & Concat' : tab === 'pip' ? 'Picture in Picture' : 'Split Screen'}
          </button>
        ))}
      </div>

      {/* Segment Timeline */}
      <div className="bg-white/5 rounded-xl p-4 space-y-2">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <Clock size={14} /> Timeline ({segments.length} segments)
        </h4>
        {segments.map((seg, i) => (
          <div
            key={seg.id}
            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
              selectedId === seg.id ? 'bg-primary/20 border border-primary/30' : 'bg-white/5 hover:bg-white/10'
            }`}
            onClick={() => setSelectedId(seg.id)}
          >
            <span className="text-xs text-zinc-500 w-6">{i + 1}</span>
            <span className="flex-1 text-xs text-zinc-300 truncate">{seg.path.split('/').pop()}</span>
            <span className="text-[10px] text-zinc-500">
              {formatTime(seg.start)} - {formatTime(seg.end)}
              <span className="ml-1">({(seg.end - seg.start).toFixed(0)}s)</span>
            </span>
            <div className="flex gap-1">
              <button onClick={(e) => { e.stopPropagation(); moveSegment(seg.id, -1); }} disabled={i === 0}
                className="p-1 text-zinc-500 hover:text-white disabled:opacity-30">
                <ArrowUp size={12} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); moveSegment(seg.id, 1); }} disabled={i === segments.length - 1}
                className="p-1 text-zinc-500 hover:text-white disabled:opacity-30">
                <ArrowDown size={12} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); removeSegment(seg.id); }}
                className="p-1 text-zinc-500 hover:text-red-400">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Editor Panel */}
      {activeTab === 'trim' && selected && (
        <div className="bg-white/5 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-white">Trim Segment</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">Start (seconds)</label>
              <input type="number" value={selected.start} min={0}
                onChange={(e) => setSegments(segments.map(s => s.id === selected.id ? {...s, start: +e.target.value} : s))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">End (seconds)</label>
              <input type="number" value={selected.end} min={0}
                onChange={(e) => setSegments(segments.map(s => s.id === selected.id ? {...s, end: +e.target.value} : s))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none" />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleTrim} disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-1.5 bg-primary/20 text-primary rounded-lg py-2 text-xs font-medium hover:bg-primary/30 disabled:opacity-50">
              <Scissors size={14} /> {isProcessing ? 'Trimming...' : 'Trim Segment'}
            </button>
            {segments.length >= 2 && (
              <button onClick={handleConcat} disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-1.5 bg-violet-500/20 text-violet-400 rounded-lg py-2 text-xs font-medium hover:bg-violet-500/30 disabled:opacity-50">
                <Maximize2 size={14} /> {isProcessing ? 'Merging...' : 'Concat All'}
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'pip' && selected && (
        <div className="bg-white/5 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Pipette size={14} /> Picture in Picture
          </h4>

          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">Overlay Video URL or Path</label>
            <input type="text" value={pipConfig.overlayVideo}
              onChange={(e) => setPipConfig({...pipConfig, overlayVideo: e.target.value})}
              placeholder="/videos/clip_xxx.mp4"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">Position</label>
              <select value={pipConfig.position}
                onChange={(e) => setPipConfig({...pipConfig, position: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none">
                {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">Size ({Math.round(pipConfig.overlaySize * 100)}%)</label>
              <input type="range" min="0.1" max="0.6" step="0.05" value={pipConfig.overlaySize}
                onChange={(e) => setPipConfig({...pipConfig, overlaySize: +e.target.value})}
                className="w-full accent-primary" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">Start (optional, sec)</label>
              <input type="number" value={pipConfig.startSec || ''} min={0}
                onChange={(e) => setPipConfig({...pipConfig, startSec: e.target.value ? +e.target.value : null})}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">End (optional, sec)</label>
              <input type="number" value={pipConfig.endSec || ''} min={0}
                onChange={(e) => setPipConfig({...pipConfig, endSec: e.target.value ? +e.target.value : null})}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none" />
            </div>
          </div>

          <button onClick={handlePip} disabled={isProcessing || !pipConfig.overlayVideo}
            className="w-full flex items-center justify-center gap-1.5 bg-primary/20 text-primary rounded-lg py-2 text-xs font-medium hover:bg-primary/30 disabled:opacity-50">
            <Pipette size={14} /> {isProcessing ? 'Processing...' : 'Apply Picture in Picture'}
          </button>
        </div>
      )}

      {activeTab === 'split' && selected && (
        <div className="bg-white/5 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Columns size={14} /> Split Screen
          </h4>

          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">Second Video URL or Path</label>
            <input type="text" value={splitConfig.rightVideo}
              onChange={(e) => setSplitConfig({...splitConfig, rightVideo: e.target.value})}
              placeholder="/videos/clip_xxx.mp4"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none" />
          </div>

          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">Layout</label>
            <div className="flex gap-2">
              {[
                { value: 'horizontal', label: 'Side by Side' },
                { value: 'vertical', label: 'Top / Bottom' },
              ].map(l => (
                <button key={l.value}
                  onClick={() => setSplitConfig({...splitConfig, layout: l.value})}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                    splitConfig.layout === l.value ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/5 text-zinc-400 hover:text-white border border-white/10'
                  }`}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleSplit} disabled={isProcessing || !splitConfig.rightVideo}
            className="w-full flex items-center justify-center gap-1.5 bg-primary/20 text-primary rounded-lg py-2 text-xs font-medium hover:bg-primary/30 disabled:opacity-50">
            <Columns size={14} /> {isProcessing ? 'Processing...' : 'Create Split Screen'}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 space-y-2">
          <p className="text-xs text-green-400 font-semibold">
            {result.type === 'trim' ? '✅ Segment trimmed' : 
             result.type === 'concat' ? '✅ Videos concatenated' :
             result.type === 'pip' ? '✅ PiP applied' : '✅ Split screen created'}
          </p>
          <video src={getApiUrl(result.path)} controls className="w-full rounded-lg max-h-64" />
          <a href={getApiUrl(result.path)} download
            className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300">
            <Save size={12} /> Download result
          </a>
        </div>
      )}
    </div>
  );
}
