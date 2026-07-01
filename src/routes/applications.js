const express = require('express');
const router = express.Router();
const applicationsController = require('../controllers/applications');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, applicationsController.list);
router.post('/', authenticate, authorize(['student']), applicationsController.create);
router.put('/:id', authenticate, authorize(['company', 'admin']), applicationsController.update);
router.get('/:id', authenticate, applicationsController.detail);

module.exports = router;