/**
 * Tasks Routes
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares');
const { getTasks, claimTask, claimDailyLogin } = require('../controllers/tasksController');

router.use(authMiddleware);

router.get('/', getTasks);
router.post('/daily-login', claimDailyLogin);
router.post('/:taskId/claim', claimTask);

module.exports = router;
