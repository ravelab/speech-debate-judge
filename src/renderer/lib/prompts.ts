// Prompt utilities — the prompt logic lives in main/ai-judge.ts
// This file provides event-type descriptions for the UI

export const EVENT_PRESETS = [
  'Extemp',
  'Original Oratory',
  'Informative',
  'Lincoln-Douglas',
  'Policy',
  'Public Forum',
  'Congress',
  'Dramatic Interpretation',
  'Humorous Interpretation',
  'Duo Interpretation',
  'Program Oral Interpretation',
  'Impromptu',
  'Declamation',
] as const;

export type EventPreset = (typeof EVENT_PRESETS)[number];
