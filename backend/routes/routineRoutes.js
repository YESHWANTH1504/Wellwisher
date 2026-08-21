const express = require('express');
const router = express.Router();
const RoutineController = require('../controllers/routineController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', RoutineController.getSchedule);
router.post('/', RoutineController.createItem);
router.put('/:id', RoutineController.updateItem);
router.delete('/:id', RoutineController.deleteItem);

module.exports = router;
