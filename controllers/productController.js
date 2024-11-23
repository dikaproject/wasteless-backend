const pool = require('../config/database');
const slugify = require('slugify');


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

    // Create product
    create: async (req, res) => {
        try {
            const { 
                category_id, 
                name, 
                quantity, 
                massa, 
                expired,
                is_active 
            } = req.body;

            const slug = slugify(name, { lower: true });

            await pool.query(`
                INSERT INTO products 
                (category_id, name, slug, quantity, massa, expired, is_active) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [category_id, name, slug, quantity, massa, expired, is_active]);

            res.status(201).json({ success: true, message: 'Product created successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Update product
    update: async (req, res) => {
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

            await pool.query(`
                UPDATE products 
                SET category_id = ?, name = ?, slug = ?, 
                    quantity = ?, massa = ?, expired = ?, 
                    is_active = ?
                WHERE id = ?
            `, [category_id, name, slug, quantity, massa, expired, is_active, id]);

            res.json({ success: true, message: 'Product updated successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // get detail product
    getDetail: async (req, res) => {
        try {
            const { id } = req.params;
            const [product] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
            res.json({ success: true, data: product[0] });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Delete product
    delete: async (req, res) => {
        try {
            const { id } = req.params;
            await pool.query('DELETE FROM products WHERE id = ?', [id]);
            res.json({ success: true, message: 'Product deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

module.exports = { productController };