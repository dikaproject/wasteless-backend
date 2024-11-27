const express = require('express');
const router = express.Router();
const { transactionsController } = require('../controllers/transactionsController');
const { auth, checkRole } = require('../middleware/auth');


// Create a transaction
router.post('/transactions', auth, transactionsController.create);

// Handle Midtrans notifications
router.post('/transactions/midtrans-notification', transactionsController.midtransNotification);

// Get transaction details
router.get('/transactions/:id', auth, transactionsController.getDetail);

// Get user transactions
router.get('/transactions', auth, transactionsController.getUserTransactions);

// routes/transactionRoutes.js
router.put('/transactions/:id/status', auth, checkRole(['seller', 'admin']), transactionsController.updateStatus);

module.exports = router;