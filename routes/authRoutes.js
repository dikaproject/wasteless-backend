const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/register-seller', authController.registerSeller);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// Protected routes
router.use(auth);
router.put('/address', authController.updateAddress);
router.get('/profile', authController.getProfile);

module.exports = router;