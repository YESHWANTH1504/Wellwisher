const express = require('express');
const router = express.Router();
const VoiceController = require('../services/jarvis/communication/voiceController');
const { verifyToken } = require('../middleware/authMiddleware');

// All JARVIS voice routes require authenticated user credentials
router.use(verifyToken);

router.post('/command', VoiceController.handleVoiceCommand);
router.post('/cancel', VoiceController.cancelVoiceSession);
router.get('/telemetry', VoiceController.getVoiceTelemetry);

module.exports = router;
