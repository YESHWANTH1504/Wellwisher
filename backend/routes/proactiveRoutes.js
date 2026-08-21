const express = require('express');
const router = express.Router();
const ProactiveController = require('../controllers/proactiveController');
const { verifyToken } = require('../middleware/authMiddleware');

// All proactive routes require verified JWT authentication and user isolation
router.use(verifyToken);

// Proactive Feed & Action Endpoints
router.get('/proactive/feed', ProactiveController.getFeed);
router.post('/proactive/evaluate', ProactiveController.evaluate);
router.post('/proactive/:id/dismiss', ProactiveController.dismissEvent);
router.post('/proactive/:id/act', ProactiveController.actOnEvent);

// Briefing & Summary Endpoints
router.get('/briefing/today', ProactiveController.getDailyBriefing);
router.get('/summary/today', ProactiveController.getEveningSummary);

// Preferences Endpoints
router.get('/preferences', ProactiveController.getPreferences);
router.put('/preferences', ProactiveController.updatePreferences);

module.exports = router;
