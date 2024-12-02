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
  }
};

module.exports = { customerController };