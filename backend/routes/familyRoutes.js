const express = require('express');
const router = express.Router();
const FamilyController = require('../controllers/familyController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', FamilyController.getFamilyFeed);
router.get('/compliance', FamilyController.getComplianceFeed);
router.get('/quick-dial', FamilyController.getQuickDialContacts);
router.post('/remote-routine', FamilyController.addRemoteRoutine);
router.post('/nudge', FamilyController.sendNudge);

module.exports = router;
