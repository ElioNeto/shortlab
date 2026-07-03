import React, { useState, useEffect } from 'react';
import { Image, Plus, Check, AlertCircle } from 'lucide-react';
import { getApiUrl } from '../config';
import { VideoUploadStep, TitleStep, ThumbnailDesignStep, DescriptionStep, PublishStep as ThumbnailPublishStep } from './thumbnail';

const STEPS = ['Input', 'Titles', 'Generate', 'Description', 'Publish'];

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <React.Fragment key={label}>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${i < currentStep ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
            i === currentStep ? 'bg-primary/20 text-primary border border-primary/30' :
              'bg-white/5 text-zinc-500 border border-white/5'
            }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i < currentStep ? 'bg-green-500 text-black' :
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

export default function ThumbnailStudio({ geminiApiKey, uploadPostKey, uploadUserId, llmProvider, llmModel }) {
  // Step management
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState(null); // 'video' or 'manual'

  // Step 1 state
  const [videoFile, setVideoFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Step 2 state
  const [sessionId, setSessionId] = useState(null);
  const [titles, setTitles] = useState([]);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isRefining, setIsRefining] = useState(false);
  const [recommended, setRecommended] = useState([]);

  // Step 3 state
  const [faceImage, setFaceImage] = useState(null);
  const [bgImage, setBgImage] = useState(null);
  const [extraPrompt, setExtraPrompt] = useState('');
  const [thumbnailCount, setThumbnailCount] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedThumbnails, setGeneratedThumbnails] = useState([]);

  // Description state
  const [description, setDescription] = useState('');
  const [isDescribing, setIsDescribing] = useState(false);

  // Step 4 (Publish) state
  const [selectedThumbnail, setSelectedThumbnail] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);

  // Background preprocessing state
  const [preprocessSessionId, setPreprocessSessionId] = useState(null);
  const [isPreprocessing, setIsPreprocessing] = useState(false);

  // --- Background Pre-upload (starts Whisper immediately) ---
  const handlePreUpload = async (file) => {
    setPreprocessSessionId(null);
    setIsPreprocessing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(getApiUrl('/api/thumbnail/upload'), {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setPreprocessSessionId(data.session_id);
      }
    } catch (e) {
      console.error('Pre-upload failed:', e);
    } finally {
      setIsPreprocessing(false);
    }
  };

  // --- Step 1: Analyze Video ---
  const handleAnalyze = async () => {
    if (!geminiApiKey) return alert('Please set your Gemini API key in Settings first.');
    setIsAnalyzing(true);

    try {
      const formData = new FormData();

      if (preprocessSessionId) {
        formData.append('session_id', preprocessSessionId);
      } else if (videoFile) {
        formData.append('file', videoFile);
      } else {
        return alert('Please upload a video file.');
      }

      const res = await fetch(getApiUrl('/api/thumbnail/analyze'), {
        method: 'POST',
        headers: { 'X-Gemini-Key': geminiApiKey, 'X-LLM-Provider': llmProvider || 'gemini', 'X-LLM-Model': llmModel || '' },
        body: formData
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      const data = await res.json();
      setSessionId(data.session_id);
      setTitles(data.titles || []);
      setRecommended(data.recommended || []);
      setChatHistory([{
        role: 'assistant',
        content: `Here are 10 viral title suggestions based on your video. Titles marked ⭐ are my top picks. Click one to select it, or tell me how to refine them.`
      }]);
      setStep(1);
    } catch (e) {
      alert(`Analysis failed: ${e.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualMode = () => {
    setMode('manual');
    setStep(1);
  };

  // --- Step 2: Title Selection / Refinement ---
  const handleSelectTitle = (title) => {
    setSelectedTitle(title);
  };

  const handleConfirmTitle = () => {
    if (selectedTitle || (mode === 'manual' && manualTitle)) {
      setStep(2);
    }
  };

  const handleConfirmManualTitle = () => {
    if (mode === 'manual' && manualTitle) {
      setSelectedTitle(manualTitle);
      const newSessionId = sessionId || crypto.randomUUID();
      setSessionId(newSessionId);
      fetch(getApiUrl('/api/thumbnail/titles'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-Key': geminiApiKey,
          'X-LLM-Provider': llmProvider || 'gemini',
          'X-LLM-Model': llmModel || '',
        },
        body: JSON.stringify({ title: manualTitle, session_id: newSessionId })
      }).catch(() => {});
    }
    if (selectedTitle || (mode === 'manual' && manualTitle)) {
      setStep(2);
    }
  };

  const handleRefine = async () => {
    if (!chatInput.trim() || !sessionId) return;
    setIsRefining(true);

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);

    try {
      const res = await fetch(getApiUrl('/api/thumbnail/titles'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-Key': geminiApiKey,
          'X-LLM-Provider': llmProvider || 'gemini',
          'X-LLM-Model': llmModel || '',
        },
        body: JSON.stringify({ session_id: sessionId, message: userMsg })
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setTitles(data.titles || []);
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: `Here are refined titles based on your feedback. Click one to select it.`
      }]);
    } catch (e) {
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: `Failed to refine: ${e.message}`
      }]);
    } finally {
      setIsRefining(false);
    }
  };

  // --- Step 3: Generate Thumbnails ---
  const handleGenerate = async () => {
    if (!geminiApiKey) return alert('Please set your Gemini API key in Settings first.');
    const finalTitle = selectedTitle || manualTitle;
    if (!finalTitle) return alert('Please select or enter a title first.');

    setIsGenerating(true);
    setGeneratedThumbnails([]);

    try {
      const formData = new FormData();
      formData.append('session_id', sessionId || 'manual');
      formData.append('title', finalTitle);
      formData.append('extra_prompt', extraPrompt);
      formData.append('count', thumbnailCount);
      if (faceImage) formData.append('face', faceImage);
      if (bgImage) formData.append('background', bgImage);

      const res = await fetch(getApiUrl('/api/thumbnail/generate'), {
        method: 'POST',
        headers: { 'X-Gemini-Key': geminiApiKey, 'X-LLM-Provider': llmProvider || 'gemini', 'X-LLM-Model': llmModel || '' },
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || `Server error ${res.status}`);
      }

      const data = await res.json();
      if (!data.thumbnails || data.thumbnails.length === 0) {
        throw new Error('No thumbnails were generated. Your Gemini API key may not have access to image generation.');
      }
      setGeneratedThumbnails(data.thumbnails);
    } catch (e) {
      alert(`Generation failed: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Description Generation ---
  const handleGenerateDescription = async () => {
    if (!geminiApiKey) return alert('Please set your Gemini API key in Settings first.');
    const finalTitle = selectedTitle || manualTitle;
    if (!finalTitle) return alert('Please select a title first.');
    if (!sessionId) return alert('No session available.');

    setIsDescribing(true);
    try {
      const res = await fetch(getApiUrl('/api/thumbnail/describe'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-Key': geminiApiKey,
          'X-LLM-Provider': llmProvider || 'gemini',
          'X-LLM-Model': llmModel || '',
        },
        body: JSON.stringify({ session_id: sessionId, title: finalTitle })
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      const data = await res.json();
      setDescription(data.description || '');
    } catch (e) {
      alert(`Description generation failed: ${e.message}`);
    } finally {
      setIsDescribing(false);
    }
  };

  // --- Publish to YouTube ---
  const handlePublish = async () => {
    if (!uploadPostKey || !uploadUserId) return alert('Please configure your Upload-Post API key and user in Settings first.');
    const finalTitle = selectedTitle || manualTitle;
    if (!finalTitle) return alert('No title selected.');
    if (!selectedThumbnail) return alert('Please select a thumbnail first.');
    if (!description) return alert('Please generate or write a description first.');

    setIsPublishing(true);
    setPublishResult(null);
    try {
      const formData = new FormData();
      formData.append('session_id', sessionId);
      formData.append('title', finalTitle);
      formData.append('description', description);
      formData.append('thumbnail_url', selectedThumbnail);
      formData.append('api_key', uploadPostKey);
      formData.append('user_id', uploadUserId);

      const res = await fetch(getApiUrl('/api/thumbnail/publish'), {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      const { publish_id } = await res.json();

      await new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
          try {
            const statusRes = await fetch(getApiUrl(`/api/thumbnail/publish/status/${publish_id}`));
            if (!statusRes.ok) { clearInterval(interval); reject(new Error('Status check failed')); return; }
            const statusData = await statusRes.json();

            if (statusData.status === 'done') {
              clearInterval(interval);
              setPublishResult({ success: true, data: statusData.result });
              resolve();
            } else if (statusData.status === 'failed') {
              clearInterval(interval);
              reject(new Error(statusData.error || 'Upload failed'));
            }
          } catch (e) {
            clearInterval(interval);
            reject(e);
          }
        }, 2000);
      });

    } catch (e) {
      setPublishResult({ success: false, error: e.message });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleReset = () => {
    setStep(0);
    setMode(null);
    setVideoFile(null);
    setSessionId(null);
    setTitles([]);
    setSelectedTitle('');
    setManualTitle('');
    setChatInput('');
    setChatHistory([]);
    setFaceImage(null);
    setBgImage(null);
    setExtraPrompt('');
    setGeneratedThumbnails([]);
    setDescription('');
    setIsDescribing(false);
    setSelectedThumbnail(null);
    setIsPublishing(false);
    setPublishResult(null);
    setPreprocessSessionId(null);
    setIsPreprocessing(false);
    setRecommended([]);
  };

  const handleVideoFileChange = (file) => {
    setVideoFile(file);
    setMode('video');
    handlePreUpload(file);
  };

  const handleVideoClear = () => {
    setVideoFile(null);
    setPreprocessSessionId(null);
  };

  return (
    <div className="h-full overflow-y-auto p-6 md:p-8 animate-[fadeIn_0.3s_ease-out]">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
              <Image size={20} className="text-white" />
            </div>
            YouTube Studio
          </h1>
          {step > 0 && (
            <button onClick={handleReset} className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1">
              <Plus size={12} /> New Project
            </button>
          )}
        </div>
        <p className="text-sm text-zinc-500 mb-6">Generate viral titles, AI thumbnails, descriptions and publish directly to YouTube</p>

        <StepIndicator currentStep={step} />

        {/* Gemini API Key Warning */}
        {!geminiApiKey && (
          <div className="mb-6 p-5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-300">Gemini API Key Required</p>
              <p className="text-xs text-amber-400/70 mt-1">YouTube Studio requires a Google Gemini API key to function. Please configure it in the <strong>Settings</strong> tab before using this feature. Gemini's free tier includes 1,500 requests per day.</p>
            </div>
          </div>
        )}

        {/* ===== STEP 0: Input Mode Selection ===== */}
        {step === 0 && (
          <VideoUploadStep
            geminiApiKey={geminiApiKey}
            isAnalyzing={isAnalyzing}
            isPreprocessing={isPreprocessing}
            preprocessSessionId={preprocessSessionId}
            videoFile={videoFile}
            onVideoFileChange={handleVideoFileChange}
            onVideoClear={handleVideoClear}
            manualTitle={manualTitle}
            onManualTitleChange={setManualTitle}
            onAnalyze={handleAnalyze}
            onManualMode={handleManualMode}
          />
        )}

        {/* ===== STEP 1: Title Selection ===== */}
        {step === 1 && (
          <TitleStep
            mode={mode}
            manualTitle={manualTitle}
            onManualTitleChange={setManualTitle}
            onConfirmManualTitle={handleConfirmManualTitle}
            selectedTitle={selectedTitle}
            onSelectTitle={handleSelectTitle}
            titles={titles}
            recommended={recommended}
            chatHistory={chatHistory}
            chatInput={chatInput}
            onChatInputChange={setChatInput}
            onRefine={handleRefine}
            isRefining={isRefining}
            onConfirmTitle={handleConfirmTitle}
          />
        )}

        {/* ===== STEP 2: Thumbnail Generation ===== */}
        {step === 2 && (
          <ThumbnailDesignStep
            selectedTitle={selectedTitle || manualTitle}
            onBackToTitles={() => setStep(1)}
            faceImage={faceImage}
            onFaceImageChange={setFaceImage}
            onFaceImageClear={() => setFaceImage(null)}
            bgImage={bgImage}
            onBgImageChange={setBgImage}
            onBgImageClear={() => setBgImage(null)}
            extraPrompt={extraPrompt}
            onExtraPromptChange={setExtraPrompt}
            thumbnailCount={thumbnailCount}
            onThumbnailCountChange={setThumbnailCount}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            generatedThumbnails={generatedThumbnails}
            selectedThumbnail={selectedThumbnail}
            onSelectThumbnail={setSelectedThumbnail}
            onNextToDescription={() => setStep(3)}
          />
        )}

        {/* ===== STEP 3: YouTube Description ===== */}
        {step === 3 && (
          <DescriptionStep
            mode={mode}
            selectedThumbnail={selectedThumbnail}
            selectedTitle={selectedTitle || manualTitle}
            onBackToThumbnails={() => setStep(2)}
            onGenerateDescription={handleGenerateDescription}
            isDescribing={isDescribing}
            description={description}
            onDescriptionChange={setDescription}
            onNextToPublish={() => setStep(4)}
          />
        )}

        {/* ===== STEP 4: Publish to YouTube ===== */}
        {step === 4 && (
          <ThumbnailPublishStep
            selectedThumbnail={selectedThumbnail}
            selectedTitle={selectedTitle || manualTitle}
            onTitleChange={(val) => {
              if (selectedTitle) setSelectedTitle(val);
              else setManualTitle(val);
            }}
            description={description}
            onDescriptionChange={setDescription}
            onBackToDescription={() => setStep(3)}
            onPublish={handlePublish}
            isPublishing={isPublishing}
            publishResult={publishResult}
            uploadPostKey={uploadPostKey}
            uploadUserId={uploadUserId}
          />
        )}
      </div>
    </div>
  );
}
