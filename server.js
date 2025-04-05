const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const reactstreamPath = path.join(__dirname, 'reactstream-wrapper.js');

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
    // JSON parsing error
    console.error('JSON parsing error:', err);
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body'
    });
  }
  next();
});

// WAŻNE: USUNIĘTE ustawienie globalnego nagłówka Content-Type na application/json
// To powodowało, że HTML był serwowany z nieprawidłowym typem MIME

// Serwuj pliki statyczne
app.use(express.static(path.join(__dirname, 'dist')));

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

// Globalna zmienna do przechowywania procesu podglądu
let previewProcess = null;
// Dodaj zmienną do przechowywania referencji do serwera fallback
let previewServer = null;

// Funkcja do logowania z dodatkowym formatowaniem i zapisem do pliku
function logEvent(type, message, details = null) {
  const timestamp = new Date().toISOString();
  let logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;

  if (details) {
    if (typeof details === 'object') {
      try {
        logMessage += `\nDetails: ${JSON.stringify(details, null, 2)}`;
      } catch (e) {
        logMessage += `\nDetails: [Object cannot be stringified]`;
      }
    } else {
      logMessage += `\nDetails: ${details}`;
    }
  }

  // Wypisz do konsoli serwerowej
  switch(type.toLowerCase()) {
    case 'error':
      console.error(logMessage);
      break;
    case 'warn':
      console.warn(logMessage);
      break;
    case 'info':
    default:
      console.log(logMessage);
  }

  // Zapisz do pliku logów
  try {
    const logFilePath = path.join(LOGS_DIR, `${type.toLowerCase()}.log`);
    fs.appendFileSync(logFilePath, logMessage + '\n');
  } catch (error) {
    console.error(`Failed to write to log file: ${error.message}`);
  }

  return logMessage;
}

