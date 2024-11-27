// controllers/transactionsController.js
const pool = require("../config/database");
const midtransClient = require("midtrans-client");
const transporter = require('../config/mailer');

// Initialize Midtrans client
const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

const transactionsController = {
  create: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const userId = req.userData.userId;
      const { payment_method } = req.body;

      // Get user details
      const [userDetails] = await connection.query(
        'SELECT email, name FROM users WHERE id = ?',
        [userId]
      );

      if (userDetails.length === 0) {
        throw new Error('User not found');
      }

      // Check if user has address
      const [address] = await connection.query(
        'SELECT * FROM address WHERE user_id = ?',
        [userId]
      );

      if (address.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please add delivery address first',
          needAddress: true
        });
      }

      // Get cart items
      const [cartRows] = await connection.query(
        'SELECT * FROM carts WHERE user_id = ?',
        [userId]
      );

      if (cartRows.length === 0) {
        throw new Error('Cart is empty');
      }

      const cartId = cartRows[0].id;
      const [cartItems] = await connection.query(
        `SELECT ci.*, p.name, p.quantity as stock_quantity, pr.price, pr.is_discount, pr.discount_price
         FROM cart_items ci
         JOIN products p ON ci.product_id = p.id
         JOIN prices pr ON pr.product_id = p.id
         WHERE ci.cart_id = ?`,
        [cartId]
      );

      if (cartItems.length === 0) {
        throw new Error('Cart is empty');
      }

      // Calculate total
      let subtotal = 0;
      for (const item of cartItems) {
        if (item.quantity > item.stock_quantity) {
          throw new Error(`Insufficient stock for ${item.name}`);
        }
        const itemPrice = item.is_discount ? item.discount_price : item.price;
        subtotal += itemPrice * item.quantity;
      }

      const delivery_cost = 15000;
      const total_amount = subtotal + delivery_cost;

      // Create transaction
      const [transactionResult] = await connection.query(
        `INSERT INTO transactions 
         (user_id, total_amount, delivery_cost, payment_method, address_id)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, total_amount, delivery_cost, payment_method, address[0].id]
      );

      const transactionId = transactionResult.insertId;

      // Insert transaction items
      const transactionItemsValues = cartItems.map(item => [
        transactionId,
        item.product_id,
        item.quantity,
        item.is_discount ? item.discount_price : item.price
      ]);

      await connection.query(
        `INSERT INTO transaction_items 
         (transaction_id, product_id, quantity, price)
         VALUES ?`,
        [transactionItemsValues]
      );

      // Update stock
      for (const item of cartItems) {
        await connection.query(
          'UPDATE products SET quantity = quantity - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }

      // Clear cart
      await connection.query(
        'DELETE FROM cart_items WHERE cart_id = ?',
        [cartId]
      );

      if (payment_method === 'midtrans') {
        const parameter = {
          transaction_details: {
            order_id: `ORDER-${transactionId}-${Date.now()}`,
            gross_amount: total_amount,
          },
          customer_details: {
            email: userDetails[0].email,
            first_name: userDetails[0].name,
          },
          item_details: [
            ...cartItems.map(item => ({
              id: item.product_id,
              price: item.is_discount ? item.discount_price : item.price,
              quantity: item.quantity,
              name: item.name,
            })),
            {
              id: 'DELIVERY',
              price: delivery_cost,
              quantity: 1,
              name: 'Delivery Cost'
            }
          ],
        };

        const midtransTransaction = await snap.createTransaction(parameter);

        await connection.query(
          'UPDATE transactions SET midtrans_order_id = ? WHERE id = ?',
          [parameter.transaction_details.order_id, transactionId]
        );

        await connection.commit();

        return res.status(201).json({
          success: true,
          message: 'Transaction created successfully',
          data: {
            transaction_id: transactionId,
            total_amount,
            payment_method,
            redirect_url: midtransTransaction.redirect_url,
          }
        });
      }

      // For COD
      await connection.commit();
      res.status(201).json({
        success: true,
        message: 'Transaction created successfully',
        data: {
          transaction_id: transactionId,
          total_amount,
          payment_method
        }
      });

    } catch (error) {
      await connection.rollback();
      res.status(500).json({ success: false, message: error.message });
    } finally {
      connection.release();
    }
  },

  updateStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const [transaction] = await pool.query(
        `SELECT t.*, u.email, u.name 
         FROM transactions t 
         JOIN users u ON t.user_id = u.id 
         WHERE t.id = ?`,
        [id]
      );

      if (transaction.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      await pool.query(
        'UPDATE transactions SET status = ? WHERE id = ?',
        [status, id]
      );

      // Send email if status is delivered
      if (status === 'delivered') {
        await transporter.sendMail({
          from: process.env.MAIL_FROM,
          to: transaction[0].email,
          subject: 'Your Order Has Been Delivered',
          html: `
            <h1>Order Delivered</h1>
            <p>Hello ${transaction[0].name},</p>
            <p>Your order #${transaction[0].id} has been delivered.</p>
            <p>Thank you for shopping with us!</p>
          `
        });
      }

      res.json({
        success: true,
        message: 'Status updated successfully'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  midtransNotification: async (req, res) => {
    try {
      const notification = req.body;

      await pool.query(
        `UPDATE transactions 
         SET payment_status = ?,
             midtrans_transaction_id = ?,
             midtrans_status_code = ?,
             midtrans_transaction_status = ?,
             midtrans_fraud_status = ?
         WHERE midtrans_order_id = ?`,
        [
          notification.transaction_status === 'settlement' ? 'paid' : 'pending',
          notification.transaction_id,
          notification.status_code,
          notification.transaction_status,
          notification.fraud_status,
          notification.order_id
        ]
      );

      res.status(200).send();
    } catch (error) {
      console.error('Midtrans notification error:', error);
      res.status(500).send();
    }
  },

  getDetail: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.userData.userId;

      const [transaction] = await pool.query(
        `SELECT t.*, a.*, 
                ti.product_id, ti.quantity, ti.price,
                p.name as product_name, ph.photo
         FROM transactions t
         JOIN address a ON t.address_id = a.id
         JOIN transaction_items ti ON t.id = ti.transaction_id
         JOIN products p ON ti.product_id = p.id
         LEFT JOIN photos ph ON p.photo_id = ph.id
         WHERE t.id = ? AND t.user_id = ?`,
        [id, userId]
      );

      if (transaction.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      // Format response
      const items = transaction.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        price: item.price,
        photo: item.photo
      }));

      const response = {
        id: transaction[0].id,
        total_amount: transaction[0].total_amount,
        delivery_cost: transaction[0].delivery_cost,
        payment_method: transaction[0].payment_method,
        payment_status: transaction[0].payment_status,
        status: transaction[0].status,
        created_at: transaction[0].created_at,
        address: {
          kabupaten: transaction[0].kabupaten,
          kecamatan: transaction[0].kecamatan,
          address: transaction[0].address,
          code_pos: transaction[0].code_pos
        },
        items
      };

      res.json({
        success: true,
        data: response
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  getUserTransactions: async (req, res) => {
    try {
      const userId = req.userData.userId;
      const [transactions] = await pool.query(
        `SELECT t.*, 
                COUNT(ti.id) as total_items
         FROM transactions t
         JOIN transaction_items ti ON t.id = ti.transaction_id
         WHERE t.user_id = ?
         GROUP BY t.id
         ORDER BY t.created_at DESC`,
        [userId]
      );

      res.json({
        success: true,
        data: transactions
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },
};

module.exports = { transactionsController };