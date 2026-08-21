const express = require('express');
const router = express.Router();
const HydrationController = require('../controllers/hydrationController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', HydrationController.getDailyHydration);
router.post('/', HydrationController.logWater);

module.exports = router;
