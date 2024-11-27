const express = require('express');
const router = express.Router();
const { productController } = require('../controllers/productController');

// Mendapatkan semua produk dengan detail lengkap
router.get('/products/all', productController.getAllDetailed);

module.exports = router;