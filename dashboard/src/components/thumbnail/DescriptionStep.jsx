import React from 'react';
import { ArrowLeft, ArrowRight, Sparkles, FileText, Loader2, Check } from 'lucide-react';
import { getApiUrl } from '../../config';

export default function DescriptionStep({
  mode,
  selectedThumbnail,
  selectedTitle,
  onBackToThumbnails,
  onGenerateDescription,
  isDescribing,
  description,
  onDescriptionChange,
  onNextToPublish,
}) {
  return (
    <div className="grid md:grid-cols-5 gap-6">
      {/* Left: Context & Controls */}
      <div className="md:col-span-2 space-y-4">
        <button
          onClick={onBackToThumbnails}
          className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1 mb-2"
        >
          <ArrowLeft size={12} /> Back to Generate
        </button>

        {/* Selected Thumbnail Preview */}
        {selectedThumbnail && (
          <div className="glass-panel overflow-hidden">
            <img
              src={getApiUrl(selectedThumbnail)}
              alt="Selected thumbnail"
              className="w-full aspect-video object-cover"
            />
            <div className="p-3">
              <span className="text-xs text-green-400 flex items-center gap-1"><Check size={10} /> Selected Thumbnail</span>
            </div>
          </div>
        )}

        {/* Title */}
        <div className="glass-panel p-6 space-y-3">
          <h3 className="text-sm font-semibold text-white">Video Title</h3>
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary">
            {selectedTitle}
          </div>
        </div>

        {/* Generate Description Button */}
        {mode === 'video' && (
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles size={14} className="text-yellow-400" />
                AI Description
              </h3>
              <span className="text-[10px] text-zinc-600">with chapters</span>
            </div>
            <p className="text-xs text-zinc-500">
              Generate a YouTube description with chapter timestamps from your video transcript.
            </p>
            <button
              onClick={onGenerateDescription}
              disabled={isDescribing}
              className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors border border-red-500/20 disabled:opacity-50"
            >
              {isDescribing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Generating description...
                </>
              ) : (
                <>
                  <FileText size={14} />
                  {description ? 'Regenerate Description' : 'Generate Description'}
                </>
              )}
            </button>
          </div>
        )}

        {/* Next: Publish */}
        {description && (
          <button
            onClick={onNextToPublish}
            className="w-full btn-primary py-4 text-sm font-bold flex items-center justify-center gap-2"
          >
            <ArrowRight size={16} />
            Next: Publish
          </button>
        )}
      </div>

      {/* Right: Editable Description */}
      <div className="md:col-span-3 space-y-4">
        <div className="glass-panel p-6 space-y-4 h-full flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileText size={14} className="text-red-400" />
              YouTube Description
            </h3>
            <span className="text-[10px] text-zinc-600">{description.length}/5000</span>
          </div>

          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder={mode === 'video'
              ? "Click 'Generate Description' to auto-generate with chapters, or write your own..."
              : "Write your YouTube video description here..."
            }
            className="input-field text-sm resize-none flex-1 min-h-[500px] font-mono custom-scrollbar"
            maxLength={5000}
          />

          {!description && (
            <p className="text-xs text-zinc-600">
              {mode === 'video'
                ? "AI will generate a compelling description with chapter timestamps from your video's Whisper transcript."
                : "Write a description for your YouTube video. You can proceed to publish once you have a description."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
