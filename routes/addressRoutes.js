const express = require('express');
const router = express.Router();
const { addressController } = require('../controllers/addressController');
const { auth } = require('../middleware/auth');

// Get user's address
router.get('/address', auth, addressController.getAddress);

// Update user's address
router.post('/address', auth, addressController.updateAddress);

module.exports = router;