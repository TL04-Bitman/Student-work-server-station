const express = require('express');
const router = express.Router();
const jobsController = require('../controllers/jobs');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', jobsController.list);
router.get('/:id', jobsController.detail);
router.post('/', authenticate, authorize(['company', 'admin']), jobsController.create);
router.put('/:id', authenticate, authorize(['company', 'admin']), jobsController.update);
router.delete('/:id', authenticate, authorize(['company', 'admin']), jobsController.delete);

module.exports = router;