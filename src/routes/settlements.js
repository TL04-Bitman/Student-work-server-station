const express = require('express');
const router = express.Router();
const settlementsController = require('../controllers/settlements');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, settlementsController.list);
router.post('/', authenticate, authorize(['company', 'admin']), settlementsController.create);
router.get('/:id', authenticate, settlementsController.detail);

module.exports = router;