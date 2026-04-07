const { app, BrowserWindow, Tray, Menu, ipcMain, clipboard, nativeImage } = require('electron');
const path = require('path');
const { uIOhook, UiohookKey } = require('uiohook-napi');
const { exec } = require('child_process');
const fs = require('fs');

let tray = null;
let settingsWindow = null;
let audioWindow = null;
let isRecording = false;

const iconPath = path.join(__dirname, '../../assets/icon.png');

// Load Config
const configPath = path.join(app.getAppPath(), 'config.json');
let config = { deepgram: { apiKey: '' }, groq: { apiKey: '' } };
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

async function getDeepgramBalance() {
  if (!config.deepgram.apiKey) return null;
  try {
    const res = await fetch('https://api.deepgram.com/v1/projects', {
      headers: { 'Authorization': `Token ${config.deepgram.apiKey}` }
    });
    const data = await res.json();
    if (data.projects && data.projects.length > 0) {
      const projectId = data.projects[0].project_id;
      const bRes = await fetch(`https://api.deepgram.com/v1/projects/${projectId}/balances`, {
        headers: { 'Authorization': `Token ${config.deepgram.apiKey}` }
      });
      const bData = await bRes.json();
      if (bData.balances && bData.balances.length > 0) {
        return bData.balances[0].amount;
      }
    }
  } catch (e) {
    console.error("Deepgram balance fetch error:", e);
  }
  return null;
}

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.show();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 600,
    height: 700,
    show: true,
    icon: nativeImage.createFromPath(iconPath),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const url = process.env.VITE_DEV_SERVER_URL 
    ? process.env.VITE_DEV_SERVER_URL 
    : `file://${path.join(__dirname, '../../dist/renderer/index.html')}`;
  
  settingsWindow.loadURL(url);
  
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}
function createAudioWindow() {
  // Hidden window for capturing microphone purely via Web APIs
  audioWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Handle permission requests automatically
  audioWindow.webContents.session.setPermissionCheckHandler((webContents, permission) => {
    if (permission === 'media') return true;
    return false;
  });
  audioWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') callback(true);
    else callback(false);
  });

  audioWindow.loadURL(`file://${path.join(__dirname, '../renderer/audio.html')}`);
}

app.whenReady().then(() => {
  tray = new Tray(nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Settings', click: createSettingsWindow },
    { type: 'separator' },
    { label: 'Quit VocalFlow', role: 'quit' }
  ]);
  tray.setToolTip('VocalFlow Windows');
  tray.setContextMenu(contextMenu);

  createAudioWindow();
  setupHotkeys();

  ipcMain.handle('get-balances', async () => {
    const dgBalance = await getDeepgramBalance();
    return {
      deepgram: dgBalance,
      groq: "N/A (No Groq API endpoint available - view in Console)"
    };
  });

  ipcMain.on('transcript-ready', (event, text) => {
    console.log("Transcript received:", text);
    injectText(text);
  });
});

function injectText(text) {
  if (!text) return;
  // Save transcript to clipboard
  clipboard.writeText(text);

  // Trigger global paste via PowerShell snippet
  // We use SendKeys `^{v}` which equates to Control + V
  const psCommand = `powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^{v}')"`;
  
  setTimeout(() => {
    exec(psCommand, (err) => {
      if (err) console.error("Paste Error", err);
    });
  }, 100);
}

function setupHotkeys() {
  // Let's use Right Alt (R_ALT) as default, can be dynamically configured later.
  uIOhook.on('keydown', e => {
    if (e.keycode === UiohookKey.AltRight && !isRecording) {
      isRecording = true;
      audioWindow.webContents.send('start-recording', config);
      console.log('Recording started...');
    }
  });

  uIOhook.on('keyup', e => {
    if (e.keycode === UiohookKey.AltRight && isRecording) {
      isRecording = false;
      audioWindow.webContents.send('stop-recording');
      console.log('Recording stopped...');
    }
  });

  uIOhook.start();
}

app.on('window-all-closed', () => {
  // Keep tray open, don't quit unless requested
});

app.on('will-quit', () => {
  uIOhook.stop();
});
