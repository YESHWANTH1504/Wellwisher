const express = require('express');
const router = express.Router();
const MedicationController = require('../controllers/medicationController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', MedicationController.getMedications);
router.post('/', MedicationController.addMedication);
router.post('/:id/take', MedicationController.takeMedication);
router.post('/check-interaction', MedicationController.checkInteraction);
router.post('/ocr-parse', MedicationController.ocrParse);

module.exports = router;
