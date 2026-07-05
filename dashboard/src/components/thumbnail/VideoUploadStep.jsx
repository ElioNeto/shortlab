import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Video, Type, ArrowRight, Sparkles, Check, Loader2, X } from 'lucide-react';

function DragDropZone({ label, accept, onFile, file, onClear, icon: Icon }) {
  const [isDragging, setIsDragging] = useState(false);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (file) {
      if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
      setThumbnailPreviewUrl(URL.createObjectURL(file));
    }
    return () => {
      if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
    };
  }, [file]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  if (file) {
    return (
      <div className="relative border border-white/10 rounded-xl p-3 bg-white/5">
        <div className="flex items-center gap-3">
          {file.type?.startsWith('image/') ? (
            <img src={thumbnailPreviewUrl} className="w-12 h-12 rounded-lg object-cover" alt="" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
              <Icon size={20} className="text-zinc-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{file.name}</p>
            <p className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
          <button onClick={onClear} className="text-zinc-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragging ? 'border-primary/50 bg-primary/5' : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
        }`}
    >
      <Icon size={24} className="mx-auto text-zinc-500 mb-2" />
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="text-xs text-zinc-600 mt-1">Drop or click to upload</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
      />
    </div>
  );
}

export default function VideoUploadStep({
  geminiApiKey,
  isAnalyzing,
  isPreprocessing,
  preprocessSessionId,
  videoFile,
  onVideoFileChange,
  onVideoClear,
  manualTitle,
  onManualTitleChange,
  onAnalyze,
  onManualMode,
}) {
  return (
    <div className={`grid md:grid-cols-2 gap-6 ${!geminiApiKey ? 'opacity-50 pointer-events-none select-none' : ''}`}>
      {/* Mode A: Video Analysis */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Video size={16} className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Analyze Video</h3>
            <p className="text-xs text-zinc-500">AI suggests viral titles from your content</p>
          </div>
        </div>

        <DragDropZone
          label="Upload video file"
          accept="video/*"
          onFile={onVideoFileChange}
          file={videoFile}
          onClear={onVideoClear}
          icon={Video}
        />

        {isPreprocessing && (
          <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
            <Loader2 size={12} className="animate-spin" />
            Pre-processing video (Whisper transcription starting)...
          </div>
        )}
        {preprocessSessionId && !isPreprocessing && (
          <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
            <Check size={12} />
            Video uploaded — transcription running in background
          </div>
        )}

        <button
          onClick={onAnalyze}
          disabled={isAnalyzing || !videoFile}
          className="w-full btn-primary py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Analyzing video...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Analyze & Get Titles
            </>
          )}
        </button>
      </div>

      {/* Mode B: Manual Title */}
      <div className="glass-panel p-6 space-y-4 flex flex-col">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Type size={16} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Write Your Own</h3>
            <p className="text-xs text-zinc-500">Skip analysis, enter your title directly</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <input
            type="text"
            value={manualTitle}
            onChange={(e) => onManualTitleChange(e.target.value)}
            placeholder="Enter your YouTube title..."
            className="input-field text-sm mb-4"
            maxLength={70}
          />
          <p className="text-xs text-zinc-600 mb-4">{manualTitle.length}/70 characters</p>
        </div>

        <button
          onClick={onManualMode}
          disabled={!manualTitle.trim()}
          className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowRight size={16} />
          Use This Title
        </button>
      </div>
    </div>
  );
}
