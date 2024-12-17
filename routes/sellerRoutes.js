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
router.use(checkRole(['seller'], true));

// Seller dashboard stats
router.get('/dashboard', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const sellerId = req.userData.userId;

    // Get product counts
    const [products] = await connection.query(
      'SELECT COUNT(*) as total FROM products WHERE seller_id = ?',
      [sellerId]
    );
    const [pendingProducts] = await connection.query(
      'SELECT COUNT(*) as pending FROM products WHERE seller_id = ? AND is_active = 0',
      [sellerId]
    );
    const [activeProducts] = await connection.query(
      'SELECT COUNT(*) as active FROM products WHERE seller_id = ? AND is_active = 1',
      [sellerId]
    );

    // Get recent orders
    const [recentOrders] = await connection.query(`
      SELECT 
        t.id,
        t.total_amount,
        t.status,
        t.created_at,
        u.name as user_name,
        COUNT(ti.id) as total_items
      FROM transactions t
      JOIN transaction_items ti ON t.id = ti.transaction_id
      JOIN products p ON ti.product_id = p.id
      JOIN users u ON t.user_id = u.id
      WHERE p.seller_id = ?
      GROUP BY t.id
      ORDER BY t.created_at DESC
      LIMIT 5
    `, [sellerId]);

    // Get product performance
    const [productPerformance] = await connection.query(`
      SELECT 
        p.name,
        COUNT(ti.id) as total_sales,
        SUM(ti.quantity) as units_sold,
        SUM(ti.price * ti.quantity) as revenue
      FROM products p
      LEFT JOIN transaction_items ti ON p.id = ti.product_id
      LEFT JOIN transactions t ON ti.transaction_id = t.id
      WHERE p.seller_id = ? AND t.status = 'delivered'
      GROUP BY p.id
      ORDER BY units_sold DESC
      LIMIT 5
    `, [sellerId]);

    res.json({
      success: true,
      data: {
        totalProducts: products[0].total,
        pendingProducts: pendingProducts[0].pending,
        activeProducts: activeProducts[0].active,
        recentOrders,
        productPerformance
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Product routes
router.get('/products', sellerProductController.getAll);
router.post('/products', sellerProductController.create);
router.put('/products/:id', sellerProductController.update);
router.delete('/products/:id', sellerProductController.delete);
router.get('/products/:id', sellerProductController.getDetail);

// categoriest fecth get all
router.get('/categories', categoryController.getAll);


// Order routes
router.get('/orders', sellerOrderController.getAll);
router.put('/orders/:id/status', sellerOrderController.updateStatus);
router.put('/orders/:id/payment-status', sellerOrderController.updatePaymentStatus);

module.exports = router;