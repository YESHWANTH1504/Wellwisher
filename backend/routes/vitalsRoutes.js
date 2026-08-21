const express = require('express');
const router = express.Router();
const VitalsController = require('../controllers/vitalsController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, VitalsController.getVitals);
router.post('/', verifyToken, VitalsController.logVitals);

module.exports = router;
