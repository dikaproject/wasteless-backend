// controllers/sellerOrderController.js
const pool = require("../config/database");
const transporter = require('../config/mailer');

const sellerOrderController = {
    // Get all orders for seller
    getAll: async (req, res) => {
        try {
            const sellerId = req.userData.userId;
            
            const [orders] = await pool.query(`
                SELECT 
                    t.*,
                    u.name as user_name,
                    COUNT(ti.id) as total_items
                FROM transactions t
                JOIN users u ON t.user_id = u.id
                JOIN transaction_items ti ON t.id = ti.transaction_id
                JOIN products p ON ti.product_id = p.id
                WHERE p.seller_id = ?
                GROUP BY t.id
                ORDER BY t.created_at DESC
            `, [sellerId]);

            // Get items for each order
            for (let order of orders) {
                const [items] = await pool.query(`
                    SELECT 
                        ti.id,
                        ti.quantity,
                        ti.price,
                        p.name as product_name
                    FROM transaction_items ti
                    JOIN products p ON ti.product_id = p.id
                    WHERE ti.transaction_id = ? AND p.seller_id = ?
                `, [order.id, sellerId]);
                
                order.items = items;
            }

            res.json({
                success: true,
                data: orders
            });
        } catch (error) {
            console.error('Get orders error:', error);
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    },

    // Update order status
    updateStatus: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const { id } = req.params;
            const { status } = req.body;
            const sellerId = req.userData.userId;

            // Verify order belongs to seller's products
            const [orderCheck] = await connection.query(`
                SELECT DISTINCT t.*, u.email, u.name
                FROM transactions t
                JOIN transaction_items ti ON t.id = ti.transaction_id
                JOIN products p ON ti.product_id = p.id
                JOIN users u ON t.user_id = u.id
                WHERE t.id = ? AND p.seller_id = ?
            `, [id, sellerId]);

            if (orderCheck.length === 0) {
                throw new Error('Order not found or unauthorized');
            }

            await connection.query(
                'UPDATE transactions SET status = ? WHERE id = ?',
                [status, id]
            );

            // Send email if status is delivered
            if (status === 'delivered') {
                // Get order details including items
                const [orderItems] = await connection.query(`
                  SELECT 
                    ti.quantity,
                    ti.price,
                    p.name as product_name
                  FROM transaction_items ti
                  JOIN products p ON ti.product_id = p.id
                  WHERE ti.transaction_id = ? AND p.seller_id = ?
                `, [id, sellerId]);
              
                await transporter.sendMail({
                  from: {
                    name: process.env.MAIL_FROM_NAME || 'WasteLess',
                    address: process.env.MAIL_FROM
                  },
                  to: orderCheck[0].email,
                  subject: 'Order Delivered Successfully - WasteLess',
                  html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <meta charset="utf-8">
                      <style>
                        body { 
                          font-family: Arial, sans-serif; 
                          line-height: 1.6; 
                          color: #333;
                        }
                        .container { 
                          max-width: 600px; 
                          margin: 0 auto; 
                          padding: 20px;
                        }
                        .header { 
                          text-align: center; 
                          margin-bottom: 30px;
                        }
                        .content {
                          background: #f9f9f9;
                          padding: 20px;
                          border-radius: 8px;
                        }
                        .order-details {
                          margin: 20px 0;
                          border: 1px solid #eee;
                          padding: 15px;
                          border-radius: 4px;
                        }
                        .item {
                          padding: 10px 0;
                          border-bottom: 1px solid #eee;
                        }
                        .item:last-child {
                          border-bottom: none;
                        }
                        .total {
                          margin-top: 15px;
                          font-weight: bold;
                          text-align: right;
                        }
                        .footer {
                          text-align: center;
                          margin-top: 30px;
                          color: #666;
                          font-size: 0.9em;
                        }
                        .success-badge {
                          background: #16a34a;
                          color: white;
                          padding: 8px 16px;
                          border-radius: 20px;
                          display: inline-block;
                          margin-bottom: 20px;
                        }
                      </style>
                    </head>
                    <body>
                      <div class="container">
                        <div class="header">
                          <h1 style="color: #16a34a;">Order Delivered! 🎉</h1>
                          <div class="success-badge">Order #${orderCheck[0].id}</div>
                        </div>
                        
                        <div class="content">
                          <p>Hello ${orderCheck[0].name},</p>
                          <p>Great news! Your order has been delivered successfully.</p>
                          
                          <div class="order-details">
                            <h3>Order Summary:</h3>
                            ${orderItems.map(item => `
                              <div class="item">
                                <div>${item.product_name}</div>
                                <div>${item.quantity}x @ Rp ${item.price.toLocaleString()}</div>
                              </div>
                            `).join('')}
                            
                            <div class="total">
                              Total: Rp ${orderCheck[0].total_amount.toLocaleString()}
                            </div>
                          </div>
              
                          <p>We hope you're satisfied with your purchase. If you have any questions or concerns, please don't hesitate to contact us.</p>
                        </div>
              
                        <div class="footer">
                          <p>Thank you for choosing WasteLess!</p>
                          <p>Together we're reducing food waste and supporting local businesses.</p>
                        </div>
                      </div>
                    </body>
                    </html>
                  `
                });
              }

            await connection.commit();
            res.json({
                success: true,
                message: 'Order status updated successfully'
            });

        } catch (error) {
            await connection.rollback();
            console.error('Update order status error:', error);
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        } finally {
            connection.release();
        }
    },

    updatePaymentStatus: async (req, res) => {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
    
        const { id } = req.params;
        const { payment_status } = req.body;
        const sellerId = req.userData.userId;
    
        // Verify order belongs to seller and is COD
        const [orderCheck] = await connection.query(`
          SELECT DISTINCT t.*, p.seller_id
          FROM transactions t
          JOIN transaction_items ti ON t.id = ti.transaction_id
          JOIN products p ON ti.product_id = p.id
          WHERE t.id = ? AND p.seller_id = ? AND t.payment_method = 'cod'
        `, [id, sellerId]);
    
        if (orderCheck.length === 0) {
          throw new Error('Order not found or unauthorized');
        }
    
        // Update payment status
        await connection.query(
          'UPDATE transactions SET payment_status = ? WHERE id = ?',
          [payment_status, id]
        );
    
        await connection.commit();
        res.json({
          success: true,
          message: 'Payment status updated successfully'
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

module.exports = { sellerOrderController };