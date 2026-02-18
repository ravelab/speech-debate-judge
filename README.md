# Speech & Debate Judge

A desktop app that uses AI and speech recognition to automatically judge speech and debate performances. It records a student's speech, transcribes it in real time using Whisper, and generates a competitive score with constructive feedback.

## Features

- **Live Recording & Transcription** — Records speeches from the microphone and transcribes in real time using Whisper (runs locally with Metal GPU acceleration on macOS)
- **AI-Powered Scoring & Feedback** — Generates scores on a 20–30 scale with detailed, event-specific feedback using Claude, Gemini, or OpenRouter
- **13 Event Types** — Supports LD, Policy, Public Forum, Congressional, Extemporaneous, Original Oratory, Informative, Impromptu, Declamation, Dramatic Interpretation, Humorous Interpretation, Duo, and Program Oral Interpretation
- **Smart Scoring** — Automatically prevents ties, enforces time penalties, and adjusts scores relative to other contestants in the event
- **Session Management** — Auto-saves sessions, browse history, and export results to clipboard
- **Multi-Provider AI** — Choose between Anthropic Claude, Google Gemini, or OpenRouter (includes a free tier)

## Getting Started

### Prerequisites

- macOS (Apple Silicon)
- Node.js

### Install & Run

```bash
npm install
npm start
```

On first launch, the app will download the Whisper speech recognition model (~140MB).

Go to **Settings** to configure your AI provider and API key.

### Build

```bash
npm run make
```

The packaged app will be in `out/make/`.

## How It Works

1. Create an event and set the event type and time limits
2. Hit record — audio is captured and transcribed live
3. Stop recording — the transcript is sent to your configured AI provider
4. The AI returns a score (20–30) and bullet-point feedback tailored to the event type
5. Contestants are ranked automatically; results can be exported

## Tech Stack

- **Electron** + **React** + **TypeScript** — Desktop app framework
- **Whisper** (via native addon) — Local speech-to-text
- **Tailwind CSS** — Styling
- **Vite** — Build tooling

## License

MIT
