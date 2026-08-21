const express = require('express');
const router = express.Router();
const ScreenCareController = require('../controllers/screenCareController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', ScreenCareController.getSettings);
router.put('/', ScreenCareController.updateSettings);

module.exports = router;
