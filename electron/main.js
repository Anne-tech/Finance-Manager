const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const PORT = 51734;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      let filePath = path.join(DIST_DIR, urlPath);

      if (!filePath.startsWith(DIST_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
          // SPA fallback: rotas do expo-router caem no index.html
          filePath = path.join(DIST_DIR, 'index.html');
        }
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      });
    });

    server.listen(PORT, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Finance Manager',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(`http://127.0.0.1:${PORT}/`);
  return win;
}

// Salva conteúdo em disco via diálogo nativo "Salvar como".
ipcMain.handle('save-file', async (event, { defaultPath, filters, content, encoding }) => {
  const parentWindow = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showSaveDialog(parentWindow, { defaultPath, filters });
  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }
  const buffer = Buffer.from(content, encoding === 'base64' ? 'base64' : 'utf-8');
  fs.writeFileSync(result.filePath, buffer);
  return { canceled: false, filePath: result.filePath };
});

// Renderiza HTML para PDF (sem passar pelo diálogo de impressão) e salva via "Salvar como".
ipcMain.handle('print-to-pdf', async (event, { html, defaultPath }) => {
  const parentWindow = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showSaveDialog(parentWindow, {
    defaultPath,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  const hiddenWin = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  try {
    await hiddenWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    const pdfBuffer = await hiddenWin.webContents.printToPDF({});
    fs.writeFileSync(result.filePath, pdfBuffer);
  } finally {
    hiddenWin.destroy();
  }

  return { canceled: false, filePath: result.filePath };
});

app.whenReady().then(async () => {
  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    console.error(
      `Build web não encontrado em "${DIST_DIR}". Rode "npm run build:web" antes de iniciar o Electron.`
    );
    app.quit();
    return;
  }

  await startStaticServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
