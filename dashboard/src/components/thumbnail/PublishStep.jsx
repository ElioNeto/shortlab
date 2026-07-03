import React from 'react';
import { ArrowLeft, AlertCircle, Settings, Loader2, Youtube, CheckCircle2, FileText, Check } from 'lucide-react';
import { getApiUrl } from '../../config';

export default function ThumbnailPublishStep({
  selectedThumbnail,
  selectedTitle,
  onTitleChange,
  description,
  onDescriptionChange,
  onBackToDescription,
  onPublish,
  isPublishing,
  publishResult,
  uploadPostKey,
  uploadUserId,
}) {
  return (
    <div className="grid md:grid-cols-5 gap-6">
      {/* Left: Summary & Publish */}
      <div className="md:col-span-2 space-y-4">
        <button
          onClick={onBackToDescription}
          className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1 mb-2"
        >
          <ArrowLeft size={12} /> Back to Description
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

        {/* Editable Title */}
        <div className="glass-panel p-6 space-y-3">
          <h3 className="text-sm font-semibold text-white">Video Title</h3>
          <input
            type="text"
            value={selectedTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            className="input-field text-sm"
            maxLength={100}
          />
        </div>

        {/* Publish Button */}
        {(!uploadPostKey || !uploadUserId) ? (
          <div className="glass-panel p-6 space-y-3">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertCircle size={16} />
              <span className="text-sm font-medium">Upload-Post Not Configured</span>
            </div>
            <p className="text-xs text-zinc-500">
              To publish directly to YouTube, configure your Upload-Post API key and connect a profile in Settings.
            </p>
            <button
              onClick={() => {}}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Settings size={12} /> Go to Settings
            </button>
          </div>
        ) : (
          <button
            onClick={onPublish}
            disabled={isPublishing}
            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPublishing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Publishing to YouTube...
              </>
            ) : (
              <>
                <Youtube size={16} />
                Publish to YouTube
              </>
            )}
          </button>
        )}

        {/* Publish Result */}
        {publishResult && (
          <div className={`glass-panel p-4 ${publishResult.success ? 'border-green-500/30' : 'border-red-500/30'}`}>
            {publishResult.success ? (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 size={16} />
                <div>
                  <p className="text-sm font-medium">Published successfully!</p>
                  <p className="text-xs text-zinc-500 mt-1">Your video is being uploaded to YouTube asynchronously.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle size={16} />
                <div>
                  <p className="text-sm font-medium">Publish failed</p>
                  <p className="text-xs text-zinc-500 mt-1">{publishResult.error}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Description Preview (read-only feel, still editable) */}
      <div className="md:col-span-3 space-y-4">
        <div className="glass-panel p-6 space-y-4 h-full flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileText size={14} className="text-red-400" />
              YouTube Description
            </h3>
            <button
              onClick={onBackToDescription}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <ArrowLeft size={10} /> Edit
            </button>
          </div>

          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            className="input-field text-sm resize-none flex-1 min-h-[500px] font-mono custom-scrollbar"
            maxLength={5000}
          />
        </div>
      </div>
    </div>
  );
}
