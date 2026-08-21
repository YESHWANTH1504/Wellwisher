const express = require('express');
const router = express.Router();
const AiController = require('../controllers/aiController');
const ProactiveController = require('../controllers/proactiveController');
const PersonalIntelligenceController = require('../controllers/personalIntelligenceController');
const DocumentController = require('../controllers/documentController');
const HealthIntelligenceController = require('../controllers/healthIntelligenceController');
const { handleUploadMiddleware } = require('../middleware/fileUploadMiddleware');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

// Interactive JARVIS Agent Chat & Confirmation
router.post('/chat', AiController.chat);
router.post('/confirm-action', AiController.confirmAction);
router.post('/generate-plan', AiController.generatePlan);
router.post('/analyze-journal', AiController.analyzeJournal);
router.post('/save-game-score', AiController.saveGameScore);

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

// Personal Intelligence & Memory Management Endpoints (Phase 7)
router.get('/profile', PersonalIntelligenceController.getProfile);
router.get('/memories', PersonalIntelligenceController.getMemories);
router.put('/memories/:id', PersonalIntelligenceController.updateMemory);
router.delete('/memories/:id', PersonalIntelligenceController.deleteMemory);
router.post('/memories/clear', PersonalIntelligenceController.clearMemories);
router.get('/weekly-summary', PersonalIntelligenceController.getWeeklySummary);
router.post('/personalization/reset', PersonalIntelligenceController.resetPersonalization);

// Multi-Modal Document & Vision Endpoints (Phase 8)
router.post('/documents/upload', handleUploadMiddleware, DocumentController.uploadDocument);
router.get('/documents', DocumentController.listDocuments);
router.get('/documents/search', DocumentController.searchDocuments);
router.post('/documents/compare', DocumentController.compareDocuments);
router.post('/documents/clear', DocumentController.clearAllDocuments);
router.get('/documents/:id', DocumentController.getDocument);
router.get('/documents/:id/summary', DocumentController.getDocumentSummary);
router.get('/documents/:id/extraction', DocumentController.getDocumentExtraction);
router.get('/documents/:id/values', DocumentController.getDocumentExtraction);
router.post('/documents/:id/process', DocumentController.processExistingDocument);
router.post('/documents/:id/confirm', DocumentController.confirmExtraction);
router.delete('/documents/:id', DocumentController.deleteDocument);

// Autonomous Health Intelligence & Workflow Automation Endpoints (Phase 9)
router.get('/health/trends', HealthIntelligenceController.getTrends);
router.get('/health/alerts', HealthIntelligenceController.getAlerts);
router.post('/health/alerts/:id/dismiss', HealthIntelligenceController.dismissAlert);
router.get('/health/medication-conflicts', HealthIntelligenceController.getMedicationConflicts);
router.get('/health/overview', HealthIntelligenceController.getOverview);
router.post('/health/doctor-briefing', HealthIntelligenceController.generateDoctorBriefing);
router.get('/health/doctor-briefings', HealthIntelligenceController.getDoctorBriefings);
router.get('/health/doctor-briefing/:id', HealthIntelligenceController.getDoctorBriefingById);
router.post('/health/export', HealthIntelligenceController.exportHealthData);
router.post('/health/clear', HealthIntelligenceController.clearHealthIntelligenceData);

module.exports = router;
