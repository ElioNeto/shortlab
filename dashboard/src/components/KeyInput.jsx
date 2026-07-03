import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Check, ChevronDown } from 'lucide-react';

const PROVIDERS = {
    gemini: {
        name: 'Google Gemini',
        placeholder: 'AIzaSy...',
        link: 'https://aistudio.google.com/app/apikey',
        linkText: 'Get your free Gemini API Key here →',
        models: [
            { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Fast)' },
            { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash (Preview)' },
            { value: 'gemini-3.1-flash-image-preview', label: 'Gemini 3.1 Flash (Image Gen)' },
        ],
    },
    openrouter: {
        name: 'OpenRouter',
        placeholder: 'sk-or-v1-...',
        link: 'https://openrouter.ai/keys',
        linkText: 'Get your OpenRouter API Key here →',
        models: [
            // Free models
            { value: 'openrouter/free', label: '🆓 Free Models Router' },
            { value: 'google/gemma-4-31b-it:free', label: '🆓 Google Gemma 4 31B' },
            { value: 'google/gemma-4-26b-a4b-it:free', label: '🆓 Google Gemma 4 26B' },
            { value: 'meta-llama/llama-3.3-70b-instruct:free', label: '🆓 Meta Llama 3.3 70B' },
            { value: 'meta-llama/llama-3.2-3b-instruct:free', label: '🆓 Meta Llama 3.2 3B' },
            { value: 'qwen/qwen3-coder:free', label: '🆓 Qwen3 Coder 480B' },
            { value: 'qwen/qwen3-next-80b-a3b-instruct:free', label: '🆓 Qwen3 Next 80B' },
            { value: 'openai/gpt-oss-120b:free', label: '🆓 OpenAI GPT-OSS 120B' },
            { value: 'openai/gpt-oss-20b:free', label: '🆓 OpenAI GPT-OSS 20B' },
            { value: 'nvidia/nemotron-3-ultra-550b-a55b:free', label: '🆓 NVIDIA Nemotron 3 Ultra 550B' },
            { value: 'nvidia/nemotron-3-super-120b-a12b:free', label: '🆓 NVIDIA Nemotron 3 Super 120B' },
            { value: 'nvidia/nemotron-nano-12b-v2-vl:free', label: '🆓 NVIDIA Nemotron Nano 12B VL' },
            { value: 'nousresearch/hermes-3-llama-3.1-405b:free', label: '🆓 Nous Hermes 3 405B' },
            { value: 'cohere/north-mini-code:free', label: '🆓 Cohere North Mini Code' },
            { value: 'poolside/laguna-m.1:free', label: '🆓 Poolside Laguna M.1' },
            { value: 'liquid/lfm-2.5-1.2b-instruct:free', label: '🆓 LiquidAI LFM 1.2B' },
            { value: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', label: '🆓 Venice Uncensored' },
            // --- separator ---
            { value: '_separator_paid', label: '─── Paid Models ───', disabled: true },
            // Popular paid models
            { value: 'google/gemini-2.5-flash', label: 'Google Gemini 2.5 Flash' },
            { value: 'google/gemini-2.5-pro', label: 'Google Gemini 2.5 Pro' },
            { value: 'google/gemini-3-flash-preview', label: 'Google Gemini 3 Flash' },
            { value: 'anthropic/claude-sonnet-4.6', label: 'Anthropic Claude Sonnet 4.6' },
            { value: 'anthropic/claude-opus-4.8', label: 'Anthropic Claude Opus 4.8' },
            { value: 'anthropic/claude-haiku-4.5', label: 'Anthropic Claude Haiku 4.5' },
            { value: 'openai/gpt-5.2', label: 'OpenAI GPT-5.2' },
            { value: 'openai/gpt-5.2-chat', label: 'OpenAI GPT-5.2 Chat' },
            { value: 'openai/gpt-5.2-codex', label: 'OpenAI GPT-5.2 Codex' },
            { value: 'openai/gpt-4o', label: 'OpenAI GPT-4o' },
            { value: 'openai/gpt-4o-mini', label: 'OpenAI GPT-4o Mini' },
            { value: 'deepseek/deepseek-chat', label: 'DeepSeek V3' },
            { value: 'deepseek/deepseek-r1', label: 'DeepSeek R1' },
            { value: 'qwen/qwen3-max', label: 'Qwen3 Max' },
            { value: 'qwen/qwen3-coder-next', label: 'Qwen3 Coder Next' },
            { value: 'meta-llama/llama-3.1-405b-instruct', label: 'Meta Llama 3.1 405B' },
            { value: 'meta-llama/llama-4-maverick', label: 'Meta Llama 4 Maverick' },
            { value: 'mistralai/devstral-2512', label: 'Mistral Devstral' },
            { value: 'mistralai/codestral-2501', label: 'Mistral Codestral' },
        ],
    },
};

export default function KeyInput({ onKeySet, savedKey, onProviderChange, savedProvider, onModelChange, savedModel }) {
    const [provider, setProvider] = useState(savedProvider || 'gemini');
    const [key, setKey] = useState(savedKey || '');
    const [model, setModel] = useState(savedModel || '');
    const [isVisible, setIsVisible] = useState(false);
    const [isSaved, setIsSaved] = useState(!!savedKey);

    const providerConfig = PROVIDERS[provider];

    useEffect(() => {
        if (savedKey) setKey(savedKey);
        if (savedProvider) setProvider(savedProvider);
        if (savedModel) setModel(savedModel);
    }, [savedKey, savedProvider, savedModel]);

    const handleProviderChange = (newProvider) => {
        setProvider(newProvider);
        setKey('');
        setModel('');
        setIsSaved(false);
        if (onProviderChange) onProviderChange(newProvider);
    };

    const handleSave = () => {
        if (key.trim().length > 0) {
            onKeySet(key);
            if (onProviderChange) onProviderChange(provider);
            if (onModelChange) onModelChange(model || providerConfig.models[0].value);
            setIsSaved(true);
        }
    };

    return (
        <div className="bg-surface border border-white/5 rounded-2xl p-6 mb-8 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-accent/20 rounded-lg text-accent">
                    <Key size={20} />
                </div>
                <h2 className="text-lg font-semibold">LLM API Configuration</h2>
            </div>

            {/* Provider selector */}
            <div className="mb-4">
                <label className="block text-sm text-zinc-400 mb-2">Provider</label>
                <div className="flex gap-2">
                    {Object.entries(PROVIDERS).map(([key, config]) => (
                        <button
                            key={key}
                            onClick={() => handleProviderChange(key)}
                            className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-all text-sm ${
                                provider === key
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            {config.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Model selector */}
            <div className="mb-4">
                <label className="block text-sm text-zinc-400 mb-2">Model</label>
                <div className="relative">
                    <select
                        value={model || providerConfig.models[0].value}
                        onChange={(e) => setModel(e.target.value)}
                        className="input-field w-full appearance-none cursor-pointer pr-10"
                    >
                        {providerConfig.models.map((m) => (
                            <option key={m.value} value={m.value} disabled={m.disabled}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                </div>
            </div>

            {/* API Key input */}
            <div className="mb-4">
                <label className="block text-sm text-zinc-400 mb-2">API Key</label>
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <input
                            type={isVisible ? "text" : "password"}
                            value={key}
                            onChange={(e) => {
                                setKey(e.target.value);
                                setIsSaved(false);
                            }}
                            placeholder={providerConfig.placeholder}
                            className="input-field pr-12 font-mono"
                        />
                        <button
                            onClick={() => setIsVisible(!isVisible)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                        >
                            {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={!key || isSaved}
                        className={`px-6 rounded-xl font-medium transition-all flex items-center gap-2 ${isSaved
                            ? 'bg-green-500/20 text-green-400 cursor-default'
                            : 'bg-primary hover:bg-blue-600 text-white shadow-lg shadow-primary/20'
                            }`}
                    >
                        {isSaved ? <><Check size={18} /> Ready</> : 'Set Key'}
                    </button>
                </div>
            </div>

            <p className="mt-3 text-xs text-zinc-500">
                Your key is stored locally in your browser for convenience.
                <br />
                <a
                    href={providerConfig.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline mt-1 inline-block"
                >
                    {providerConfig.linkText}
                </a>
            </p>

            {provider === 'openrouter' && (
                <p className="mt-2 text-xs text-amber-400/70">
                    Note: Video analysis and thumbnail generation require Gemini provider. Text-based features (clips, scripts, descriptions) work with any provider.
                </p>
            )}
        </div>
    );
}
