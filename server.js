// edit/server.js - Serwer dla aplikacji edytora
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

// Konfiguracja ścieżek
const SHARED_DIR = path.join(__dirname, '.', 'public');
const PREVIEW_SERVER_DIR = path.join(__dirname, '..', 'preview');

// Stałe konfiguracyjne
const PREVIEW_PORT = process.env.PREVIEW_PORT || 3010;
const EDITOR_PORT = process.env.EDITOR_PORT || 80;

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST']
}));

// Włącz parsowanie JSON i ustaw odpowiedni limit wielkości
app.use(bodyParser.json({ limit: '10mb' }));

// Dodaj własny middleware do obsługi błędów JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON parsing error:', err);
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body'
    });
  }
  next();
});

// Serwuj pliki statyczne
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(path.join(__dirname, 'public')));

// Temporary file storage
const TEMP_DIR = process.env.TEMP_DIR || path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

// Logs directory
const LOGS_DIR = process.env.LOGS_DIR || path.join(__dirname, 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR);
}

// Funkcja do zarządzania serwerem podglądu
let previewServerProcess = null;

// Funkcja do uruchamiania serwera podglądu
function startPreviewServer(componentPath) {
  // Zatrzymaj istniejący proces podglądu jeśli istnieje
  if (previewServerProcess) {
    try {
      previewServerProcess.kill();
      console.log('[INFO] Stopped existing preview server');
    } catch (error) {
      console.error('[ERROR] Error stopping existing preview server:', error);
    }
  }

  // Pełna ścieżka do komponentu
  const fullComponentPath = path.resolve(componentPath);
  console.log(`[INFO] Starting preview server for ${fullComponentPath} on port ${PREVIEW_PORT}...`);

  // Uruchom preview-server.js z folderu preview
  const previewServerPath = path.join(PREVIEW_SERVER_DIR, 'preview-server.js');

  if (fs.existsSync(previewServerPath)) {
    try {
      previewServerProcess = exec(
          `node ${previewServerPath} ${fullComponentPath} --port=${PREVIEW_PORT}`,
          (error, stdout, stderr) => {
            if (error) {
              console.error('[ERROR] Error in preview server process:', error);
            }
          }
      );

      // Loguj output z procesu
      previewServerProcess.stdout.on('data', (data) => {
        console.log(`[PREVIEW] ${data.trim()}`);
      });

      previewServerProcess.stderr.on('data', (data) => {
        console.error(`[PREVIEW ERROR] ${data.trim()}`);
      });

      previewServerProcess.on('close', (code) => {
        console.log(`[INFO] Preview server exited with code ${code}`);
      });

      return true;
    } catch (error) {
      console.error('[ERROR] Failed to start preview server:', error);
      return false;
    }
  } else {
    console.error(`[ERROR] Preview server script not found: ${previewServerPath}`);
    return false;
  }
}

// Uruchom serwer podglądu dla przykładowego komponentu
const exampleComponentPath = path.join(SHARED_DIR, 'example.js');
if (fs.existsSync(exampleComponentPath)) {
  startPreviewServer(exampleComponentPath);
} else {
  console.warn(`[WARN] Example component not found: ${exampleComponentPath}`);
}

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('[INFO] Client connected');

  // Handle code update and preview request
  socket.on('update-code', (code) => {
    try {
      const tempFile = path.join(SHARED_DIR, 'example.js');

      // Save code to file
      fs.writeFileSync(tempFile, code);

      // Inform client
      socket.emit('code-updated', {
        success: true,
        message: 'Code updated successfully'
      });

      // No need to restart preview server as it watches the file for changes
    } catch (error) {
      socket.emit('code-updated', {
        success: false,
        error: error.message
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('[INFO] Client disconnected');
  });
});

// API endpoints
// ------------------------------------------------------------

// Get example file
app.get('/api/example', (req, res) => {
  const filePath = path.join(SHARED_DIR, 'example.js');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Failed to read file:', err);
      return res.status(500).send('Failed to read example file');
    }
    res.setHeader('Content-Type', 'text/plain');
    res.send(data);
  });
});

// Update example file
app.post('/api/example', (req, res) => {
  try {
    const { code } = req.body;
    const filePath = path.join(SHARED_DIR, 'example.js');

    fs.writeFileSync(filePath, code, 'utf8');

    res.setHeader('Content-Type', 'application/json');
    res.json({
      success: true,
      message: 'Code updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to update code: ${error.message}`
    });
  }
});

// Restart preview server
app.post('/api/restart-preview', (req, res) => {
  try {
    const componentPath = path.join(SHARED_DIR, 'example.js');
    const success = startPreviewServer(componentPath);

    res.setHeader('Content-Type', 'application/json');
    if (success) {
      res.json({
        success: true,
        message: `Preview restarted on port ${PREVIEW_PORT}`
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to restart preview server'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error restarting preview: ${error.message}`
    });
  }
});

// Configuration endpoint
app.get('/api/config', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    previewPort: PREVIEW_PORT,
    editorPort: EDITOR_PORT,
    previewUrl: `http://localhost:${PREVIEW_PORT}`
  });
});

// Serve the main HTML file for all remaining routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start the server
server.listen(EDITOR_PORT, () => {
  console.log(`[INFO] Editor server running on port ${EDITOR_PORT}`);
  console.log(`[INFO] Preview server running on port ${PREVIEW_PORT}`);
  console.log(`[INFO] Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Zatrzymaj procesy przy zamknięciu serwera
process.on('SIGINT', () => {
  if (previewServerProcess) {
    previewServerProcess.kill();
  }
  process.exit();
});

process.on('SIGTERM', () => {
  if (previewServerProcess) {
    previewServerProcess.kill();
  }
  process.exit();
});
