const pool = require("../config/database");

const cartController = {
  // Get user's cart
  getCart: async (req, res) => {
    try {
      const userId = req.userData.userId;
      const [cartRows] = await pool.query(
        "SELECT * FROM carts WHERE user_id = ?",
        [userId]
      );

      let cartId;
      if (cartRows.length === 0) {
        const [result] = await pool.query(
          "INSERT INTO carts (user_id) VALUES (?)",
          [userId]
        );
        cartId = result.insertId;
      } else {
        cartId = cartRows[0].id;
      }

      // Updated query to join with photos table
      const [items] = await pool.query(
        `SELECT 
          ci.id,
          ci.product_id,
          ci.quantity,
          p.name,
          p.quantity as stock,
          ph.photo,
          pr.price,
          pr.is_discount,
          pr.discount_percentage,
          pr.discount_price
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        LEFT JOIN photos ph ON p.photo_id = ph.id
        LEFT JOIN prices pr ON p.id = pr.product_id
        WHERE ci.cart_id = ?`,
        [cartId]
      );

      res.json({ success: true, data: items });
    } catch (error) {
      console.error('Get cart error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  addToCart: async (req, res) => {
    try {
      const userId = req.userData.userId; // Changed from req.user.id
      const { product_id, quantity } = req.body;

      if (!product_id || !quantity) {
        return res.status(400).json({
          success: false,
          message: 'Product ID and quantity are required'
        });
      }

      const [cartRows] = await pool.query(
        'SELECT * FROM carts WHERE user_id = ?',
        [userId]
      );

      let cartId;
      if (cartRows.length === 0) {
        const [result] = await pool.query(
          'INSERT INTO carts (user_id) VALUES (?)',
          [userId]
        );
        cartId = result.insertId;
      } else {
        cartId = cartRows[0].id;
      }

      await pool.query(
        `INSERT INTO cart_items (cart_id, product_id, quantity)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
        [cartId, product_id, quantity]
      );

      res.json({
        success: true,
        message: 'Item added to cart'
      });
    } catch (error) {
      console.error('Add to cart error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to add item to cart'
      });
    }
  },

  updateCartItem: async (req, res) => {
    try {
      const userId = req.userData.userId;
      const { productId } = req.params;
      const { quantity } = req.body;

      // Input validation
      if (!quantity || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: "Invalid quantity"
        });
      }

      // Get user's cart first
      const [cartRows] = await pool.query(
        "SELECT id FROM carts WHERE user_id = ?",
        [userId]
      );

      if (cartRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Cart not found"
        });
      }

      const cartId = cartRows[0].id;

      // Check if product exists in cart
      const [cartItem] = await pool.query(
        `SELECT ci.*, p.quantity as stock
         FROM cart_items ci
         JOIN products p ON ci.product_id = p.id
         WHERE ci.cart_id = ? AND ci.product_id = ?`,
        [cartId, productId]
      );

      if (cartItem.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Item not found in cart"
        });
      }

      // Check stock availability
      if (quantity > cartItem[0].stock) {
        return res.status(400).json({
          success: false,
          message: `Only ${cartItem[0].stock} items available`
        });
      }

      // Update cart item quantity
      await pool.query(
        `UPDATE cart_items 
         SET quantity = ? 
         WHERE cart_id = ? AND product_id = ?`,
        [quantity, cartId, productId]
      );

      // Get updated cart item details
      const [updatedItem] = await pool.query(
        `SELECT 
          ci.id,
          ci.product_id,
          ci.quantity,
          p.name,
          p.quantity as stock,
          ph.photo,
          pr.price,
          pr.is_discount,
          pr.discount_percentage,
          pr.discount_price
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        LEFT JOIN photos ph ON p.photo_id = ph.id
        LEFT JOIN prices pr ON p.id = pr.product_id
        WHERE ci.cart_id = ? AND ci.product_id = ?`,
        [cartId, productId]
      );

      res.json({
        success: true,
        message: "Cart item updated successfully",
        data: updatedItem[0]
      });

    } catch (error) {
      console.error("Update cart error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update cart item"
      });
    }
  },

  removeFromCart: async (req, res) => {
    try {
      const userId = req.userData.userId;
      const { productId } = req.params;

      // Get user's cart
      const [cartRows] = await pool.query(
        "SELECT id FROM carts WHERE user_id = ?",
        [userId]
      );

      if (cartRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Cart not found"
        });
      }

      const cartId = cartRows[0].id;

      // Check if item exists in cart
      const [cartItem] = await pool.query(
        "SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?",
        [cartId, productId]
      );

      if (cartItem.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Item not found in cart"
        });
      }

      // Remove item from cart
      await pool.query(
        "DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?",
        [cartId, productId]
      );

      // Get remaining cart items
      const [remainingItems] = await pool.query(
        `SELECT 
          ci.id,
          ci.product_id,
          ci.quantity,
          p.name,
          p.quantity as stock,
          ph.photo,
          pr.price,
          pr.is_discount,
          pr.discount_percentage,
          pr.discount_price
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        LEFT JOIN photos ph ON p.photo_id = ph.id
        LEFT JOIN prices pr ON p.id = pr.product_id
        WHERE ci.cart_id = ?`,
        [cartId]
      );

      res.json({
        success: true,
        message: "Item removed from cart successfully",
        data: remainingItems
      });

    } catch (error) {
      console.error("Remove from cart error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to remove item from cart"
      });
    }
  },

  clearCart: async (req, res) => {
    try {
      const userId = req.userData.userId;
      const [cartRows] = await pool.query(
        "SELECT * FROM carts WHERE user_id = ?",
        [userId]
      );
      
      if (cartRows.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Cart not found" 
        });
      }

      const cartId = cartRows[0].id;

      await pool.query(
        "DELETE FROM cart_items WHERE cart_id = ?",
        [cartId]
      );

      res.json({ 
        success: true, 
        message: "Cart cleared successfully" 
      });
    } catch (error) {
      console.error('Clear cart error:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to clear cart'
      });
    }
  },
};

module.exports = { cartController };
