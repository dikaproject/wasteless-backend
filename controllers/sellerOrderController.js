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
                await transporter.sendMail({
                    from: process.env.MAIL_FROM,
                    to: orderCheck[0].email,
                    subject: 'Your Order Has Been Delivered',
                    html: `
                        <h1>Order Delivered</h1>
                        <p>Hello ${orderCheck[0].name},</p>
                        <p>Your order #${orderCheck[0].id} has been delivered.</p>
                        <p>Thank you for shopping with us!</p>
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
    }
};

module.exports = { sellerOrderController };