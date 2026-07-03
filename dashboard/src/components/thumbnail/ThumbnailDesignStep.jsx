import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Image, Loader2, Sparkles, ArrowLeft, ArrowRight, Download, Check, X } from 'lucide-react';
import { getApiUrl } from '../../config';

function DragDropZone({ label, accept, onFile, file, onClear, icon: Icon }) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    }
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
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
          <img src={previewUrl} className="w-12 h-12 rounded-lg object-cover" alt="" />
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

export default function ThumbnailDesignStep({
  selectedTitle,
  onBackToTitles,
  faceImage,
  onFaceImageChange,
  onFaceImageClear,
  bgImage,
  onBgImageChange,
  onBgImageClear,
  extraPrompt,
  onExtraPromptChange,
  thumbnailCount,
  onThumbnailCountChange,
  onGenerate,
  isGenerating,
  generatedThumbnails,
  selectedThumbnail,
  onSelectThumbnail,
  onNextToDescription,
}) {
  const handleDownload = async (url) => {
    try {
      const response = await fetch(getApiUrl(url));
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = url.split('/').pop() || 'thumbnail.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      window.open(getApiUrl(url), '_blank');
    }
  };

  return (
    <div className="grid md:grid-cols-5 gap-6">
      {/* Left: Controls */}
      <div className="md:col-span-2 space-y-4">
        <div className="glass-panel p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white mb-1">Selected Title</h3>
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary">
            {selectedTitle}
          </div>
          <button
            onClick={onBackToTitles}
            className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
          >
            <ArrowLeft size={12} /> Change title
          </button>
        </div>

        <div className="glass-panel p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white">Face Image <span className="text-zinc-600 font-normal">(optional)</span></h3>
          <DragDropZone
            label="Upload face / person photo"
            accept="image/*"
            onFile={onFaceImageChange}
            file={faceImage}
            onClear={onFaceImageClear}
            icon={Upload}
          />
        </div>

        <div className="glass-panel p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white">Background Image <span className="text-zinc-600 font-normal">(optional)</span></h3>
          <DragDropZone
            label="Upload background image"
            accept="image/*"
            onFile={onBgImageChange}
            file={bgImage}
            onClear={onBgImageClear}
            icon={Image}
          />
        </div>

        <div className="glass-panel p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white">Extra Instructions <span className="text-zinc-600 font-normal">(optional)</span></h3>
          <textarea
            value={extraPrompt}
            onChange={(e) => onExtraPromptChange(e.target.value)}
            placeholder="e.g. Use red and black colors, dramatic lighting, include money emojis..."
            className="input-field text-sm resize-none h-20"
          />
        </div>

        <div className="glass-panel p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white">Number of Thumbnails</h3>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(n => (
              <button
                key={n}
                onClick={() => onThumbnailCountChange(n)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${thumbnailCount === n
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10'
                  }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="w-full btn-primary py-4 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Generating thumbnails...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Generate Thumbnails
            </>
          )}
        </button>
      </div>

      {/* Right: Generated Thumbnails */}
      <div className="md:col-span-3">
        {generatedThumbnails.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-400">Generated Thumbnails — click to select for publishing</h3>
            <div className="grid gap-4">
              {generatedThumbnails.map((url, i) => (
                <div
                  key={i}
                  onClick={() => onSelectThumbnail(url)}
                  className={`glass-panel overflow-hidden group relative cursor-pointer transition-all ${selectedThumbnail === url ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
                    }`}
                >
                  <img
                    src={getApiUrl(url)}
                    alt={`Thumbnail ${i + 1}`}
                    className="w-full aspect-video object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownload(url); }}
                      className="bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-zinc-200 transition-colors"
                    >
                      <Download size={14} />
                      Download
                    </button>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-xs text-zinc-500 flex items-center gap-2">
                      Thumbnail {i + 1}
                      {selectedThumbnail === url && (
                        <span className="text-primary flex items-center gap-1"><Check size={10} /> Selected</span>
                      )}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownload(url); }}
                      className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
                    >
                      <Download size={12} /> Save
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Regenerate */}
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className="w-full py-3 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors border border-white/10 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Regenerate
                </>
              )}
            </button>

            {/* Proceed to Description */}
            {selectedThumbnail && (
              <button
                onClick={onNextToDescription}
                className="w-full btn-primary py-4 text-sm font-bold flex items-center justify-center gap-2"
              >
                <ArrowRight size={16} />
                Next: Description
              </button>
            )}
          </div>
        ) : isGenerating ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-4 min-h-[400px]">
            <div className="w-16 h-16 rounded-full border-2 border-zinc-800 border-t-primary animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-400">Generating thumbnails...</p>
              <p className="text-xs text-zinc-600 mt-1">This may take a minute per thumbnail</p>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-4 min-h-[400px]">
            <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Image size={32} className="text-zinc-600" />
            </div>
            <div className="text-center">
              <p className="text-sm text-zinc-400">Your thumbnails will appear here</p>
              <p className="text-xs text-zinc-600 mt-1">Configure options and click Generate</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
