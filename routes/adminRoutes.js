const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const { productController } = require('../controllers/productController');
const { categoryController } = require('../controllers/categoryController');
const { usersController } = require('../controllers/usersController');


router.use(auth);
router.use(checkRole(['admin']));


router.get('/admin', async (req, res) => {
    try {

        const stats = {
            totalOrders: 0,
            totalProducts: 0,
            totalUsers: 0,
            totalRevenue: 0,
            recentOrders: [],
            recentUsers: []
        };

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Dashboard Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard data'
        });
    }
});

// Category routes
router.get('/categories', categoryController.getAll);
router.post('/categories', categoryController.create);
router.put('/categories/:id', categoryController.update);
router.get('/categories/:id', categoryController.getDetail);
router.delete('/categories/:id', categoryController.delete);

// Product routes
router.get('/products', productController.getAll);
router.post('/products', productController.create);
router.put('/products/:id', productController.update);
router.get('/products/:id', productController.getDetail);
router.delete('/products/:id', productController.delete);

// User routes
router.get('/users', usersController.getAll);
router.post('/users', usersController.create);
router.put('/users/:id', usersController.update);
router.get('/users/:id', usersController.getDetail);
router.delete('/users/:id', usersController.delete);
router.put('/users/reset/:id', usersController.resetPassword);
// Orders Management
router.get('/orders', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        // Implement pagination and filtering
        const orders = []; // Get from database
        
        res.json({
            success: true,
            data: orders,
            pagination: {
                page,
                limit,
                total: 0 // Total count from DB
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching orders'
        });
    }
});

router.put('/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        // Implement order status update logic
        
        res.json({
            success: true,
            message: 'Order status updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating order status'
        });
    }
});

// Users Management
router.get('/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        // Implement pagination and filtering
        const users = []; // Get from database
        
        res.json({
            success: true,
            data: users,
            pagination: {
                page,
                limit,
                total: 0 // Total count from DB
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching users'
        });
    }
});

// Analytics
router.get('/analytics', async (req, res) => {
    try {
        const startDate = req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = req.query.endDate || new Date();
        
        // Implement analytics data gathering
        const analyticsData = {
            salesOverTime: [],
            topProducts: [],
            userGrowth: [],
            revenueStats: {}
        };
        
        res.json({
            success: true,
            data: analyticsData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching analytics data'
        });
    }
});

module.exports = router;