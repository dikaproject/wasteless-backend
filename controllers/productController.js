const pool = require('../config/database');
const slugify = require('slugify');
const multer = require('multer');
const path = require('path');

// Multer configuration
const storage = multer.diskStorage({
    destination: './uploads/products',
    filename: (req, file, cb) => {
        cb(null, `product-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
    }
}).single('photo');


const productController = {
    // Get all products with pagination
    getAll: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            const [products] = await pool.query(`
                SELECT p.*, c.name as category_name 
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.id 
                LIMIT ? OFFSET ?
            `, [limit, offset]);

            const [total] = await pool.query('SELECT COUNT(*) as count FROM products');

            res.json({
                success: true,
                data: products,
                pagination: {
                    page,
                    limit,
                    total: total[0].count
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    create: async (req, res) => {
        // Wrap everything in a transaction
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Handle file upload first
            await new Promise((resolve, reject) => {
                upload(req, res, (err) => {
                    if (err) {
                        reject(err);
                    }
                    resolve();
                });
            });

            // Validate required fields
            const { 
                category_id, 
                name, 
                quantity, 
                massa, 
                expired,
                is_active 
            } = req.body;

            if (!category_id || !name || !quantity || !massa || !expired) {
                throw new Error('Missing required fields');
            }

            const slug = slugify(name, { lower: true });

            // Insert product
            const [productResult] = await connection.query(`
                INSERT INTO products 
                (category_id, name, slug, quantity, massa, expired, is_active) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                category_id, 
                name, 
                slug, 
                quantity, 
                massa, 
                expired, 
                is_active === 'true' || is_active === true ? 1 : 0
            ]);

            const productId = productResult.insertId;

            // If there's a photo, save it
            if (req.file) {
                const [photoResult] = await connection.query(`
                    INSERT INTO photos (product_id, photo)
                    VALUES (?, ?)
                `, [productId, req.file.filename]);

                // Update product with photo_id
                await connection.query(
                    'UPDATE products SET photo_id = ? WHERE id = ?',
                    [photoResult.insertId, productId]
                );
            }

            await connection.commit();

            res.status(201).json({ 
                success: true, 
                message: 'Product created successfully',
                data: {
                    id: productId,
                    photo: req.file ? req.file.filename : null
                }
            });

        } catch (error) {
            await connection.rollback();
            
            // Log the error for debugging
            console.error('Product creation error:', error);

            // If file was uploaded but database operation failed, you might want to remove the file
            if (req.file) {
                const fs = require('fs').promises;
                try {
                    await fs.unlink(path.join('./uploads/products', req.file.filename));
                } catch (unlinkError) {
                    console.error('Error removing uploaded file:', unlinkError);
                }
            }

            res.status(500).json({ 
                success: false, 
                message: error.message || 'Error creating product',
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        } finally {
            connection.release();
        }
    },

    // Modified getDetail method
    getDetail: async (req, res) => {
        try {
            const { id } = req.params;

            const [product] = await pool.query(`
                SELECT p.*, c.name as category_name, ph.photo 
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.id 
                LEFT JOIN photos ph ON p.photo_id = ph.id 
                WHERE p.id = ?
            `, [id]);

            res.json({ success: true, data: product[0] });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Modified update method
    update: async (req, res) => {
        upload(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ success: false, message: err.message });
            }

            try {
                const { id } = req.params;
                const {
                    category_id,
                    name,
                    quantity,
                    massa,
                    expired,
                    is_active
                } = req.body;

                const slug = slugify(name, { lower: true });

                // If there's a new photo
                if (req.file) {
                    // Insert new photo
                    await pool.query(`
                        INSERT INTO photos (product_id, photo)
                        VALUES (?, ?)
                    `, [id, req.file.filename]);

                    // Get the new photo_id
                    const [photoResult] = await pool.query(
                        'SELECT id FROM photos WHERE product_id = ? ORDER BY id DESC LIMIT 1',
                        [id]
                    );

                    // Update product with all fields including new photo_id
                    await pool.query(`
                        UPDATE products 
                        SET category_id = ?, name = ?, slug = ?, 
                            quantity = ?, massa = ?, expired = ?, 
                            is_active = ?, photo_id = ?
                        WHERE id = ?
                    `, [category_id, name, slug, quantity, massa, expired, is_active, photoResult[0].id, id]);
                } else {
                    // Update product without changing photo
                    await pool.query(`
                        UPDATE products 
                        SET category_id = ?, name = ?, slug = ?, 
                            quantity = ?, massa = ?, expired = ?, 
                            is_active = ?
                        WHERE id = ?
                    `, [category_id, name, slug, quantity, massa, expired, is_active, id]);
                }

                res.json({ success: true, message: 'Product updated successfully' });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    },

    // Modified delete method
    delete: async (req, res) => {
        try {
            const { id } = req.params;
            // Delete associated photos first
            await pool.query('DELETE FROM photos WHERE product_id = ?', [id]);
            // Then delete the product
            await pool.query('DELETE FROM products WHERE id = ?', [id]);
            res.json({ success: true, message: 'Product deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

module.exports = { productController };