import React, { useState, useEffect } from 'react';
import { Zap, Check, RefreshCw, AlertCircle, ChevronLeft, Loader2, User, Film, MessageSquare } from 'lucide-react';
import { getApiUrl } from '../config';
import { AnalysisStep, ScriptStep, ActorStep, VoiceStep, VideoStep, PublishStep } from './saashorts';

const CACHE_KEY = 'saasshorts_cache';
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    if (Date.now() - cache.timestamp > CACHE_MAX_AGE) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return cache;
  } catch { return null; }
}

function saveCache(url, analysis, webResearch, scripts) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      url, analysis, webResearch, scripts, timestamp: Date.now(),
    }));
  } catch { /* localStorage full */ }
}

export default function SaaShortsTab({ geminiApiKey, elevenLabsKey, falKey, uploadPostKey, uploadUserId, llmProvider, llmModel }) {
  // Wizard state
  const [step, setStep] = useState(() => {
    const cache = loadCache();
    return cache ? 1 : 0;
  });

  // Step 0: URL input
  const [url, setUrl] = useState(() => loadCache()?.url || '');
  const [videoMode, setVideoMode] = useState('lowcost');
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState('ugc');
  const [language, setLanguage] = useState('en');
  const [actorGender, setActorGender] = useState('female');
  const [numScripts, setNumScripts] = useState(3);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const [fromCache, setFromCache] = useState(() => !!loadCache());

  // Step 1: Analysis results
  const [analysis, setAnalysis] = useState(() => loadCache()?.analysis || null);
  const [webResearch, setWebResearch] = useState(() => loadCache()?.webResearch || null);
  const [scripts, setScripts] = useState(() => loadCache()?.scripts || []);
  const [selectedScript, setSelectedScript] = useState(0);

  // Step 2: Configure
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('21m00Tcm4TlvDq8ikWAM');
  const [actorDescription, setActorDescription] = useState('');
  const [editedNarration, setEditedNarration] = useState('');
  const [actorOptions, setActorOptions] = useState([]);
  const [selectedActor, setSelectedActor] = useState(null);
  const [generatingActors, setGeneratingActors] = useState(false);
  const [actorGallery, setActorGallery] = useState([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [uploadedActorPreview, setUploadedActorPreview] = useState(null);

  // Step 3: Generate
  const [generating, setGenerating] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [genLogs, setGenLogs] = useState([]);
  const [genStatus, setGenStatus] = useState('idle');
  const [genResult, setGenResult] = useState(null);

  // Publish
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);
  const [publishPlatforms, setPublishPlatforms] = useState({ tiktok: true, instagram: true, youtube: true });
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');

  // UI
  const [copied, setCopied] = useState('');
  const [logsExpanded, setLogsExpanded] = useState(true);

  // Pre-fill from cache on mount
  useEffect(() => {
    if (fromCache && scripts.length > 0 && !actorDescription) {
      setActorDescription(scripts[0].actor_description || '');
      setEditedNarration(scripts[0].full_narration || '');
    }
  }, []);

  // Fetch actor gallery on mount
  useEffect(() => {
    setLoadingGallery(true);
    fetch(getApiUrl('/api/saasshorts/actor-gallery'))
      .then(res => res.ok ? res.json() : { images: [] })
      .then(data => setActorGallery(data.images || []))
      .catch(() => {})
      .finally(() => setLoadingGallery(false));
  }, []);

  // Fetch voices on mount
  useEffect(() => {
    if (elevenLabsKey) {
      fetchVoices();
    }
  }, [elevenLabsKey]);

  // Reset selected voice when actor gender changes
  useEffect(() => {
    const genderDefaults = {
      'en-female': '21m00Tcm4TlvDq8ikWAM',  // Rachel
      'en-male': '29vD33N1CtxCmqQRPOHJ',    // Drew
      'es-female': 'EXAVITQu4vr4xnSDxMaL',  // Bella
      'es-male': 'ErXwobaYiN019PkySvjV',     // Antoni
    };
    const matchingVoice = voices.find(v => (v.labels?.gender || '').toLowerCase() === actorGender);
    if (matchingVoice) {
      setSelectedVoice(matchingVoice.voice_id);
    } else {
      setSelectedVoice(genderDefaults[`${language}-${actorGender}`] || genderDefaults['en-female']);
    }
  }, [actorGender, language]);

  // Poll generation status
  useEffect(() => {
    let interval;
    if (jobId && genStatus === 'processing') {
      interval = setInterval(async () => {
        try {
          const res = await fetch(getApiUrl(`/api/saasshorts/status/${jobId}`));
          if (res.status === 404) {
            setGenStatus('failed');
            setGenerating(false);
            setGenLogs((prev) => [...prev, 'Job lost after server restart. Click Retry to resume from cached assets.']);
            clearInterval(interval);
            return;
          }
          if (!res.ok) return;
          const data = await res.json();
          if (data.logs) setGenLogs(data.logs);
          if (data.status === 'completed') {
            setGenStatus('completed');
            setGenResult(data.result);
            setGenerating(false);
            setStep(4);
            clearInterval(interval);
          } else if (data.status === 'failed') {
            setGenStatus('failed');
            setGenerating(false);
            clearInterval(interval);
          }
        } catch (e) {
          console.error('Poll error:', e);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [jobId, genStatus]);

  const fetchVoices = async () => {
    try {
      const res = await fetch(getApiUrl('/api/saasshorts/voices'), {
        headers: { 'X-ElevenLabs-Key': elevenLabsKey },
      });
      if (res.ok) {
        const data = await res.json();
        setVoices(data.voices || []);
      }
    } catch (e) {
      console.error('Voices fetch error:', e);
    }
  };

  const handleAnalyze = async () => {
    if (!url.trim() && !description.trim()) return;
    if (!geminiApiKey) {
      setAnalyzeError('Gemini API key required. Set it in Settings.');
      return;
    }

    setAnalyzing(true);
    setAnalyzeError('');

    try {
      const res = await fetch(getApiUrl('/api/saasshorts/analyze'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-Key': geminiApiKey,
          'X-LLM-Provider': llmProvider || 'gemini',
          'X-LLM-Model': llmModel || '',
        },
        body: JSON.stringify({
          url: url.trim() || undefined,
          description: description.trim() || undefined,
          num_scripts: numScripts,
          style,
          language,
          actor_gender: actorGender,
        }),
      });

      if (!res.ok) {
        let msg = 'Analysis failed';
        try { const err = await res.json(); msg = err.detail || msg; } catch { msg = await res.text() || msg; }
        throw new Error(msg);
      }

      const data = await res.json();
      setAnalysis(data.analysis);
      setWebResearch(data.web_research || null);
      setScripts(data.scripts);
      setSelectedScript(0);
      setFromCache(false);

      saveCache(url.trim(), data.analysis, data.web_research, data.scripts);

      if (data.scripts.length > 0) {
        setActorDescription(data.scripts[0].actor_description || '');
        setEditedNarration(data.scripts[0].full_narration || '');
      }

      setStep(1);
    } catch (e) {
      setAnalyzeError(e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSelectScript = (idx) => {
    setSelectedScript(idx);
    if (scripts[idx]) {
      setActorDescription(scripts[idx].actor_description || '');
      setEditedNarration(scripts[idx].full_narration || '');
    }
  };

  const handleGenerate = async () => {
    if (!falKey) {
      alert('fal.ai API key required. Set it in Settings.');
      return;
    }
    if (!elevenLabsKey) {
      alert('ElevenLabs API key required. Set it in Settings.');
      return;
    }

    setGenerating(true);
    setGenLogs(['Starting video generation...']);
    setGenStatus('processing');
    setGenResult(null);
    setStep(3);

    try {
      const scriptToSend = { ...scripts[selectedScript] };
      scriptToSend._product_name = analysis?.product_name || analysis?.name || '';
      scriptToSend._product_url = url;
      if (editedNarration !== scriptToSend.full_narration) {
        scriptToSend.full_narration = editedNarration;
      }

      const res = await fetch(getApiUrl('/api/saasshorts/generate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Fal-Key': falKey,
          'X-ElevenLabs-Key': elevenLabsKey,
        },
        body: JSON.stringify({
          script: scriptToSend,
          voice_id: selectedVoice,
          actor_description: actorDescription || undefined,
          selected_actor_url: selectedActor || undefined,
          video_mode: videoMode,
        }),
      });

      if (!res.ok) {
        let msg = 'Generation failed';
        try { const err = await res.json(); msg = err.detail || msg; } catch { msg = await res.text() || msg; }
        throw new Error(msg);
      }

      const data = await res.json();
      setJobId(data.job_id);
    } catch (e) {
      setGenStatus('failed');
      setGenLogs((prev) => [...prev, `Error: ${e.message}`]);
      setGenerating(false);
    }
  };

  const handleRetry = async () => {
    if (!jobId) return;
    setGenerating(true);
    setGenLogs(['Retrying from cached assets...']);
    setGenStatus('processing');
    setGenResult(null);

    try {
      const scriptToSend = { ...scripts[selectedScript] };
      scriptToSend._product_name = analysis?.product_name || analysis?.name || '';
      scriptToSend._product_url = url;
      if (editedNarration !== scriptToSend.full_narration) {
        scriptToSend.full_narration = editedNarration;
      }

      const res = await fetch(getApiUrl('/api/saasshorts/generate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Fal-Key': falKey,
          'X-ElevenLabs-Key': elevenLabsKey,
        },
        body: JSON.stringify({
          script: scriptToSend,
          voice_id: selectedVoice,
          actor_description: actorDescription || undefined,
          retry_job_id: jobId,
          video_mode: videoMode,
        }),
      });

      if (!res.ok) {
        let msg = 'Retry failed';
        try { const err = await res.json(); msg = err.detail || msg; } catch { msg = await res.text() || msg; }
        throw new Error(msg);
      }

      const data = await res.json();
      setJobId(data.job_id);
    } catch (e) {
      setGenStatus('failed');
      setGenLogs((prev) => [...prev, `Retry error: ${e.message}`]);
      setGenerating(false);
    }
  };

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleReset = () => {
    setStep(0);
    setUrl('');
    setAnalyzeError('');
    setAnalysis(null);
    setWebResearch(null);
    setScripts([]);
    setFromCache(false);
    localStorage.removeItem(CACHE_KEY);
    setSelectedScript(0);
    setJobId(null);
    setGenLogs([]);
    setGenStatus('idle');
    setGenResult(null);
    setGenerating(false);
    setActorDescription('');
    setEditedNarration('');
  };

  const handleUploadActor = async (file) => {
    const localPreview = URL.createObjectURL(file);
    setUploadedActorPreview({ localPreview, serverUrl: null });
    setSelectedActor(null);

    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(getApiUrl('/api/saasshorts/actor-upload'), {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          setUploadedActorPreview({ localPreview, serverUrl: data.url });
          setSelectedActor(data.url);
        }
      }
    } catch (err) { console.error('Upload failed:', err); }
  };

  const handleGenerateActors = async () => {
    if (!falKey || !actorDescription) return;
    setGeneratingActors(true);
    setActorOptions([]);
    setSelectedActor(null);
    try {
      const res = await fetch(getApiUrl('/api/saasshorts/actor-options'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Fal-Key': falKey },
        body: JSON.stringify({ actor_description: actorDescription, num_options: 3 }),
      });
      if (res.ok) {
        const data = await res.json();
        setActorOptions(data.images || []);
        const galRes = await fetch(getApiUrl('/api/saasshorts/actor-gallery'));
        if (galRes.ok) {
          const galData = await galRes.json();
          setActorGallery(galData.images || []);
        }
      }
    } catch (e) { console.error(e); }
    finally { setGeneratingActors(false); }
  };

  const handleActorDescriptionChange = (value) => {
    setActorDescription(value);
    setActorOptions([]);
  };

  const handlePublish = async () => {
    const selected = Object.keys(publishPlatforms).filter(k => publishPlatforms[k]);
    if (selected.length === 0) { setPublishResult({ ok: false, msg: 'Select at least one platform' }); return; }
    if (isScheduling && !scheduleDate) { setPublishResult({ ok: false, msg: 'Select a date' }); return; }

    setPublishing(true);
    setPublishResult(null);
    try {
      const payload = {
        job_id: jobId,
        api_key: uploadPostKey,
        user_id: uploadUserId,
        platforms: selected,
        title: genResult?.script?.title,
        description: genResult?.script?.caption || genResult?.script?.full_narration,
      };
      if (isScheduling && scheduleDate) {
        payload.scheduled_date = new Date(scheduleDate).toISOString();
        payload.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      }
      const res = await fetch(getApiUrl('/api/saasshorts/post'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Failed' }));
        throw new Error(err.detail || 'Failed');
      }
      setPublishResult({ ok: true, msg: isScheduling ? 'Scheduled!' : 'Published!' });
    } catch (e) {
      setPublishResult({ ok: false, msg: e.message });
    } finally {
      setPublishing(false);
    }
  };

  const stepLabels = ['Setup', 'Analysis', 'Configure', 'Generate', 'Result'];

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center">
                <Zap size={20} className="text-white" />
              </div>
              AI Shorts
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Generate viral UGC videos for any product or business
            </p>
          </div>
          {step > 0 && (
            <button onClick={handleReset} className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
              <RefreshCw size={14} /> Start over
            </button>
          )}
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mb-8">
          {stepLabels.map((label, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div className={`flex-1 h-px ${i <= step ? 'bg-violet-500' : 'bg-white/10'}`} />}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                i === step ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' :
                i < step ? 'bg-violet-500/10 text-violet-400' :
                'bg-white/5 text-zinc-600'
              }`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  i < step ? 'bg-violet-500 text-white' :
                  i === step ? 'bg-violet-500/30 text-violet-300' :
                  'bg-white/10 text-zinc-600'
                }`}>
                  {i < step ? <Check size={10} /> : i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Step 0: Analysis */}
        {step === 0 && (
          <AnalysisStep
            onAnalyze={handleAnalyze}
            isAnalyzing={analyzing}
            error={analyzeError}
            url={url}
            onUrlChange={setUrl}
            description={description}
            onDescriptionChange={setDescription}
            language={language}
            onLanguageChange={setLanguage}
            actorGender={actorGender}
            onActorGenderChange={setActorGender}
            style={style}
            onStyleChange={setStyle}
            videoMode={videoMode}
            onVideoModeChange={setVideoMode}
            numScripts={numScripts}
            onNumScriptsChange={setNumScripts}
          />
        )}

        {/* Step 1: Analysis Results & Scripts */}
        {step === 1 && (
          <ScriptStep
            scripts={scripts}
            selectedScript={selectedScript}
            onSelectScript={handleSelectScript}
            analysis={analysis}
            webResearch={webResearch}
            fromCache={fromCache}
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
            onReAnalyze={() => { setStep(0); setFromCache(false); }}
          />
        )}

        {/* Step 2: Configure */}
        {step === 2 && scripts[selectedScript] && (
          <div className="animate-[fadeIn_0.3s_ease-out] space-y-6">
            <div className="glass-panel p-6 space-y-5">
              <h2 className="text-lg font-semibold">Configure Video</h2>
              <p className="text-sm text-zinc-500">
                Script: <strong className="text-zinc-300">{scripts[selectedScript].title}</strong>
              </p>

              <VoiceStep
                voices={voices}
                selectedVoice={selectedVoice}
                onSelectVoice={setSelectedVoice}
                language={language}
                actorGender={actorGender}
              />

              <ActorStep
                actorGallery={actorGallery}
                loadingGallery={loadingGallery}
                selectedActor={selectedActor}
                onSelectActor={setSelectedActor}
                uploadedActorPreview={uploadedActorPreview}
                onUploadActor={handleUploadActor}
                actorDescription={actorDescription}
                onActorDescriptionChange={handleActorDescriptionChange}
                onGenerateActors={handleGenerateActors}
                actorOptions={actorOptions}
                generatingActors={generatingActors}
                falKey={falKey}
              />

              {/* Narration Edit */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                  <MessageSquare size={14} /> Narration Script
                </label>
                <textarea
                  value={editedNarration}
                  onChange={(e) => setEditedNarration(e.target.value)}
                  rows={5}
                  className="input-field resize-none font-mono text-xs"
                />
                <p className="text-[10px] text-zinc-600 mt-1">{editedNarration.length} chars &middot; ~{Math.round(editedNarration.split(' ').length / 2.5)}s speech</p>
              </div>

              {/* Cost Estimate */}
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Estimated cost</span>
                  <span className="text-green-400 font-semibold">~${videoMode === 'lowcost' ? '0.65' : '2.50'}</span>
                </div>
                <div className="text-[10px] text-zinc-600 mt-1">
                  {videoMode === 'lowcost'
                    ? 'Flux image ($0.05) + ElevenLabs voice ($0.10) + Hailuo 2.3 img2video ($0.19) + VEED Lipsync ($0.20) + Flux b-roll ($0.10)'
                    : 'Flux image ($0.05) + ElevenLabs voice ($0.10) + Kling avatar ($1.69) + Kling b-roll ($0.70)'
                  }
                </div>
              </div>

              {/* Missing keys warning */}
              {(!falKey || !elevenLabsKey) && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2 text-sm text-amber-400">
                  <AlertCircle size={14} />
                  {!falKey && 'fal.ai API key missing. '}{!elevenLabsKey && 'ElevenLabs API key missing. '}
                  Set them in Settings.
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="btn-secondary px-4 py-2 text-sm flex items-center gap-2">
                <ChevronLeft size={14} /> Back
              </button>
              <button
                onClick={handleGenerate}
                disabled={!falKey || !elevenLabsKey || !selectedActor || generating}
                className="btn-primary px-6 py-2 text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {generating ? (
                  <><Loader2 size={14} className="animate-spin" /> Generating...</>
                ) : !selectedActor ? (
                  <><User size={14} /> Select an actor first</>
                ) : (
                  <><Film size={14} /> Generate Video (~${videoMode === 'lowcost' ? '0.65' : '2.00'})</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Generation Progress */}
        {step === 3 && (
          <VideoStep
            genStatus={genStatus}
            genLogs={genLogs}
            logsExpanded={logsExpanded}
            onToggleLogs={() => setLogsExpanded(!logsExpanded)}
            onRetry={handleRetry}
            onBackToSettings={() => { setStep(2); setGenStatus('idle'); setGenerating(false); }}
            generating={generating}
          />
        )}

        {/* Step 4: Results */}
        {step === 4 && (
          <PublishStep
            genResult={genResult}
            onCopy={handleCopy}
            copied={copied}
            onNewVideo={handleReset}
            uploadPostKey={uploadPostKey}
            publishPlatforms={publishPlatforms}
            onTogglePlatform={(id, checked) => setPublishPlatforms({ ...publishPlatforms, [id]: checked })}
            isScheduling={isScheduling}
            onToggleSchedule={setIsScheduling}
            scheduleDate={scheduleDate}
            onScheduleDateChange={setScheduleDate}
            onPublish={handlePublish}
            publishing={publishing}
            publishResult={publishResult}
          />
        )}
      </div>
    </div>
  );
}
