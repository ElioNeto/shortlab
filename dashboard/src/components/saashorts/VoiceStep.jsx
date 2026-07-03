import React from 'react';
import { Volume2, Check } from 'lucide-react';

export default function VoiceStep({
  voices,
  selectedVoice,
  onSelectVoice,
  language,
  actorGender,
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
        <Volume2 size={14} /> Voice {language === 'es' ? '(Spanish)' : '(English)'}
      </label>
      {(() => {
        // Filter voices by language/accent
        const filtered = voices.length > 0
          ? voices.filter((v) => {
              const gender = (v.labels?.gender || '').toLowerCase();
              return gender === actorGender;
            })
            .sort((a, b) => {
              const aAccent = (a.labels?.accent || '').toLowerCase();
              const bAccent = (b.labels?.accent || '').toLowerCase();
              if (language === 'es') {
                const aScore = (aAccent.includes('spanish') || aAccent.includes('latin')) ? 0 : 1;
                const bScore = (bAccent.includes('spanish') || bAccent.includes('latin')) ? 0 : 1;
                return aScore - bScore;
              }
              const aScore = (aAccent.includes('american') || aAccent.includes('british')) ? 0 : 1;
              const bScore = (bAccent.includes('american') || bAccent.includes('british')) ? 0 : 1;
              return aScore - bScore;
            })
          : [];

        if (filtered.length > 0) {
          return (
            <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
              {filtered.map((v) => (
                <button
                  key={v.voice_id}
                  onClick={() => onSelectVoice(v.voice_id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                    selectedVoice === v.voice_id
                      ? 'border-violet-500/50 bg-violet-500/10 text-violet-300'
                      : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{v.name}</div>
                    <div className="text-[10px] text-zinc-500">
                      {v.labels?.accent || ''} {v.labels?.gender || ''} {v.category ? `· ${v.category}` : ''}
                    </div>
                  </div>
                  {v.preview_url && (
                    <button
                      onClick={(e) => { e.stopPropagation(); new Audio(v.preview_url).play(); }}
                      className="shrink-0 w-7 h-7 rounded-full bg-white/10 hover:bg-violet-500/30 flex items-center justify-center transition-colors"
                      title="Preview voice"
                    >
                      <Volume2 size={12} />
                    </button>
                  )}
                  {selectedVoice === v.voice_id && <Check size={14} className="text-violet-400 shrink-0" />}
                </button>
              ))}
            </div>
          );
        }

        // Fallback defaults by gender + language
        const defaults = {
          'en-female': [
            { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (calm)' },
            { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (soft)' },
          ],
          'en-male': [
            { id: '29vD33N1CtxCmqQRPOHJ', name: 'Drew (confident)' },
            { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh (deep)' },
            { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam (raspy)' },
          ],
          'es-female': [
            { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (suave)' },
            { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (calmada)' },
          ],
          'es-male': [
            { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (cálido)' },
            { id: '29vD33N1CtxCmqQRPOHJ', name: 'Drew (confiado)' },
          ],
        };
        const key = `${language}-${actorGender}`;
        const opts = defaults[key] || defaults['en-female'];
        return (
          <select value={selectedVoice} onChange={(e) => onSelectVoice(e.target.value)} className="input-field">
            {opts.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        );
      })()}
      <p className="text-[10px] text-zinc-600 mt-1">
        {language === 'es'
          ? `Voces ${actorGender === 'female' ? 'femeninas' : 'masculinas'} · Todas hablan español con modelo multilingual · Click altavoz para preview`
          : `${actorGender === 'female' ? 'Female' : 'Male'} voices · Click speaker to preview`}
      </p>
    </div>
  );
}
