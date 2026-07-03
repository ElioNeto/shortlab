import React from 'react';
import { setLanguage, getLanguage } from '../i18n';
import { Globe } from 'lucide-react';

export default function LanguageSelector() {
  const [lang, setLang] = React.useState(getLanguage());
  
  const handleChange = (e) => {
    setLanguage(e.target.value);
    setLang(e.target.value);
    window.location.reload();
  };
  
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <Globe size={14} className="text-zinc-400" />
      <select
        value={lang}
        onChange={handleChange}
        className="bg-transparent text-xs text-zinc-400 border border-white/10 rounded-lg px-2 py-1 outline-none focus:border-primary/30"
      >
        <option value="en">English</option>
        <option value="pt">Português</option>
        <option value="es">Español</option>
      </select>
    </div>
  );
}
