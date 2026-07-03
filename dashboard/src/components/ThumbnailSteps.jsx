// TODO: This is an extract of common step components used in ThumbnailStudio.
// As the component gets split, move related sub-components here.

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Check, X } from 'lucide-react';

export const STEPS = ['Input', 'Titles', 'Generate', 'Description', 'Publish'];

/** Reusable step indicator bar */
export function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <React.Fragment key={label}>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            i < currentStep ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
            i === currentStep ? 'bg-primary/20 text-primary border border-primary/30' :
            'bg-white/5 text-zinc-500 border border-white/5'
          }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              i < currentStep ? 'bg-green-500 text-black' :
              i === currentStep ? 'bg-primary text-black' :
              'bg-white/10 text-zinc-500'
            }`}>
              {i < currentStep ? <Check size={10} /> : i + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-8 h-px ${i < currentStep ? 'bg-green-500/50' : 'bg-white/10'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/** Drag-and-drop file upload zone with preview */
export function DragDropZone({ label, accept, onFile, file, onClear, icon: Icon }) {
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
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
        isDragging ? 'border-primary/50 bg-primary/5' : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
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
