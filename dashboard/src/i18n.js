const translations = {
  en: {
    app: {
      title: "ShortLab",
      subtitle: "AI Video Generator",
      settings: "Settings",
      clipGenerator: "Clip Generator",
      aiShorts: "AI Shorts",
      aiShortsDesc: "Generate AI marketing videos",
      youtubeStudio: "YouTube Studio",
      ugcGallery: "UGC Gallery",
      landingPage: "Landing Page",
      openSource: "Open Source",
      launchApp: "Launch App",
      getStarted: "Get Started Free",
      features: "Features",
      howItWorks: "How It Works",
      faq: "FAQ",
      comparison: "Comparison",
    },
    processing: {
      upload: "Upload Video",
      process: "Process",
      processing: "Processing...",
      queued: "Queued",
      completed: "Completed",
      failed: "Failed",
      apiKeyMissing: "LLM API key missing",
      apiKeyRequired: "ShortLab needs an LLM API key (Gemini or OpenRouter) to power the AI analysis.",
    },
    settings: {
      apiKeys: "API Keys",
      llmProvider: "LLM Provider",
      model: "Model",
      save: "Save",
      geminiKey: "Gemini API Key",
      elevenLabsKey: "ElevenLabs API Key",
      uploadPostKey: "Upload-Post API Key",
      falKey: "fal.ai API Key",
    },
  },
  pt: {
    app: {
      title: "ShortLab",
      subtitle: "Gerador de Vídeos com IA",
      settings: "Configurações",
      clipGenerator: "Gerador de Clipes",
      aiShorts: "IA Shorts",
      aiShortsDesc: "Gerar vídeos de marketing com IA",
      youtubeStudio: "YouTube Studio",
      ugcGallery: "Galeria UGC",
      landingPage: "Página Inicial",
      openSource: "Código Aberto",
      launchApp: "Abrir App",
      getStarted: "Comece Grátis",
      features: "Funcionalidades",
      howItWorks: "Como Funciona",
      faq: "Perguntas Frequentes",
      comparison: "Comparação",
    },
    processing: {
      upload: "Enviar Vídeo",
      process: "Processar",
      processing: "Processando...",
      queued: "Na Fila",
      completed: "Concluído",
      failed: "Falhou",
      apiKeyMissing: "Chave da API LLM ausente",
      apiKeyRequired: "ShortLab precisa de uma chave de API LLM (Gemini ou OpenRouter) para alimentar a análise de IA.",
    },
    settings: {
      apiKeys: "Chaves de API",
      llmProvider: "Provedor LLM",
      model: "Modelo",
      save: "Salvar",
      geminiKey: "Chave Gemini API",
      elevenLabsKey: "Chave ElevenLabs API",
      uploadPostKey: "Chave Upload-Post API",
      falKey: "Chave fal.ai API",
    },
  },
  es: {
    app: {
      title: "ShortLab",
      subtitle: "Generador de Videos con IA",
      settings: "Configuración",
      clipGenerator: "Generador de Clips",
      aiShorts: "IA Shorts",
      youtubeStudio: "YouTube Studio",
      ugcGallery: "Galería UGC",
      openSource: "Código Abierto",
      launchApp: "Abrir App",
      getStarted: "Empieza Gratis",
      features: "Características",
      howItWorks: "Cómo Funciona",
      faq: "Preguntas Frecuentes",
      comparison: "Comparación",
    },
    processing: {
      upload: "Subir Video",
      process: "Procesar",
      processing: "Procesando...",
      completed: "Completado",
      failed: "Falló",
    },
    settings: {
      apiKeys: "Claves de API",
      llmProvider: "Proveedor LLM",
      model: "Modelo",
      save: "Guardar",
    },
  },
};

let currentLang = localStorage.getItem('shortlab_lang') || 'en';

export function setLanguage(lang) {
  if (translations[lang]) {
    currentLang = lang;
    localStorage.setItem('shortlab_lang', lang);
  }
}

export function getLanguage() {
  return currentLang;
}

export function t(path) {
  const keys = path.split('.');
  let value = translations[currentLang];
  for (const key of keys) {
    if (value) value = value[key];
  }
  return value || path;
}

export function useTranslation() {
  return { t, setLanguage, getLanguage, currentLang };
}

export default translations;
