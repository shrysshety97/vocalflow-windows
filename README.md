# VocalFlow for Windows

A lightweight Windows system tray application that lets you dictate into any text field using a hold-to-record hotkey.

## Features
- **Hold-to-record**: Hold `Right Alt` to record, release to transcribe.
- **Deepgram ASR**: Real-time high-accuracy transcription.
- **Groq Post-processing**: Uses `llama3-8b-8192` for spelling and grammar correction.
- **Global Injection**: Text is automatically pasted at your cursor using simulated `Ctrl + V`.
- **System Tray**: Minimal footprint, accessible via the notification area.
- **Dashboard**: View your Deepgram balance directly in the Settings window.

## Setup

1. **API Keys**:
   Open `config.json` in the root folder and paste your Deepgram and Groq API keys.
   ```json
   {
     "deepgram": { "apiKey": "YOUR_DEEPGRAM_KEY" },
     "groq": { "apiKey": "YOUR_GROQ_KEY" }
   }
   ```

2. **Installation**:
   ```bash
   npm install
   ```

3. **Running**:
   - For development (with dev tools): `npm run dev` and `npm start`
   - For production: Build the project and run the output.

## Architecture
- **Main Process**: Handles global hotkeys (via `uiohook-napi`) and system tray.
- **Audio Process**: A hidden Electron window that uses standard browser APIs (`getUserMedia`) for reliable microphone access and streams to Deepgram WebSockets.
- **UI**: Built with React and Vite for a fast, modern settings experience.

## Requirements
- Windows 10/11
- Node.js 18+
- Active internet connection

## License
MIT
