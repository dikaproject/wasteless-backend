const express = require('express');
const router = express.Router();
const { cartController } = require('../controllers/cartController');
const { auth } = require('../middleware/auth');

// Get user's cart
router.get('/cart', auth, cartController.getCart);

// Add item to cart
router.post('/cart', auth, cartController.addToCart);

// Update cart item quantity
router.put('/cart/item/:productId', auth, cartController.updateCartItem);

// Remove item from cart
router.delete('/cart/item/:productId', auth, cartController.removeFromCart);

// Clear cart
router.delete('/cart', auth, cartController.clearCart);

module.exports = router;