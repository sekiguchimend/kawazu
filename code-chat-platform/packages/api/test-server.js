const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Code Chat API Test' 
  });
});

app.get('/api', (req, res) => {
  res.json({ 
    message: 'Code Chat API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      rooms: '/api/rooms',
      messages: '/api/messages'
    }
  });
});

app.post('/api/rooms', (req, res) => {
  console.log('Room creation request:', req.body);
  res.status(201).json({
    success: true,
    data: {
      id: 'test-room-id',
      name: req.body.name,
      slug: req.body.slug,
      is_private: req.body.is_private || false,
      created_at: new Date().toISOString()
    }
  });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`🚀 Test API Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});