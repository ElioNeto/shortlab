import React, { useRef, useEffect } from 'react';
import { MessageSquare, Send, Loader2, ArrowRight, Check } from 'lucide-react';

export default function TitleStep({
  mode,
  manualTitle,
  onManualTitleChange,
  onConfirmManualTitle,
  selectedTitle,
  onSelectTitle,
  titles,
  recommended,
  chatHistory,
  chatInput,
  onChatInputChange,
  onRefine,
  isRefining,
  onConfirmTitle,
}) {
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (chatHistory.length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  }, [chatHistory]);

  return (
    <div className="grid md:grid-cols-5 gap-6">
      {/* Left: Chat / Controls */}
      <div className="md:col-span-2 flex flex-col gap-4">
        {mode === 'manual' ? (
          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">Your Title</h3>
            <input
              type="text"
              value={manualTitle}
              onChange={(e) => onManualTitleChange(e.target.value)}
              className="input-field text-sm"
              maxLength={70}
            />
            <p className="text-xs text-zinc-600">{manualTitle.length}/70 characters</p>
            <button
              onClick={onConfirmManualTitle}
              disabled={!manualTitle.trim()}
              className="w-full btn-primary py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ArrowRight size={16} />
              Continue to Thumbnails
            </button>
          </div>
        ) : (
          <div className="glass-panel p-4 flex flex-col h-[500px]">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
              <MessageSquare size={14} className="text-primary" />
              <span className="text-xs font-medium text-zinc-400">Title Refinement Chat</span>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar mb-3">
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] px-3 py-2 rounded-xl text-xs ${msg.role === 'user'
                    ? 'bg-primary/20 text-primary border border-primary/20'
                    : 'bg-white/5 text-zinc-300 border border-white/5'
                    }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Chat input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => onChatInputChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onRefine()}
                placeholder="Make them more clickbait..."
                className="input-field text-xs flex-1"
                disabled={isRefining}
              />
              <button
                onClick={onRefine}
                disabled={isRefining || !chatInput.trim()}
                className="btn-primary p-2 rounded-xl disabled:opacity-50"
              >
                {isRefining ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>
        )}

        {mode !== 'manual' && selectedTitle && (
          <button
            onClick={onConfirmTitle}
            className="w-full btn-primary py-3 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <ArrowRight size={16} />
            Use Selected Title
          </button>
        )}
      </div>

      {/* Right: Title Cards */}
      <div className="md:col-span-3 space-y-3">
        {selectedTitle && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2 text-sm">
            <Check size={14} className="text-green-400 shrink-0" />
            <span className="text-green-300 font-medium truncate">Selected: {selectedTitle}</span>
          </div>
        )}

        {titles.length > 0 && (
          <div className="space-y-2">
            {titles.map((title, i) => {
              const rec = recommended.find(r => r.index === i);
              const recRank = recommended.findIndex(r => r.index === i);
              return (
                <button
                  key={i}
                  onClick={() => onSelectTitle(title)}
                  className={`w-full text-left p-4 rounded-xl border transition-all text-sm ${selectedTitle === title
                    ? 'bg-primary/10 border-primary/30 text-white'
                    : rec
                      ? 'bg-amber-500/5 border-amber-500/20 text-zinc-200 hover:bg-amber-500/10'
                      : 'bg-white/[0.02] border-white/5 text-zinc-300 hover:bg-white/5 hover:border-white/10'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${selectedTitle === title ? 'bg-primary text-black' :
                      rec ? 'bg-amber-400 text-black' :
                        'bg-white/10 text-zinc-500'
                      }`}>
                      {selectedTitle === title ? <Check size={10} /> : rec ? '★' : i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="leading-relaxed">{title}</span>
                        {rec && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/30 shrink-0">
                            {recRank === 0 ? '⭐ TOP PICK' : '⭐ 2nd PICK'}
                          </span>
                        )}
                      </div>
                      {rec && (
                        <p className="text-[11px] text-amber-300/70 mt-1.5 leading-relaxed italic">{rec.reason}</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {isRefining && (
          <div className="flex items-center justify-center py-8 text-zinc-500">
            <Loader2 size={20} className="animate-spin mr-2" />
            <span className="text-sm">Refining titles...</span>
          </div>
        )}
      </div>
    </div>
  );
}
