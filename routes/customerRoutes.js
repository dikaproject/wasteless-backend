const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { customerController } = require('../controllers/customerController');
const { categoryController } = require('../controllers/categoryController');

router.get('/categories', categoryController.getAll);
router.use(auth);

router.get('/transactions/history', customerController.getTransactionHistory);
router.get('/transactions/:id', customerController.getTransactionDetail);

module.exports = router;