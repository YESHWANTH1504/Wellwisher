const express = require('express');
const router = express.Router();
const SleepMoodController = require('../controllers/sleepMoodController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', SleepMoodController.getLog);
router.post('/', SleepMoodController.logSleepMood);

module.exports = router;
