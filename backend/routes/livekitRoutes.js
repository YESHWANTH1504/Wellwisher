const express = require('express');
const router = express.Router();
const LiveKitController = require('../controllers/livekitController');
const { verifyToken } = require('../middleware/authMiddleware');

// Authenticated LiveKit token generation
router.post('/token', verifyToken, LiveKitController.getToken);

// Session management
router.post('/session/start', verifyToken, LiveKitController.startSession);
router.post('/session/stop', verifyToken, LiveKitController.stopSession);

// LiveKit Server Webhook
router.post('/webhook', LiveKitController.handleWebhook);

// Diagnostics
router.get('/diagnostics', verifyToken, LiveKitController.getDiagnostics);

module.exports = router;
