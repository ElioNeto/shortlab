import React, { useState, useEffect } from 'react';
import { Save, FolderOpen, Trash2 } from 'lucide-react';
import { getApiUrl } from '../config';

export default function TemplateManager({ currentConfig, onApply }) {
  const [templates, setTemplates] = useState([]);
  const [name, setName] = useState('');

  useEffect(() => {
    fetch(getApiUrl('/api/templates/list'))
      .then(r => r.json())
      .then(d => setTemplates(d.templates || []))
      .catch(() => {});
  }, []);

  const saveTemplate = async () => {
    if (!name) return;
    const res = await fetch(getApiUrl('/api/templates/save'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ...currentConfig }),
    });
    if (res.ok) {
      const data = await res.json();
      setTemplates([...templates, data]);
      setName('');
    }
  };

  const deleteTemplate = async (id) => {
    await fetch(getApiUrl(`/api/templates/${id}`), { method: 'DELETE' });
    setTemplates(templates.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-3 p-3 bg-white/5 rounded-xl">
      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
        <FolderOpen size={14} /> Templates
      </h4>
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Template name..."
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs outline-none"
        />
        <button onClick={saveTemplate} className="p-1.5 bg-primary/20 text-primary rounded-lg hover:bg-primary/30">
          <Save size={14} />
        </button>
      </div>
      {templates.map(t => (
        <div key={t.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
          <button onClick={() => onApply(t)} className="text-xs text-zinc-300 hover:text-white">
            {t.name}
          </button>
          <button onClick={() => deleteTemplate(t.id)} className="text-zinc-500 hover:text-red-400">
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
