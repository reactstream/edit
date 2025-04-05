// editor/server.js
const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

// Constants
const PORT = process.env.PORT || 80;
const PREVIEW_URL = process.env.PREVIEW_URL || 'http://localhost:3010';
const CODEBASE_URL = process.env.CODEBASE_URL || 'http://localhost:3020';

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// Proxy endpoints to codebase service
app.use('/api', async (req, res) => {
  try {
    const url = `${CODEBASE_URL}${req.url}`;
    const method = req.method.toLowerCase();

    // Forward request to codebase service
    const response = await axios({
      method,
      url,
      data: method !== 'get' ? req.body : undefined,
      headers: {
        ...req.headers,
        host: new URL(CODEBASE_URL).host
      },
      withCredentials: true,
      // Pass cookies for session tracking
      headers: {
        'Cookie': req.headers.cookie || ''
      }
    });

    // Set headers
    Object.entries(response.headers).forEach(([key, value]) => {
      res.set(key, value);
    });

    // Set cookies if any are returned
    if (response.headers['set-cookie']) {
      res.set('set-cookie', response.headers['set-cookie']);
    }

    // Send response
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error(`API proxy error: ${error.message}`);

    // Forward error response if available
    if (error.response) {
      res.status(error.response.status).send(error.response.data);
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

// Socket.IO connections
io.on('connection', (socket) => {
  console.log('Client connected');

  // Handle code update
  socket.on('code-update', async (data) => {
    try {
      const { projectId, filePath, code } = data;

      // Save file via API
      await axios.put(`${CODEBASE_URL}/api/files/${projectId}/${filePath}`, {
        content: code,
        commitMessage: `Update ${filePath} via socket`
      });

      socket.emit('code-saved', {
        success: true,
        message: 'Code saved successfully'
      });
    } catch (error) {
      console.error(`Error saving code: ${error.message}`);
      socket.emit('code-saved', {
        success: false,
        error: error.message
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Editor server is running',
    timestamp: new Date().toISOString()
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Editor server running on port ${PORT}`);
  console.log(`Connected to codebase service at: ${CODEBASE_URL}`);
  console.log(`Connected to preview service at: ${PREVIEW_URL}`);
});
