// controllers/customerController.js
const pool = require("../config/database");

const customerController = {
  getTransactionHistory: async (req, res) => {
    try {
      const userId = req.userData.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 5;
      const sort = req.query.sort || 'desc';
      const offset = (page - 1) * limit;
      
      const [transactions] = await pool.query(
        `SELECT 
          t.id,
          t.total_amount,
          t.payment_method,
          t.payment_status,
          t.status,
          t.created_at,
          COUNT(ti.id) as total_items
        FROM transactions t
        LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
        WHERE t.user_id = ?
        GROUP BY t.id
        ORDER BY t.created_at ${sort === 'desc' ? 'DESC' : 'ASC'}
        LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );
  
      const [total] = await pool.query(
        'SELECT COUNT(DISTINCT id) as total FROM transactions WHERE user_id = ?',
        [userId]
      );
  
      res.json({
        success: true,
        data: {
          transactions,
          total: total[0].total
        }
      });
    } catch (error) {
      console.error('Get transaction history error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  getTransactionDetail: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.userData.userId;
  
      const [transactionData] = await pool.query(
        `SELECT DISTINCT
          t.id,
          t.total_amount,
          t.ppn,
          t.payment_method, 
          t.payment_status,
          t.status,
          t.created_at
        FROM transactions t
        WHERE t.id = ? AND t.user_id = ?`,
        [id, userId]
      );
  
      if (!transactionData.length) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found' 
        });
      }
  
      const [items] = await pool.query(
        `SELECT
          ti.product_id,
          ti.quantity,
          ti.price,
          p.name as product_name,
          ph.photo
        FROM transaction_items ti
        JOIN products p ON ti.product_id = p.id
        LEFT JOIN photos ph ON p.photo_id = ph.id
        WHERE ti.transaction_id = ?`,
        [id]
      );
  
      const response = {
        ...transactionData[0],
        items
      };
  
      res.json({
        success: true,
        data: response
      });
  
    } catch (error) {
      console.error('Transaction detail error:', error);
      res.status(500).json({
        success: false, 
        message: error.message
      });
    }
  },

  completeTransaction: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { id } = req.params;
      const userId = req.userData.userId;
  
      // Get transaction details
      const [transaction] = await connection.query(
        `SELECT 
          id, 
          status, 
          payment_status, 
          payment_method,
          created_at
        FROM transactions 
        WHERE id = ? AND user_id = ?`,
        [id, userId]
      );
  
      if (!transaction.length) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found"
        });
      }
  
      const daysSinceOrder = Math.floor(
        (Date.now() - new Date(transaction[0].created_at).getTime()) / 
        (1000 * 60 * 60 * 24)
      );
  
      // Check conditions
      if (
        transaction[0].status !== "pending" ||
        (transaction[0].payment_status !== "paid" && 
         daysSinceOrder < 7 && 
         transaction[0].payment_method !== "cod")
      ) {
        return res.status(400).json({
          success: false,
          message: "Cannot complete this transaction"
        });
      }
  
      await connection.beginTransaction();
  
      // Update transaction status
      await connection.query(
        `UPDATE transactions 
         SET status = 'delivered', 
             payment_status = 'paid',
             updated_at = NOW() 
         WHERE id = ?`,
        [id]
      );
  
      await connection.commit();
  
      res.json({
        success: true,
        message: "Transaction marked as delivered"
      });
  
    } catch (error) {
      await connection.rollback();
      res.status(500).json({
        success: false,
        message: error.message
      });
    } finally {
      connection.release();
    }
  }
};

module.exports = { customerController };