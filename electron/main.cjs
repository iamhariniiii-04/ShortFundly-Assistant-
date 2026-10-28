const { app, BrowserWindow, ipcMain, shell, Notification } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let backendProcess = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function checkBackendHealth(callback) {
  const req = http.get('http://127.0.0.1:5000/api/health', (res) => {
    if (res.statusCode === 200) {
      callback(true);
    } else {
      callback(false);
    }
  });
  req.on('error', () => callback(false));
  req.setTimeout(1000, () => {
    req.abort();
    callback(false);
  });
}

function startBackend() {
  checkBackendHealth((running) => {
    if (running) {
      console.log('Backend is already running on port 5000.');
      return;
    }

    console.log('Spawning Python Flask backend...');
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const appPath = path.join(__dirname, '..', 'backend', 'app.py');

    backendProcess = spawn(pythonCmd, [appPath], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });

    backendProcess.on('error', (err) => {
      console.error('Failed to spawn Python backend:', err);
    });

    backendProcess.on('exit', (code, signal) => {
      console.log(`Backend exited with code ${code} and signal ${signal}`);
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,
    minWidth: 840,
    minHeight: 600,
    title: 'ShortFundly Voice Assistant',
    icon: path.join(__dirname, '..', 'public', 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    backgroundColor: '#0b0f19',
    autoHideMenuBar: true
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.on('app:notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body, icon: path.join(__dirname, '..', 'public', 'logo.png') }).show();
  }
});

ipcMain.on('app:openExternal', (event, url) => {
  shell.openExternal(url);
});

app.whenReady().then(() => {
  startBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});
