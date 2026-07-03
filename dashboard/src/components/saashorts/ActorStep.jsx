import React from 'react';
import { User, Upload, Loader2, Check, AlertCircle } from 'lucide-react';

export default function ActorStep({
  actorGallery,
  loadingGallery,
  selectedActor,
  onSelectActor,
  uploadedActorPreview,
  onUploadActor,
  actorDescription,
  onActorDescriptionChange,
  onGenerateActors,
  actorOptions,
  generatingActors,
  falKey,
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
        <User size={14} /> AI Actor — Choose Your Actor
      </label>

      {/* Existing Gallery from S3 */}
      {actorGallery.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-zinc-400 mb-2">Previously generated actors (click to select):</p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
            {actorGallery.map((img, i) => (
              <button
                key={img.url}
                onClick={() => onSelectActor(img.url)}
                className={`relative rounded-lg overflow-hidden border-2 transition-all aspect-[3/4] ${
                  selectedActor === img.url ? 'border-violet-500 ring-2 ring-violet-500/30 scale-[1.02]' : 'border-white/10 hover:border-white/30'
                }`}
              >
                <img src={img.url} alt={`Actor ${i+1}`} className="w-full h-full object-cover" />
                {selectedActor === img.url && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center shadow-lg">
                    <Check size={10} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      {loadingGallery && (
        <p className="text-xs text-zinc-500 mb-3 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Loading actor gallery...</p>
      )}

      {/* Upload Custom Actor */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <label className="flex-1 flex items-center justify-center gap-2 text-sm bg-white/5 text-zinc-400 px-4 py-3 rounded-lg border border-dashed border-white/20 hover:bg-white/10 hover:border-white/30 transition-colors cursor-pointer">
            <Upload size={14} />
            <span>Upload your own photo</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                onUploadActor(file);
                e.target.value = '';
              }}
            />
          </label>
          {uploadedActorPreview && (
            <button
              onClick={() => {
                if (uploadedActorPreview.serverUrl) {
                  onSelectActor(uploadedActorPreview.serverUrl);
                }
              }}
              className={`relative w-16 h-20 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                selectedActor === uploadedActorPreview.serverUrl
                  ? 'border-violet-500 ring-2 ring-violet-500/30'
                  : 'border-white/20 hover:border-white/40'
              }`}
            >
              <img src={uploadedActorPreview.localPreview} alt="Uploaded" className="w-full h-full object-cover" />
              {selectedActor === uploadedActorPreview.serverUrl && (
                <div className="absolute top-1 right-1 w-4 h-4 bg-violet-500 rounded-full flex items-center justify-center">
                  <Check size={8} className="text-white" />
                </div>
              )}
              {!uploadedActorPreview.serverUrl && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 size={12} className="animate-spin text-white" />
                </div>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Generate New Actors */}
      <p className="text-xs text-zinc-500 mb-2">{actorGallery.length > 0 ? 'Or generate new actors:' : 'Or describe your actor:'}</p>
      <textarea
        value={actorDescription}
        onChange={(e) => { onActorDescriptionChange(e.target.value); }}
        rows={2}
        className="input-field resize-none text-sm"
        placeholder="e.g. A young woman in her late 20s, dark hair, casual outfit..."
      />

      <button
        onClick={onGenerateActors}
        disabled={generatingActors || !falKey || !actorDescription}
        className="mt-2 w-full text-sm bg-violet-500/20 text-violet-300 px-4 py-2.5 rounded-lg hover:bg-violet-500/30 transition-colors disabled:opacity-40 flex items-center justify-center gap-2 font-medium"
      >
        {generatingActors ? <><Loader2 size={14} className="animate-spin" /> Generating 3 actors...</> : <><User size={14} /> {actorOptions.length > 0 ? 'Regenerate Actors' : 'Generate 3 New Actors'} (~$0.06)</>}
      </button>

      {/* Newly Generated Actor Options */}
      {actorOptions.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-zinc-400 mb-2">New actors (select one):</p>
          <div className="grid grid-cols-3 gap-3">
            {actorOptions.map((imgUrl, i) => (
              <button
                key={imgUrl}
                onClick={() => onSelectActor(imgUrl)}
                className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-[9/16] ${
                  selectedActor === imgUrl ? 'border-violet-500 ring-2 ring-violet-500/30 scale-[1.02]' : 'border-white/10 hover:border-white/30'
                }`}
              >
                <img src={imgUrl} alt={`New ${i+1}`} className="w-full h-full object-cover" />
                {selectedActor === imgUrl && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center shadow-lg">
                    <Check size={12} className="text-white" />
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <span className="text-[10px] text-white/80">New {i+1}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!selectedActor && (actorOptions.length > 0 || actorGallery.length > 0) && (
        <p className="text-xs text-amber-400 mt-2 flex items-center gap-1"><AlertCircle size={12} /> Select an actor to continue</p>
      )}
    </div>
  );
}
