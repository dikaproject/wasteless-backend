// routes/sellerRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth, checkRole } = require('../middleware/auth');
const { sellerProductController } = require('../controllers/sellerProductController');
const { categoryController } = require('../controllers/categoryController');
const { sellerOrderController } = require('../controllers/sellerOrderController');

// Apply middleware to all seller routes
router.use(auth);
router.use(checkRole(['seller']));

// Seller dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const sellerId = req.userData.userId;
    const [products] = await pool.query(
      'SELECT COUNT(*) as total FROM products WHERE seller_id = ?',
      [sellerId]
    );
    const [pendingProducts] = await pool.query(
      'SELECT COUNT(*) as pending FROM products WHERE seller_id = ? AND is_active = 0',
      [sellerId]
    );
    const [activeProducts] = await pool.query(
      'SELECT COUNT(*) as active FROM products WHERE seller_id = ? AND is_active = 1',
      [sellerId]
    );

    res.json({
      success: true,
      data: {
        totalProducts: products[0].total,
        pendingProducts: pendingProducts[0].pending,
        activeProducts: activeProducts[0].active
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Product routes
router.get('/products', sellerProductController.getAll);
router.post('/products', sellerProductController.create);
router.put('/products/:id', sellerProductController.update);
router.delete('/products/:id', sellerProductController.delete);

// categoriest fecth get all
router.get('/categories', categoryController.getAll);


// Order routes
router.get('/orders', sellerOrderController.getAll);
router.put('/orders/:id/status', sellerOrderController.updateStatus);

module.exports = router;