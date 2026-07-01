const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users');
const { authenticate } = require('../middleware/auth');

router.get('/profile', authenticate, usersController.profile);
router.put('/profile', authenticate, usersController.updateProfile);

module.exports = router;