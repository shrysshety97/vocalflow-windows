const { ipcRenderer } = require('electron');
const { createClient } = require('@deepgram/sdk');
const Groq = require('groq-sdk');

let mediaRecorder;
let streamAudio;
let deepgramSocket;
let transcriptBuffer = "";
let currentConfig = null;

async function runGroqPostProcessing(text, config) {
  if (!config.groq || !config.groq.apiKey || !text.trim()) return text;

  try {
    const groq = new Groq({ apiKey: config.groq.apiKey });
    // Same prompts as original Mac app
    const prompt = `You are a text post-processor. Return only the processed text, without explanations. Task: Correct spelling and grammar of the following text: "${text}"`;
    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt}],
      model: "llama3-8b-8192" // default model
    });
    return response.choices[0]?.message?.content || text;
  } catch(e) {
    console.error("Groq error", e);
    return text;
  }
}

ipcRenderer.on('start-recording', async (event, config) => {
  console.log("Start recording");
  currentConfig = config;
  transcriptBuffer = "";
  try {
    streamAudio = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Deepgram Streaming
    const deepgramParams = {
        model: 'nova-2',
        smart_format: true,
        endpointing: 300,
        interim_results: true
    };
    const wsUrl = `wss://api.deepgram.com/v1/listen?model=${deepgramParams.model}&smart_format=${deepgramParams.smart_format}&endpointing=${deepgramParams.endpointing}&interim_results=${deepgramParams.interim_results}`;

    deepgramSocket = new WebSocket(wsUrl, ['token', config.deepgram.apiKey]);

    deepgramSocket.onopen = () => {
      mediaRecorder = new MediaRecorder(streamAudio, { mimeType: 'audio/webm' });
      mediaRecorder.addEventListener('dataavailable', event => {
        if (event.data.size > 0 && deepgramSocket.readyState === 1) {
          deepgramSocket.send(event.data);
        }
      });
      mediaRecorder.start(250); // 250ms chunks
    };

    deepgramSocket.onmessage = (message) => {
      const data = JSON.parse(message.data);
      if (data.channel && data.channel.alternatives[0]) {
        const transcript = data.channel.alternatives[0].transcript;
        if (transcript && data.is_final) {
          transcriptBuffer += transcript + " ";
        }
      }
    };

  } catch(e) {
    console.error("Could not capture audio", e);
  }
});

ipcRenderer.on('stop-recording', async () => {
  console.log("Stop recording");
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (streamAudio) {
    streamAudio.getTracks().forEach(track => track.stop());
  }

  // Allow last few final payloads
  setTimeout(async () => {
    if (deepgramSocket) {
      deepgramSocket.close();
    }
    const finalText = await runGroqPostProcessing(transcriptBuffer.trim(), currentConfig);
    ipcRenderer.send('transcript-ready', finalText);
  }, 500); // 500ms delay to receive last Websocket data
});
