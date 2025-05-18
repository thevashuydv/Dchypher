const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const repositoryController = require('./controllers/repositoryController');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.post('/api/analyze', repositoryController.analyzeRepository);
app.get('/api/status/:id', repositoryController.getAnalysisStatus);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