// Funkcja do tworzenia prostego serwera podglądu zamiast używania reactstream
function createFallbackPreviewServer(componentPath, port) {
  const fallbackServer = express();

  // Obsługa CORS
  fallbackServer.use(cors({ origin: '*' }));

  // Serwowanie pliku HTML fallback
  fallbackServer.get('/', (req, res) => {
    // Ścieżka do fallback HTML
    const fallbackHtmlPath = path.join(__dirname, 'public', 'preview-fallback.html');

    // Sprawdź czy plik fallback istnieje
    if (fs.existsSync(fallbackHtmlPath)) {
      res.sendFile(fallbackHtmlPath);
    } else {
      // Jeśli nie ma pliku, zwróć prosty HTML
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Component Preview</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .container { max-width: 800px; margin: 0 auto; }
            .alert { padding: 10px; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; }
            .code { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto; margin-top: 15px; }
            pre { margin: 0; white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Component Preview</h1>
            <div class="alert">
              <p>Podgląd komponentu w trybie zastępczym.</p>
              <p>Edytuj kod w edytorze i kliknij "Update Preview" aby zobaczyć zmiany.</p>
            </div>
            <h3>Kod komponentu:</h3>
            <div class="code">
              <pre>${fs.existsSync(componentPath) ? fs.readFileSync(componentPath, 'utf8') : 'Nie znaleziono pliku komponentu'}</pre>
            </div>
          </div>
        </body>
        </html>
      `);
    }
  });

  // Dodaj endpoint, który zwraca zawartość komponentu jako tekst
  fallbackServer.get('/component-source', (req, res) => {
    try {
      if (fs.existsSync(componentPath)) {
        const componentSource = fs.readFileSync(componentPath, 'utf8');
        res.setHeader('Content-Type', 'text/plain');
        res.send(componentSource);
      } else {
        res.status(404).send('Component file not found');
      }
    } catch (error) {
      res.status(500).send(`Error reading component: ${error.message}`);
    }
  });

  // Spróbuj uruchomić serwer na podanym porcie
  try {
    const server = fallbackServer.listen(port, () => {
      logEvent('info', `Fallback preview server running on port ${port}`);
    });

    // Zwróć referencję do serwera, aby można było go zamknąć później
    return server;
  } catch (error) {
    logEvent('error', `Failed to start fallback preview server: ${error.message}`);
    return null;
  }
}

// Zmodyfikowana funkcja startExamplePreview
function startExamplePreview() {
  // Zatrzymaj istniejący proces podglądu jeśli istnieje
  if (previewProcess) {
    try {
      previewProcess.kill();
      logEvent('info', 'Stopped existing preview process');
    } catch (error) {
      logEvent('error', 'Error stopping existing preview process', error);
    }
  }

  // Zatrzymaj istniejący serwer fallback jeśli istnieje
  if (previewServer) {
    try {
      previewServer.close();
      logEvent('info', 'Stopped existing fallback server');
    } catch (error) {
      logEvent('error', 'Error stopping existing fallback server', error);
    }
    previewServer = null;
  }

  const exampleFile = path.join(__dirname, 'src', 'example.js');

  // Sprawdź czy plik istnieje
  if (fs.existsSync(exampleFile)) {
    logEvent('info', `Starting preview server for ${exampleFile} on port 3010...`);

    // Najpierw spróbuj użyć reactstream jeśli istnieje
    const reactstreamExecutable = path.join(__dirname, 'node_modules', '.bin', 'reactstream');

    if (fs.existsSync(reactstreamExecutable)) {
      try {
        previewProcess = exec(
            `${reactstreamPath} serve ${exampleFile} --port=3010`,
            (error, stdout, stderr) => {
              if (error) {
                logEvent('error', 'Error in preview process', error);

                // Jeśli reactstream zawiedzie, uruchom fallback
                logEvent('info', 'Starting fallback preview server...');
                previewServer = createFallbackPreviewServer(exampleFile, 3010);
              }
            }
        );

        // Loguj output z procesu
        previewProcess.stdout.on('data', (data) => {
          logEvent('info', `Preview stdout: ${data.trim()}`);
        });

        previewProcess.stderr.on('data', (data) => {
          logEvent('error', `Preview stderr: ${data.trim()}`);
        });

        previewProcess.on('close', (code) => {
          logEvent('info', `Preview process exited with code ${code}`);

          // Jeśli proces zakończy się z błędem, uruchom fallback
          if (code !== 0) {
            logEvent('info', 'Starting fallback preview server after process exit...');
            previewServer = createFallbackPreviewServer(exampleFile, 3010);
          }
        });

        return true;
      } catch (error) {
        logEvent('error', 'Failed to start preview process', error);

        // Uruchom fallback jeśli nie udało się uruchomić reactstream
        logEvent('info', 'Starting fallback preview server after error...');
        previewServer = createFallbackPreviewServer(exampleFile, 3010);
        return true;
      }
    } else {
      // Jeśli reactstream nie istnieje, od razu użyj fallbacku
      logEvent('warn', 'ReactStream executable not found, using fallback server');
      previewServer = createFallbackPreviewServer(exampleFile, 3010);
      return true;
    }
  } else {
    logEvent('error', `Example file not found: ${exampleFile}`);
    return false;
  }
}

// Uruchom podgląd przykładowego komponentu przy starcie serwera
startExamplePreview();

// API routes - MUSZĄ być przed obsługą '*' route
// --------------------------------------------------------------------------

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected');

  // Handle code analysis request
  socket.on('analyze-code', (code) => {
    const tempFile = path.join(TEMP_DIR, `component-${Date.now()}.jsx`);

    // Save code to temporary file
    fs.writeFileSync(tempFile, code);

    // Build command with environment variables
    const analyzeCommand = `${reactstreamPath} analyze ${tempFile} ${
        process.env.VERBOSE_OUTPUT === 'true' ? '--verbose' : ''
    } ${
        process.env.AUTO_FIX === 'true' ? '--fix' : ''
    } ${
        process.env.ENABLE_DEBUG === 'true' ? '--debug' : ''
    }`;

    // Run ReactStream analyze command
    exec(analyzeCommand, (error, stdout, stderr) => {
      socket.emit('analysis-result', {
        output: stdout,
        error: stderr || (error ? error.message : null)
      });

      // Log analysis results
      const timestamp = new Date().toISOString();
      fs.appendFileSync(
          path.join(LOGS_DIR, 'analysis.log'),
          `[${timestamp}] Analysis performed\n${stdout}\n${stderr || ''}\n\n`
      );

      // Clean up temp file
      fs.unlinkSync(tempFile);
    });
  });

  // Handle component preview request
  socket.on('preview-component', (code) => {
    const tempFile = path.join(TEMP_DIR, `component-${Date.now()}.jsx`);

    // Save code to temporary file
    fs.writeFileSync(tempFile, code);

    // Zatrzymaj istniejący proces podglądu jeśli istnieje
    if (previewProcess) {
      try {
        previewProcess.kill();
      } catch (error) {
        console.log('Error stopping existing preview process:', error);
      }
    }

    // Zatrzymaj istniejący serwer fallback jeśli istnieje
    if (previewServer) {
      try {
        previewServer.close();
      } catch (error) {
        console.log('Error stopping existing fallback server:', error);
      }
      previewServer = null;
    }

    // Run ReactStream serve command (non-blocking)
    previewProcess = exec(
        `${reactstreamPath} serve ${tempFile} --port=3010`
    );

    previewProcess.stdout.on('data', (data) => {
      socket.emit('serve-output', { type: 'stdout', data });

      // Log serve output
      const timestamp = new Date().toISOString();
      fs.appendFileSync(
          path.join(LOGS_DIR, 'serve.log'),
          `[${timestamp}] STDOUT: ${data}\n`
      );
    });

    previewProcess.stderr.on('data', (data) => {
      socket.emit('serve-output', { type: 'stderr', data });

      // Log serve errors
      const timestamp = new Date().toISOString();
      fs.appendFileSync(
          path.join(LOGS_DIR, 'serve.log'),
          `[${timestamp}] STDERR: ${data}\n`
      );

      // Jeśli pojawił się błąd, uruchom fallback
      previewServer = createFallbackPreviewServer(tempFile, 3010);
    });

    socket.on('disconnect', () => {
      // Nie zatrzymujemy procesu podglądu przy rozłączeniu, żeby podgląd był nadal dostępny
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    });
  });
});

// Poprawiony endpoint do restartu serwera podglądu z przykładowym komponentem
app.post('/api/restart-preview', (req, res) => {
  try {
    startExamplePreview();
    // Upewnij się, że odpowiedź jest poprawnym JSON i ma poprawny nagłówek
    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, message: 'Preview restarted on port 3010' });
  } catch (error) {
    // Obsługa błędów również zwraca poprawny JSON
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({
      success: false,
      message: `Failed to restart preview: ${error.message}`
    });
  }
});

// Poprawiony endpoint do aktualizacji podglądu
app.post('/api/preview', (req, res) => {
  try {
    const { code } = req.body;
    const tempFile = path.join(TEMP_DIR, `component-${Date.now()}.jsx`);

    fs.writeFileSync(tempFile, code);

    // Zatrzymaj istniejący proces podglądu
    if (previewProcess) {
      try {
        previewProcess.kill();
      } catch (error) {
        console.log('Error stopping existing preview process:', error);
      }
    }

    // Zatrzymaj istniejący serwer fallback jeśli istnieje
    if (previewServer) {
      try {
        previewServer.close();
      } catch (error) {
        console.log('Error stopping existing fallback server:', error);
      }
      previewServer = null;
    }

    // Uruchom nowy proces podglądu
    previewProcess = exec(`${reactstreamPath} serve ${tempFile} --port=3010`);

    let isError = false;

    previewProcess.stdout.on('data', (data) => {
      console.log(`Preview stdout: ${data}`);
    });

    previewProcess.stderr.on('data', (data) => {
      console.error(`Preview stderr: ${data}`);
      isError = true;

      // Jeśli pojawił się błąd, uruchom fallback
      if (!previewServer) {
        previewServer = createFallbackPreviewServer(tempFile, 3010);
      }
    });

    previewProcess.on('exit', (code) => {
      if (code !== 0 && !previewServer) {
        // Jeśli proces zakończył się z błędem i nie ma uruchomionego fallbacka
        previewServer = createFallbackPreviewServer(tempFile, 3010);
      }
    });

    // Zwróć poprawny JSON
    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, message: 'Preview started on port 3010' });
  } catch (error) {
    // W przypadku błędu, również zwróć poprawny JSON
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({
      success: false,
      message: `Failed to update preview: ${error.message}`
    });
  }
});

app.post('/api/analyze', (req, res) => {
  const { code } = req.body;
  const tempFile = path.join(TEMP_DIR, `component-${Date.now()}.jsx`);

  fs.writeFileSync(tempFile, code);

  // Build command with environment variables
  const analyzeCommand = `${reactstreamPath} analyze ${tempFile} ${
      process.env.VERBOSE_OUTPUT === 'true' ? '--verbose' : ''
  } ${
      process.env.AUTO_FIX === 'true' ? '--fix' : ''
  } ${
      process.env.ENABLE_DEBUG === 'true' ? '--debug' : ''
  }`;

  exec(analyzeCommand, (error, stdout, stderr) => {
    res.setHeader('Content-Type', 'application/json');
    res.json({
      output: stdout,
      error: stderr || (error ? error.message : null)
    });

    fs.unlinkSync(tempFile);
  });
});

app.get('/api/config', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    devServerPort: 3010, // Zawsze zwracamy port 3010
    debug: process.env.ENABLE_DEBUG === 'true',
    autoFix: process.env.AUTO_FIX === 'true',
    verbose: process.env.VERBOSE_OUTPUT === 'true'
  });
});

// Get example file
app.get('/api/example', (req, res) => {
  const filePath = path.join(__dirname, 'src', 'example.js');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Failed to read file:', err);
      return res.status(500).send('Failed to read example file');
    }
    // Ważne: dla plików tekstowych nie ustawiamy application/json
    res.setHeader('Content-Type', 'text/plain');
    res.send(data);
  });
});

// WAŻNE: Route catch-all musi być na samym końcu
// To jest ważne, aby inne trasy miały wyższy priorytet!
// --------------------------------------------------------------------------

// Serve the main HTML file for all remaining routes (MUSI być na końcu)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start the server
const PORT = process.env.SERVER_PORT || 80;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Preview running on port 3010`);
});

// Zatrzymaj proces podglądu przy zamknięciu serwera
process.on('SIGINT', () => {
  if (previewProcess) {
    previewProcess.kill();
  }
  if (previewServer) {
    previewServer.close();
  }
  process.exit();
});

process.on('SIGTERM', () => {
  if (previewProcess) {
    previewProcess.kill();
  }
  if (previewServer) {
    previewServer.close();
  }
  process.exit();
});
