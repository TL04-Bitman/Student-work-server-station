const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/login/code', authController.sendLoginCode);
router.post('/register/code', authController.sendRegisterCode);
router.post('/login/sms', authController.loginBySms);
router.post('/check-phone', authController.checkPhone);

module.exports = router;