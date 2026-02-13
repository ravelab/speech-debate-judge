import React, { useState, useEffect } from 'react';
import { ModelDownloader } from './ModelDownloader';
import type { AIProvider, ProviderConfig } from '../lib/types';

interface ModelOption {
  label: string;
  value: string;
}

const PROVIDER_INFO: Record<AIProvider, { label: string; placeholder: string; models: ModelOption[] }> = {
  anthropic: {
    label: 'Anthropic API Key',
    placeholder: 'sk-ant-...',
    models: [
      { label: 'Claude Sonnet 4.5', value: 'claude-sonnet-4-5-20250929' },
    ],
  },
  gemini: {
    label: 'Gemini API Key',
    placeholder: 'AI...',
    models: [
      { label: 'Gemini 3 Flash Preview', value: 'gemini-3-flash-preview' },
    ],
  },
  openrouter: {
    label: 'OpenRouter API Key',
    placeholder: 'sk-or-...',
    models: [
      { label: 'Arcee Trinity Large (Free)', value: 'arcee-ai/trinity-large-preview:free' },
    ],
  },
};

interface ApiKeys {
  anthropic: string;
  gemini: string;
  openrouter: string;
}

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [provider, setProvider] = useState<AIProvider>('anthropic');
  const [apiKeys, setApiKeys] = useState<ApiKeys>({ anthropic: '', gemini: '', openrouter: '' });
  const [model, setModel] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      window.electronAPI.storeGet('providerConfig'),
      window.electronAPI.storeGet('apiKeys'),
    ]).then(([config, keys]) => {
      if (config && typeof config === 'object') {
        const c = config as ProviderConfig;
        if (c.provider) setProvider(c.provider);
        if (c.model) setModel(c.model);
      }
      if (keys && typeof keys === 'object') {
        const k = keys as ApiKeys;
        setApiKeys({
          anthropic: k.anthropic || '',
          gemini: k.gemini || '',
          openrouter: k.openrouter || '',
        });
      }
    });
  }, []);

  const saveConfig = async () => {
    const info = PROVIDER_INFO[provider];
    // Save API keys independently
    await window.electronAPI.storeSet('apiKeys', apiKeys);
    // Save active provider config (with the current provider's key)
    const config: ProviderConfig = {
      provider,
      apiKey: apiKeys[provider],
      model: model || info.models[0].value,
    };
    await window.electronAPI.storeSet('providerConfig', config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const info = PROVIDER_INFO[provider];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none"
          >
            x
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              AI Provider
            </label>
            <select
              value={provider}
              onChange={(e) => {
                const p = e.target.value as AIProvider;
                setProvider(p);
                setModel(PROVIDER_INFO[p].models[0].value);
              }}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="gemini">Google Gemini</option>
              <option value="openrouter">OpenRouter</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              {info.label}
            </label>
            <input
              type="password"
              value={apiKeys[provider]}
              onChange={(e) => setApiKeys(prev => ({ ...prev, [provider]: e.target.value }))}
              placeholder={info.placeholder}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Keys are stored locally on your machine, never in the project.
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Model
            </label>
            <select
              value={model || info.models[0].value}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {info.models.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={saveConfig}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors"
          >
            {saved ? 'Saved!' : 'Save'}
          </button>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Whisper Model
            </label>
            <ModelDownloader />
          </div>
        </div>
      </div>
    </div>
  );
}
