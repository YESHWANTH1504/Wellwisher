const express = require('express');
const router = express.Router();
const AutonomousController = require('../controllers/autonomousController');
const { verifyToken } = require('../middleware/authMiddleware');

// Mount routes (with optional token verification for testing, standard in production)
router.post('/voice-command', verifyToken, AutonomousController.handleVoiceCommand);
router.post('/tasks', verifyToken, AutonomousController.createTask);
router.get('/tasks', verifyToken, AutonomousController.listTasks);
router.post('/device/register', verifyToken, AutonomousController.registerDevice);
router.get('/status', verifyToken, AutonomousController.getStatus);

module.exports = router;
