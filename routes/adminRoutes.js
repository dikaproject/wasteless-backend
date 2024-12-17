const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth, checkRole } = require('../middleware/auth');
const transporter = require('../config/mailer');
const { productController } = require('../controllers/productController');
const { categoryController } = require('../controllers/categoryController');
const { usersController } = require('../controllers/usersController');
const fs = require('fs').promises;
const path = require('path');


router.use(auth);
router.use(checkRole(['admin']));


// Update admin dashboard route
router.get('/dashboard', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        // Get current month's data
        const [currentMonthData] = await connection.query(`
            SELECT 
                COUNT(*) as total_orders,
                SUM(total_amount) as revenue
            FROM transactions 
            WHERE YEAR(created_at) = YEAR(CURRENT_DATE)
            AND MONTH(created_at) = MONTH(CURRENT_DATE)
            AND payment_status = 'paid'
        `);

        // Get previous month's data
        const [previousMonthData] = await connection.query(`
            SELECT 
                COUNT(*) as total_orders,
                SUM(total_amount) as revenue
            FROM transactions 
            WHERE YEAR(created_at) = YEAR(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH))
            AND MONTH(created_at) = MONTH(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH))
            AND payment_status = 'paid'
        `);

        // Calculate month-over-month changes
        const revenueTrend = previousMonthData[0].revenue > 0 
            ? ((currentMonthData[0].revenue - previousMonthData[0].revenue) / previousMonthData[0].revenue) * 100
            : 0;

        const ordersTrend = previousMonthData[0].total_orders > 0
            ? ((currentMonthData[0].total_orders - previousMonthData[0].total_orders) / previousMonthData[0].total_orders) * 100
            : 0;

        // Get products trend
        const [currentMonthProducts] = await connection.query(`
            SELECT COUNT(*) as total
            FROM products
            WHERE YEAR(created_at) = YEAR(CURRENT_DATE)
            AND MONTH(created_at) = MONTH(CURRENT_DATE)
            AND is_active = 1
        `);

        const [previousMonthProducts] = await connection.query(`
            SELECT COUNT(*) as total
            FROM products
            WHERE YEAR(created_at) = YEAR(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH))
            AND MONTH(created_at) = MONTH(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH))
            AND is_active = 1
        `);

        const productsTrend = previousMonthProducts[0].total > 0
            ? ((currentMonthProducts[0].total - previousMonthProducts[0].total) / previousMonthProducts[0].total) * 100
            : 0;

        // Get users trend
        const [currentMonthUsers] = await connection.query(`
            SELECT COUNT(*) as total
            FROM users
            WHERE YEAR(created_at) = YEAR(CURRENT_DATE)
            AND MONTH(created_at) = MONTH(CURRENT_DATE)
            AND role = 'user'
        `);

        const [previousMonthUsers] = await connection.query(`
            SELECT COUNT(*) as total
            FROM users
            WHERE YEAR(created_at) = YEAR(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH))
            AND MONTH(created_at) = MONTH(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH))
            AND role = 'user'
        `);

        const usersTrend = previousMonthUsers[0].total > 0
            ? ((currentMonthUsers[0].total - previousMonthUsers[0].total) / previousMonthUsers[0].total) * 100
            : 0;

        // Get totals
        const [totalStats] = await connection.query(`
            SELECT
                (SELECT COUNT(*) FROM transactions WHERE payment_status = 'paid') as total_orders,
                (SELECT SUM(total_amount) FROM transactions WHERE payment_status = 'paid') as total_revenue,
                (SELECT COUNT(*) FROM products WHERE is_active = 1) as total_products,
                (SELECT COUNT(*) FROM users WHERE role = 'user') as total_users
        `);

        // Get recent data
        const [recentOrders] = await connection.query(`
            SELECT t.*, u.name as user_name, 
                   COUNT(ti.id) as total_items
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            JOIN transaction_items ti ON t.id = ti.transaction_id
            GROUP BY t.id
            ORDER BY t.created_at DESC
            LIMIT 5
        `);

        const [recentUsers] = await connection.query(`
            SELECT id, name, email, created_at
            FROM users
            WHERE role = 'user'
            ORDER BY created_at DESC
            LIMIT 5
        `);

        const [recentSellers] = await connection.query(`
            SELECT u.id, u.name, u.email, u.phone, u.created_at, 
                   a.photo_ktp, a.photo_usaha
            FROM users u
            JOIN address a ON u.id = a.user_id
            WHERE u.role = 'seller' 
            AND u.is_active = FALSE
            ORDER BY u.created_at DESC
            LIMIT 5
        `);

        const stats = {
            totalOrders: totalStats[0].total_orders || 0,
            totalProducts: totalStats[0].total_products || 0,
            totalUsers: totalStats[0].total_users || 0,
            totalRevenue: totalStats[0].total_revenue || 0,
            trends: {
                revenue: parseFloat(revenueTrend.toFixed(1)),
                orders: parseFloat(ordersTrend.toFixed(1)),
                products: parseFloat(productsTrend.toFixed(1)),
                users: parseFloat(usersTrend.toFixed(1))
            },
            recentOrders,
            recentUsers,
            recentSellers
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
    } finally {
        connection.release();
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

//  Seller Management
router.get('/seller-products', async (req, res) => {
    try {
      const [products] = await pool.query(`
        SELECT 
          p.*,
          u.name as seller_name,
          u.email as seller_email,
          c.name as category_name,
          ph.photo,
          COALESCE(pr.price, 0) as price,
          COALESCE(pr.is_discount, 0) as is_discount,
          COALESCE(pr.discount_percentage, 0) as discount_percentage,
          CASE 
            WHEN pr.is_discount = 1 THEN COALESCE(pr.discount_price, pr.price)
            ELSE pr.price
          END as final_price
        FROM products p
        JOIN users u ON p.seller_id = u.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN photos ph ON p.photo_id = ph.id
        LEFT JOIN (
          SELECT 
            product_id,
            price,
            is_discount,
            discount_percentage,
            discount_price
          FROM prices 
          WHERE id IN (
            SELECT MAX(id)
            FROM prices
            GROUP BY product_id
          )
        ) pr ON p.id = pr.product_id
        WHERE p.is_active = 0
        ORDER BY p.created_at DESC
      `);
  
      const formattedProducts = products.map(product => ({
        ...product,
        price: Number(product.price),
        final_price: Number(product.final_price || product.price),
        is_discount: Boolean(product.is_discount),
        discount_percentage: Number(product.discount_percentage)
      }));
  
      res.json({ success: true, data: formattedProducts });
    } catch (error) {
      console.error('Fetch pending products error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

router.put('/seller-products/:id/approve', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // Approve product
    await connection.query(
      'UPDATE products SET is_active = 1 WHERE id = ?',
      [id]
    );

    // Get seller email
    const [product] = await connection.query(`
      SELECT u.email, u.name, p.name as product_name
      FROM products p
      JOIN users u ON p.seller_id = u.id
      WHERE p.id = ?
    `, [id]);

    await connection.commit();

    // Send email notification
    if (product.length > 0) {
      await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: product[0].email,
        subject: 'Product Approved',
        html: `
          <h1>Product Approved</h1>
          <p>Hello ${product[0].name},</p>
          <p>Your product "${product[0].product_name}" has been approved and is now live on the marketplace.</p>
        `
      });
    }

    res.json({ 
      success: true, 
      message: 'Product approved successfully' 
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
});


router.get('/pending-sellers', async (req, res) => {
  try {
    const [sellers] = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, a.photo_ktp, a.photo_usaha
       FROM users u
       JOIN address a ON u.id = a.user_id
       WHERE u.role = 'seller' AND u.is_active = FALSE`
    );

    res.json({ success: true, data: sellers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// adminRoutes.js - Update approve-seller route
router.put('/approve-seller/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;

    // Debug log
    console.log('Approving seller:', id);

    // Get seller details with better error handling
    const [seller] = await connection.query(
      `SELECT email, name, id FROM users WHERE id = ?`,
      [id]
    );

    if (!seller.length) {
      throw new Error('Seller not found');
    }

    console.log('Seller found:', seller[0]);

    // Update user status
    await connection.query(
      `UPDATE users SET is_active = TRUE WHERE id = ?`,
      [id]
    );

    // Verify email configuration
    const emailConfig = {
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      username: process.env.MAIL_USERNAME,
      password: process.env.MAIL_PASSWORD,
      from: process.env.MAIL_FROM,
      fromName: process.env.MAIL_FROM_NAME
    };

    console.log('Email configuration:', {
      ...emailConfig,
      password: '***hidden***'
    });

    // Send email with detailed error catching
    try {
      const mailResponse = await transporter.sendMail({
        from: {
          name: process.env.MAIL_FROM_NAME || 'WasteLess',
          address: process.env.MAIL_FROM
        },
        to: seller[0].email,
        subject: 'Welcome to WasteLess - Seller Application Approved! 🎉',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 8px; }
              .button { 
                background: #16a34a;
                color: white !important;
                padding: 12px 25px;
                text-decoration: none;
                border-radius: 5px;
                display: inline-block;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="color: #16a34a;">Welcome to WasteLess! 🌱</h1>
              </div>
              <div class="content">
                <p>Dear ${seller[0].name},</p>
                <p>Great news! Your seller application has been approved. You can now start selling on WasteLess.</p>
                <p>Here's what you can do next:</p>
                <ul>
                  <li>Set up your seller profile</li>
                  <li>Add your products</li>
                  <li>Start reaching customers</li>
                </ul>
                <div style="text-align: center;">
                  <a href="${process.env.NEXT_PUBLIC_URL}/login" class="button">
                    Go to Seller Dashboard
                  </a>
                </div>
              </div>
              <div style="text-align: center; margin-top: 30px; color: #666;">
                <p>Need help? Contact our support team</p>
              </div>
            </div>
          </body>
          </html>
        `
      });

      console.log('Email sent successfully:', mailResponse);
    } catch (emailError) {
      console.error('Email send error details:', {
        error: emailError.message,
        stack: emailError.stack,
        code: emailError.code,
        command: emailError.command
      });
      
      // Don't throw, just log the error
      console.warn('Failed to send approval email but continuing with approval');
    }

    await connection.commit();
    res.json({ success: true, message: 'Seller approved successfully' });

  } catch (error) {
    await connection.rollback();
    console.error('Approve seller error:', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to approve seller' 
    });
  } finally {
    connection.release();
  }
});


router.delete('/reject-seller/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { reason } = req.body;

    // Get seller details before deletion
    const [seller] = await connection.query(
      'SELECT email, name, photo_ktp, photo_usaha FROM users u JOIN address a ON u.id = a.user_id WHERE u.id = ?',
      [id]
    );

    if (seller.length === 0) {
      throw new Error('Seller not found');
    }

    // Delete photos if they exist
    if (seller[0].photo_ktp) {
      try {
        await fs.unlink(path.join('./uploads/ktp', seller[0].photo_ktp));
      } catch (err) {
        console.error('Error deleting KTP photo:', err);
      }
    }

    if (seller[0].photo_usaha) {
      try {
        await fs.unlink(path.join('./uploads/usaha', seller[0].photo_usaha));
      } catch (err) {
        console.error('Error deleting business photo:', err);
      }
    }

    // Delete address first due to foreign key constraint
    await connection.query('DELETE FROM address WHERE user_id = ?', [id]);

    // Delete user
    await connection.query('DELETE FROM users WHERE id = ?', [id]);

    // Send rejection email
    await transporter.sendMail({
        from: {
          name: process.env.MAIL_FROM_NAME,
          address: process.env.MAIL_FROM
        },
        to: seller[0].email,
        subject: 'WasteLess Seller Application Update',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 8px; }
              .reason { 
                background: #fff;
                padding: 15px;
                border-left: 4px solid #dc2626;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="color: #4b5563;">Application Status Update</h1>
              </div>
              <div class="content">
                <p>Dear ${seller[0].name},</p>
                <p>Thank you for your interest in becoming a seller on WasteLess.</p>
                <p>After careful review, we regret to inform you that we cannot approve your seller application at this time.</p>
                
                <div class="reason">
                  <strong>Reason:</strong>
                  <p>${reason}</p>
                </div>
  
                <p>You can submit a new application after addressing these concerns.</p>
                <p>If you have any questions, please don't hesitate to contact us.</p>
              </div>
              <div style="text-align: center; margin-top: 30px; color: #666;">
                <p>Best regards,<br>The WasteLess Team</p>
              </div>
            </div>
          </body>
          </html>
        `
      });

    await connection.commit();
    res.json({ success: true, message: 'Seller rejected successfully' });

  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
});

router.put('/seller-products/:id/reject', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const { id } = req.params;
        const { reason } = req.body;

        // Get product details including photo
        const [productResult] = await pool.query(`
            SELECT 
                p.*,
                u.email, 
                u.name,
                ph.photo,
                ph.id as photo_id,
                p.name as product_name
            FROM products p
            JOIN users u ON p.seller_id = u.id
            LEFT JOIN photos ph ON p.photo_id = ph.id
            WHERE p.id = ?
        `, [id]);

        if (productResult.length === 0) {
            throw new Error('Product not found');
        }

        const product = productResult[0];

        // First, set product's photo_id to NULL to remove the foreign key constraint
        await connection.query(
            'UPDATE products SET photo_id = NULL WHERE id = ?',
            [id]
        );

        // Then delete photo record if exists
        if (product.photo_id) {
            await connection.query(
                'DELETE FROM photos WHERE id = ?',
                [product.photo_id]
            );

            // Try to delete physical file
            if (product.photo) {
                try {
                    await fs.unlink(path.join('./uploads/products', product.photo));
                } catch (err) {
                    console.error('Error deleting photo file:', err);
                    // Continue even if file deletion fails
                }
            }
        }

        // Finally delete the product
        await connection.query(
            'DELETE FROM products WHERE id = ?',
            [id]
        );

        // Send rejection email
        await transporter.sendMail({
            from: process.env.MAIL_FROM,
            to: product.email,
            subject: 'Product Rejected',
            html: `
                <h1>Product Rejected</h1>
                <p>Hello ${product.name},</p>
                <p>Your product "${product.product_name}" has been rejected.</p>
                <p>Reason: ${reason}</p>
            `
        });

        await connection.commit();

        res.json({ 
            success: true, 
            message: 'Product rejected successfully' 
        });

    } catch (error) {
        await connection.rollback();
        console.error('Reject product error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to reject product'
        });
    } finally {
        connection.release();
    }
});

// Orders Management ( cek pesanan ) -> /orders
// Get all orders
router.get('/orders', async (req, res) => {
    try {
        const [orders] = await pool.query(`
            SELECT t.*,
                   u.name as user_name,
                   u.email as user_email,
                   a.address,
                   a.kecamatan,
                   a.kabupaten,
                   a.code_pos,
                   COUNT(ti.id) as total_items
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            JOIN address a ON t.address_id = a.id
            JOIN transaction_items ti ON t.id = ti.transaction_id
            GROUP BY t.id
            ORDER BY t.created_at DESC
        `);

        res.json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get order details
router.get('/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [order] = await pool.query(`
            SELECT t.*,
                   u.name as user_name,
                   u.email as user_email,
                   a.address,
                   a.kecamatan,
                   a.kabupaten,
                   a.code_pos
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            JOIN address a ON t.address_id = a.id
            WHERE t.id = ?
        `, [id]);

        if (order.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const [items] = await pool.query(`
            SELECT ti.*,
                   p.name as product_name,
                   ph.photo
            FROM transaction_items ti
            JOIN products p ON ti.product_id = p.id
            LEFT JOIN photos ph ON p.photo_id = ph.id
            WHERE ti.transaction_id = ?
        `, [id]);

        res.json({
            success: true,
            data: {
                ...order[0],
                items
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update order status
router.put('/orders/:id/status', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const { id } = req.params;
        const { status } = req.body;

        // Validate status
        const validStatuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        // Check if order exists and get current status
        const [order] = await connection.query(
            `SELECT t.*, u.email, u.name
             FROM transactions t
             JOIN users u ON t.user_id = u.id
             WHERE t.id = ?`,
            [id]
        );

        if (order.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Validate status transition
        const currentStatus = order[0].status;
        if (currentStatus === 'cancelled' || currentStatus === 'delivered') {
            return res.status(400).json({
                success: false,
                message: `Cannot update status of ${currentStatus} order`
            });
        }

        // Update status
        await connection.query(
            'UPDATE transactions SET status = ? WHERE id = ?',
            [status, id]
        );

        // Send email if status is delivered
                if (status === 'delivered') {
            await transporter.sendMail({
                from: process.env.MAIL_FROM,
                to: order[0].email,
                subject: 'Your WasteLess Order Has Been Delivered! 🎉',
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Order Delivered</title>
                    </head>
                    <body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: 'Arial', sans-serif;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
                            <tr>
                                <td style="background-color: #ffffff; border-radius: 10px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                    <!-- Header -->
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td style="text-align: center; padding-bottom: 30px;">
                                                <img src="${process.env.NEXT_PUBLIC_API_URL}/logo.png" alt="WasteLess" style="max-width: 150px;">
                                            </td>
                                        </tr>
                                    </table>
        
                                    <!-- Content -->
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td>
                                                <h1 style="color: #16a34a; font-size: 24px; margin: 0; padding-bottom: 15px; text-align: center;">
                                                    Order Delivered Successfully! 🎉
                                                </h1>
                                                <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0; padding-bottom: 15px;">
                                                    Hello ${order[0].name},
                                                </p>
                                                <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0; padding-bottom: 25px;">
                                                    Great news! Your order <span style="color: #16a34a; font-weight: bold;">#${order[0].id}</span> has been delivered successfully.
                                                </p>
                                                
                                                <!-- Order Details Box -->
                                                <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                                                    <p style="color: #1f2937; font-size: 16px; font-weight: bold; margin: 0 0 15px 0;">
                                                        Order Details:
                                                    </p>
                                                    <p style="color: #4b5563; font-size: 14px; line-height: 20px; margin: 0;">
                                                        Order Number: #${order[0].id}<br>
                                                        Status: Delivered<br>
                                                        Delivery Date: ${new Date().toLocaleDateString()}
                                                    </p>
                                                </div>
        
                                                <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0; padding-bottom: 25px;">
                                                    Thank you for shopping with WasteLess! We hope you enjoy your purchase.
                                                </p>
        
                                                <!-- CTA Button -->
                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                    <tr>
                                                        <td style="text-align: center; padding-bottom: 25px;">
                                                            <a href="${process.env.NEXT_PUBLIC_API_URL}/orders/${order[0].id}" 
                                                               style="background-color: #16a34a; color: #ffffff; padding: 12px 30px; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: bold;">
                                                                View Order Details
                                                            </a>
                                                        </td>
                                                    </tr>
                                                </table>
        
                                                <!-- Footer -->
                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                    <tr>
                                                        <td style="text-align: center; padding-top: 25px; border-top: 1px solid #e5e7eb;">
                                                            <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                                                                If you have any questions, please contact our support team.
                                                            </p>
                                                            <p style="color: #9ca3af; font-size: 14px; margin: 10px 0 0 0;">
                                                                © ${new Date().getFullYear()} WasteLess. All rights reserved.
                                                            </p>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
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
            message: error.message || 'Failed to update order status'
        });
    } finally {
        connection.release();
    }
});

router.put('/orders/:id/payment-status', async (req, res) => {
  const connection = await pool.getConnection();
  try {
      await connection.beginTransaction();
      
      const { id } = req.params;
      const { payment_status } = req.body;

      // Validate payment status
      const validPaymentStatuses = ['pending', 'paid', 'failed'];
      if (!validPaymentStatuses.includes(payment_status)) {
          return res.status(400).json({
              success: false,
              message: 'Invalid payment status'
          });
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
      console.error('Update payment status error:', error);
      res.status(500).json({
          success: false,
          message: error.message || 'Failed to update payment status'
      });
  } finally {
      connection.release();
  }
});

// Analytics ( cek grafik transaksi) -> /analytics
router.get('/analytics', async (req, res) => {
  try {
    const [dailyRevenue] = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_orders,
        CAST(SUM(total_amount) AS DECIMAL(10,2)) as revenue
      FROM transactions
      WHERE payment_status = 'paid'
      AND created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // Update top products query
    const [topProducts] = await pool.query(`
      SELECT 
        p.name,
        COUNT(ti.id) as total_sold,
        SUM(ti.quantity) as units_sold,
        CAST(SUM(ti.price * ti.quantity) AS DECIMAL(10,2)) as revenue
      FROM transaction_items ti
      JOIN products p ON ti.product_id = p.id
      JOIN transactions t ON ti.transaction_id = t.id
      WHERE t.payment_status = 'paid'
      GROUP BY p.id
      ORDER BY units_sold DESC
      LIMIT 10
    `);

    // Update category stats query
    const [categoryStats] = await pool.query(`
      SELECT 
        c.name,
        COUNT(DISTINCT t.id) as total_orders,
        SUM(ti.quantity) as units_sold,
        CAST(SUM(ti.price * ti.quantity) AS DECIMAL(10,2)) as revenue
      FROM categories c
      JOIN products p ON c.id = p.category_id
      JOIN transaction_items ti ON p.id = ti.product_id
      JOIN transactions t ON ti.transaction_id = t.id
      WHERE t.payment_status = 'paid'
      GROUP BY c.id
      ORDER BY revenue DESC
    `);

    res.json({
      success: true,
      data: {
        dailyRevenue,
        topProducts,
        categoryStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get detailed analytics by date range
router.get('/analytics/range', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        const [salesData] = await pool.query(`
            SELECT DATE(created_at) as date,
                   COUNT(*) as total_orders,
                   SUM(total_amount) as revenue,
                   payment_method,
                   status
            FROM transactions
            WHERE created_at BETWEEN ? AND ?
            GROUP BY DATE(created_at), payment_method, status
            ORDER BY date DESC
        `, [start_date, end_date]);

        res.json({
            success: true,
            data: salesData
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});


module.exports = router;